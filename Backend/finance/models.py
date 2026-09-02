import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import F, Q


def generate_id():
    return uuid.uuid4().hex


color_validator = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='Use a six-digit hexadecimal color such as #4F46E5.',
)


class UserOwnedModel(models.Model):
    id = models.CharField(primary_key=True, max_length=128, default=generate_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='%(app_label)s_%(class)s_records',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class FinanceProfile(UserOwnedModel):
    budget_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=12000,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default='BDT')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='finance_unique_user_profile'),
            models.CheckConstraint(
                condition=Q(budget_limit__gte=0),
                name='finance_budget_nonnegative',
            ),
        ]

    def __str__(self):
        return f'{self.user} finance ({self.currency})'


class Account(UserOwnedModel):
    class AccountType(models.TextChoices):
        MOBILE_BANKING = 'mobile_banking', 'Mobile banking'
        BANK = 'bank', 'Bank account'
        CASH = 'cash', 'Cash'
        CARD = 'card', 'Credit/debit card'

    profile = models.ForeignKey(FinanceProfile, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    color = models.CharField(max_length=7, validators=[color_validator])
    icon_name = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['account_type']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'account_type'],
                name='finance_unique_user_account_type',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.account_type})'


class Transaction(UserOwnedModel):
    class TransactionType(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    class Category(models.TextChoices):
        FOOD = 'Food', 'Food'
        ACADEMIC = 'Academic Materials', 'Academic materials'
        FEES = 'Fees', 'Fees'
        INTERNET = 'Internet & Bills', 'Internet and bills'
        TRANSPORTATION = 'Transportation', 'Transportation'
        TUITION_INCOME = 'Tuition Income', 'Tuition income'
        OTHER = 'Other', 'Other'

    profile = models.ForeignKey(
        FinanceProfile,
        on_delete=models.CASCADE,
        related_name='transactions',
    )
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=8, choices=TransactionType.choices)
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.CharField(max_length=30, choices=Category.choices)
    date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date', '-created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name='finance_transaction_amount_positive',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'transaction_type', 'category']),
        ]

    def __str__(self):
        return f'{self.title}: {self.amount} {self.profile.currency}'


class DueBorrowRecord(UserOwnedModel):
    class Direction(models.TextChoices):
        I_OWE = 'i_owe', 'I owe'
        OWED_TO_ME = 'owed_to_me', 'Owed to me'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        PARTIALLY_SETTLED = 'partially_settled', 'Partially settled'
        SETTLED = 'settled', 'Settled'

    profile = models.ForeignKey(
        FinanceProfile,
        on_delete=models.CASCADE,
        related_name='due_borrow_records',
    )
    title = models.CharField(max_length=255)
    direction = models.CharField(max_length=12, choices=Direction.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    settled_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    due_date = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    class Meta:
        ordering = ['status', 'due_date', '-created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name='finance_due_amount_positive',
            ),
            models.CheckConstraint(
                condition=Q(settled_amount__gte=0) & Q(settled_amount__lte=F('amount')),
                name='finance_due_settled_amount_valid',
            ),
        ]
        indexes = [models.Index(fields=['user', 'status', 'due_date'])]

    def __str__(self):
        return f'{self.title} ({self.direction}, {self.status})'


class DueBorrowSettlement(UserOwnedModel):
    due_record = models.ForeignKey(
        DueBorrowRecord,
        on_delete=models.CASCADE,
        related_name='settlements',
    )
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        related_name='due_borrow_settlements',
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['-date', '-created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name='finance_settlement_amount_positive',
            ),
        ]

    def __str__(self):
        return f'{self.due_record.title} settlement: {self.amount}'

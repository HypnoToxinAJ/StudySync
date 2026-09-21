from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import Q
from rest_framework import serializers

from .models import (
    Account,
    DueBorrowRecord,
    DueBorrowSettlement,
    FinanceProfile,
    Transaction,
)


def normalize_account_type(value):
    val = str(value or '').lower()
    if 'mobile' in val or 'bkash' in val or 'nagad' in val or 'rocket' in val or val == 'acc-mobile':
        return Account.AccountType.MOBILE_BANKING
    if 'bank' in val or 'dbbl' in val or 'city' in val or val == 'acc-bank':
        return Account.AccountType.BANK
    if 'card' in val or 'visa' in val or 'master' in val or val == 'acc-card':
        return Account.AccountType.CARD
    return Account.AccountType.CASH


def get_or_create_finance_profile(user):
    profile, _ = FinanceProfile.objects.get_or_create(
        user=user,
        defaults={'budget_limit': Decimal('12000.00'), 'currency': 'BDT'}
    )
    standards = [
        {'slug': 'acc-mobile', 'name': 'Mobile Banking', 'account_type': Account.AccountType.MOBILE_BANKING, 'color': '#EC4899', 'icon_name': 'Smartphone'},
        {'slug': 'acc-bank', 'name': 'Bank Account', 'account_type': Account.AccountType.BANK, 'color': '#3B82F6', 'icon_name': 'Building'},
        {'slug': 'acc-cash', 'name': 'Physical Wallet Cash', 'account_type': Account.AccountType.CASH, 'color': '#10B981', 'icon_name': 'Coins'},
        {'slug': 'acc-card', 'name': 'Credit/Debit Card', 'account_type': Account.AccountType.CARD, 'color': '#8B5CF6', 'icon_name': 'CreditCard'},
    ]
    for sa in standards:
        Account.objects.get_or_create(
            user=user,
            account_type=sa['account_type'],
            defaults={
                'id': f"{user.pk}_{sa['slug']}",
                'profile': profile,
                'name': sa['name'],
                'opening_balance': Decimal('0.00'),
                'color': sa['color'],
                'icon_name': sa['icon_name'],
            }
        )
    return profile


class NumberDecimalField(serializers.DecimalField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('coerce_to_string', False)
        super().__init__(*args, **kwargs)


class NullableDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in ('', None) and self.allow_null:
            return None
        return super().to_internal_value(value)


class UserOwnedModelSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    def _request_user(self):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            raise serializers.ValidationError('An authenticated user is required.')
        return user

    def validate(self, attrs):
        user = self._request_user()
        if self.instance is not None and self.instance.user_id != user.pk:
            raise serializers.ValidationError('This object belongs to another user.')
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self._request_user()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('user', None)
        return super().update(instance, validated_data)


def sync_nested(parent, relation_name, model, items, parent_field):
    manager = getattr(parent, relation_name)
    existing = {str(item.pk): item for item in manager.all()}
    for raw_attrs in items:
        attrs = dict(raw_attrs)
        item_id = str(attrs.pop('id', '') or '')
        instance = existing.pop(item_id, None) if item_id else None
        attrs.update(user=parent.user, **{parent_field: parent})
        if instance is None:
            if item_id:
                attrs['id'] = item_id
            model.objects.create(**attrs)
        else:
            for field, value in attrs.items():
                setattr(instance, field, value)
            instance.save()
    if existing:
        model.objects.filter(pk__in=existing).delete()


class AccountSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='account_type')
    openingBalance = NumberDecimalField(
        source='opening_balance', max_digits=14, decimal_places=2, required=False
    )
    balance = serializers.SerializerMethodField()
    iconName = serializers.CharField(source='icon_name', required=False, allow_blank=True)
    id = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id',
            'name',
            'type',
            'balance',
            'openingBalance',
            'color',
            'iconName',
            'createdAt',
            'updatedAt',
        ]

    def get_id(self, obj):
        std_map = {
            Account.AccountType.MOBILE_BANKING: 'acc-mobile',
            Account.AccountType.BANK: 'acc-bank',
            Account.AccountType.CASH: 'acc-cash',
            Account.AccountType.CARD: 'acc-card',
        }
        return std_map.get(obj.account_type, str(obj.id))

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if 'id' in data:
            ret['id'] = data['id']
        return ret

    def get_balance(self, obj):
        balance = obj.opening_balance
        for item in obj.transactions.all():
            if item.transaction_type == Transaction.TransactionType.INCOME:
                balance += item.amount
            else:
                balance -= item.amount
        return float(balance)

    def create(self, validated_data):
        user = self._request_user()
        profile = get_or_create_finance_profile(user)
        validated_data['profile'] = profile
        return super().create(validated_data)


class TransactionSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='transaction_type')
    amount = NumberDecimalField(max_digits=14, decimal_places=2)
    accountId = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id',
            'type',
            'title',
            'amount',
            'category',
            'accountId',
            'date',
            'notes',
            'createdAt',
            'updatedAt',
        ]

    def get_accountId(self, obj):
        if not getattr(obj, 'account', None):
            return 'acc-cash'
        std_map = {
            Account.AccountType.MOBILE_BANKING: 'acc-mobile',
            Account.AccountType.BANK: 'acc-bank',
            Account.AccountType.CASH: 'acc-cash',
            Account.AccountType.CARD: 'acc-card',
        }
        return std_map.get(obj.account.account_type, str(obj.account_id))

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if 'accountId' in data:
            ret['account_id'] = data['accountId']
        elif 'account_id' in data:
            ret['account_id'] = data['account_id']
        return ret

    def validate(self, attrs):
        attrs = super().validate(attrs)
        transaction_type = attrs.get(
            'transaction_type', getattr(self.instance, 'transaction_type', None)
        )
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if transaction_type == Transaction.TransactionType.INCOME and category not in (
            Transaction.Category.TUITION_INCOME,
            Transaction.Category.OTHER,
        ):
            attrs['category'] = (
                Transaction.Category.TUITION_INCOME
                if 'tuition' in str(category).lower()
                else Transaction.Category.OTHER
            )
        if (
            transaction_type == Transaction.TransactionType.EXPENSE
            and category == Transaction.Category.TUITION_INCOME
        ):
            attrs['category'] = Transaction.Category.OTHER

        account_id = attrs.get('account_id')
        if account_id:
            user = self._request_user()
            profile = get_or_create_finance_profile(user)
            norm_type = normalize_account_type(account_id)
            account = Account.objects.filter(user=user, profile=profile).filter(
                Q(pk=account_id) | Q(account_type=account_id) | Q(account_type=norm_type)
            ).first()
            if not account:
                raise serializers.ValidationError({'accountId': 'Invalid account.'})
            attrs['account_id'] = account.pk
        return attrs

    def create(self, validated_data):
        user = self._request_user()
        profile = get_or_create_finance_profile(user)
        raw_account_id = validated_data.pop('account_id', None)
        norm_type = normalize_account_type(raw_account_id)
        account = Account.objects.filter(user=user, profile=profile).filter(
            Q(pk=raw_account_id) | Q(account_type=raw_account_id) | Q(account_type=norm_type)
        ).first()
        if not account:
            account = Account.objects.filter(user=user, profile=profile, account_type=Account.AccountType.CASH).first()
        validated_data.update(profile=profile, account=account)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self._request_user()
        if 'account_id' in validated_data:
            raw_account_id = validated_data.pop('account_id')
            profile = get_or_create_finance_profile(user)
            norm_type = normalize_account_type(raw_account_id)
            account = Account.objects.filter(user=user, profile=profile).filter(
                Q(pk=raw_account_id) | Q(account_type=raw_account_id) | Q(account_type=norm_type)
            ).first()
            if not account:
                raise serializers.ValidationError({'accountId': 'Invalid account.'})
            validated_data['account'] = account
        return super().update(instance, validated_data)


class DueBorrowRecordSerializer(UserOwnedModelSerializer):
    settledAmount = NumberDecimalField(
        source='settled_amount', max_digits=14, decimal_places=2, required=False
    )
    amount = NumberDecimalField(max_digits=14, decimal_places=2)
    dueDate = NullableDateField(source='due_date', required=False, allow_null=True)
    settlementTransactionIds = serializers.SerializerMethodField()

    class Meta:
        model = DueBorrowRecord
        fields = [
            'id',
            'title',
            'direction',
            'amount',
            'settledAmount',
            'dueDate',
            'note',
            'status',
            'createdAt',
            'updatedAt',
            'settlementTransactionIds',
        ]

    def get_settlementTransactionIds(self, obj):
        return [
            transaction_id
            for transaction_id in obj.settlements.values_list('transaction_id', flat=True)
            if transaction_id
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        amount = attrs.get('amount', getattr(self.instance, 'amount', Decimal('0')))
        settled = attrs.get(
            'settled_amount', getattr(self.instance, 'settled_amount', Decimal('0'))
        )
        if settled > amount:
            raise serializers.ValidationError({'settledAmount': 'Cannot exceed amount.'})
        if settled == amount and amount > 0:
            attrs['status'] = DueBorrowRecord.Status.SETTLED
        elif settled > 0:
            attrs['status'] = DueBorrowRecord.Status.PARTIALLY_SETTLED
        else:
            attrs['status'] = DueBorrowRecord.Status.OPEN
        return attrs

    def create(self, validated_data):
        user = self._request_user()
        profile = get_or_create_finance_profile(user)
        validated_data['profile'] = profile
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('user', None)
        validated_data.pop('profile', None)
        return super().update(instance, validated_data)


class DueBorrowSettlementSerializer(UserOwnedModelSerializer):
    dueRecordId = serializers.CharField(source='due_record_id')
    transactionId = serializers.CharField(
        source='transaction_id', required=False, allow_null=True, allow_blank=True
    )
    amount = NumberDecimalField(max_digits=14, decimal_places=2)

    class Meta:
        model = DueBorrowSettlement
        fields = [
            'id',
            'dueRecordId',
            'transactionId',
            'amount',
            'date',
            'note',
            'createdAt',
            'updatedAt',
        ]

    @db_transaction.atomic
    def create(self, validated_data):
        user = self._request_user()
        try:
            due_record = DueBorrowRecord.objects.select_for_update().get(
                pk=validated_data.pop('due_record_id'), user=user
            )
        except DueBorrowRecord.DoesNotExist as exc:
            raise serializers.ValidationError({'dueRecordId': 'Invalid due/borrow record.'}) from exc

        transaction_id = validated_data.pop('transaction_id', None) or None
        linked_transaction = None
        if transaction_id:
            try:
                linked_transaction = Transaction.objects.get(pk=transaction_id, user=user)
            except Transaction.DoesNotExist as exc:
                raise serializers.ValidationError({'transactionId': 'Invalid transaction.'}) from exc

        remaining = due_record.amount - due_record.settled_amount
        amount = validated_data['amount']
        if amount > remaining:
            raise serializers.ValidationError({'amount': 'Cannot exceed the remaining balance.'})

        settlement = DueBorrowSettlement.objects.create(
            user=user,
            due_record=due_record,
            transaction=linked_transaction,
            **validated_data,
        )
        due_record.settled_amount += amount
        due_record.status = (
            DueBorrowRecord.Status.SETTLED
            if due_record.settled_amount >= due_record.amount
            else DueBorrowRecord.Status.PARTIALLY_SETTLED
        )
        due_record.save(update_fields=['settled_amount', 'status', 'updated_at'])
        return settlement

    def update(self, instance, validated_data):
        raise serializers.ValidationError('Settlements are immutable; delete and recreate one instead.')


class FinanceProfileSerializer(UserOwnedModelSerializer):
    budgetLimit = NumberDecimalField(
        source='budget_limit', max_digits=12, decimal_places=2
    )
    accounts = AccountSerializer(many=True, required=False)
    transactions = TransactionSerializer(many=True, required=False)
    dueBorrowRecords = DueBorrowRecordSerializer(
        source='due_borrow_records', many=True, required=False
    )
    summary = serializers.SerializerMethodField()

    class Meta:
        model = FinanceProfile
        fields = [
            'id',
            'budgetLimit',
            'currency',
            'accounts',
            'transactions',
            'dueBorrowRecords',
            'summary',
            'createdAt',
            'updatedAt',
        ]

    def get_summary(self, obj):
        from django.utils import timezone
        now = timezone.localdate()
        accounts = list(obj.accounts.all().prefetch_related('transactions'))
        transactions = list(obj.transactions.all())
        due_records = list(obj.due_borrow_records.all())

        total_balance = sum(
            (acc.opening_balance + sum(
                (tx.amount if tx.transaction_type == Transaction.TransactionType.INCOME else -tx.amount)
                for tx in acc.transactions.all()
            ))
            for acc in accounts
        )

        month_txs = [tx for tx in transactions if tx.date.year == now.year and tx.date.month == now.month]
        total_income = sum(tx.amount for tx in month_txs if tx.transaction_type == Transaction.TransactionType.INCOME)
        total_expense = sum(tx.amount for tx in month_txs if tx.transaction_type == Transaction.TransactionType.EXPENSE)
        budget_limit = obj.budget_limit
        budget_remaining = max(Decimal('0'), budget_limit - total_expense)
        budget_progress = float(round((total_expense / budget_limit * 100), 1)) if budget_limit > 0 else 0.0

        total_i_owe = sum(
            (r.amount - r.settled_amount) for r in due_records if r.direction == DueBorrowRecord.Direction.I_OWE and r.status != DueBorrowRecord.Status.SETTLED
        )
        total_owed_to_me = sum(
            (r.amount - r.settled_amount) for r in due_records if r.direction == DueBorrowRecord.Direction.OWED_TO_ME and r.status != DueBorrowRecord.Status.SETTLED
        )

        return {
            'totalBalance': float(total_balance),
            'totalIncome': float(total_income),
            'totalExpense': float(total_expense),
            'budgetLimit': float(budget_limit),
            'budgetSpent': float(total_expense),
            'budgetRemaining': float(budget_remaining),
            'budgetProgress': budget_progress,
            'isOverBudget': total_expense > budget_limit,
            'dueBorrowSummary': {
                'totalIOwe': float(total_i_owe),
                'totalOwedToMe': float(total_owed_to_me),
                'netBalance': float(total_owed_to_me - total_i_owe),
            },
        }

    def _upsert_accounts(self, profile, accounts):
        existing_by_pk = {str(item.pk): item for item in profile.accounts.all()}
        existing_by_type = {item.account_type: item for item in profile.accounts.all()}
        for raw_attrs in accounts:
            attrs = dict(raw_attrs)
            attrs.pop('balance', None)
            account_id = str(attrs.pop('id', '') or '')
            norm_type = normalize_account_type(attrs.get('account_type', account_id))
            account = existing_by_pk.pop(account_id, None) or existing_by_type.get(norm_type)
            if account and str(account.pk) in existing_by_pk:
                existing_by_pk.pop(str(account.pk), None)
            attrs.update(user=profile.user, profile=profile)
            if account is None:
                if account_id:
                    attrs['id'] = f"{profile.user.pk}_{account_id}" if Account.objects.filter(pk=account_id).exists() else account_id
                Account.objects.create(**attrs)
            else:
                for field, value in attrs.items():
                    setattr(account, field, value)
                account.save()
        return existing_by_pk

    def _sync_transactions(self, profile, transactions):
        existing = {str(item.pk): item for item in profile.transactions.all()}
        for raw_attrs in transactions:
            attrs = dict(raw_attrs)
            item_id = str(attrs.pop('id', '') or '')
            item = existing.pop(item_id, None) if item_id else None
            account_id = attrs.pop('account_id')
            norm_type = normalize_account_type(account_id)
            account = profile.accounts.filter(
                Q(pk=account_id) | Q(account_type=account_id) | Q(account_type=norm_type)
            ).first()
            if not account:
                account = profile.accounts.filter(account_type=Account.AccountType.CASH).first()
            if not account:
                raise serializers.ValidationError(
                    {'transactions': f'Unknown accountId: {account_id}.'}
                )
            attrs.update(user=profile.user, profile=profile, account=account)
            if item is None:
                if item_id:
                    attrs['id'] = item_id
                Transaction.objects.create(**attrs)
            else:
                for field, value in attrs.items():
                    setattr(item, field, value)
                item.save()
        if existing:
            Transaction.objects.filter(pk__in=existing).delete()

    @db_transaction.atomic
    def create(self, validated_data):
        accounts = validated_data.pop('accounts', [])
        transactions = validated_data.pop('transactions', [])
        due_records = validated_data.pop('due_borrow_records', [])
        profile = super().create(validated_data)
        self._upsert_accounts(profile, accounts)
        self._sync_transactions(profile, transactions)
        sync_nested(
            profile,
            'due_borrow_records',
            DueBorrowRecord,
            due_records,
            'profile',
        )
        return profile

    @db_transaction.atomic
    def update(self, instance, validated_data):
        accounts = validated_data.pop('accounts', None)
        transactions = validated_data.pop('transactions', None)
        due_records = validated_data.pop('due_borrow_records', None)
        profile = super().update(instance, validated_data)
        stale_accounts = self._upsert_accounts(profile, accounts) if accounts is not None else {}
        if transactions is not None:
            self._sync_transactions(profile, transactions)
        if stale_accounts:
            Account.objects.filter(pk__in=stale_accounts).exclude(
                account_type__in=[
                    Account.AccountType.MOBILE_BANKING,
                    Account.AccountType.BANK,
                    Account.AccountType.CASH,
                    Account.AccountType.CARD,
                ]
            ).delete()
        if due_records is not None:
            sync_nested(
                profile,
                'due_borrow_records',
                DueBorrowRecord,
                due_records,
                'profile',
            )
        return profile

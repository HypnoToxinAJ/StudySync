from decimal import Decimal

from django.db import transaction as db_transaction
from rest_framework import serializers

from .models import (
    Account,
    DueBorrowRecord,
    DueBorrowSettlement,
    FinanceProfile,
    Transaction,
)


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
        try:
            profile = FinanceProfile.objects.get(user=user)
        except FinanceProfile.DoesNotExist as exc:
            raise serializers.ValidationError('Create a finance profile first.') from exc
        validated_data['profile'] = profile
        return super().create(validated_data)


class TransactionSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='transaction_type')
    amount = NumberDecimalField(max_digits=14, decimal_places=2)
    accountId = serializers.CharField(source='account_id')

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
            raise serializers.ValidationError(
                {'category': 'Income must use Tuition Income or Other.'}
            )
        if (
            transaction_type == Transaction.TransactionType.EXPENSE
            and category == Transaction.Category.TUITION_INCOME
        ):
            raise serializers.ValidationError(
                {'category': 'Tuition Income cannot be used for an expense.'}
            )
        account_id = attrs.get('account_id')
        if account_id:
            account = Account.objects.filter(pk=account_id).first()
            if account and account.user_id != self._request_user().pk:
                raise serializers.ValidationError({'accountId': 'Invalid account.'})
        return attrs

    def create(self, validated_data):
        user = self._request_user()
        try:
            profile = FinanceProfile.objects.get(user=user)
            account = Account.objects.get(
                pk=validated_data.get('account_id'), user=user, profile=profile
            )
        except (FinanceProfile.DoesNotExist, Account.DoesNotExist) as exc:
            raise serializers.ValidationError({'accountId': 'Invalid account.'}) from exc
        validated_data.update(profile=profile, account=account)
        validated_data.pop('account_id', None)
        return super().create(validated_data)


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
        try:
            profile = FinanceProfile.objects.get(user=user)
        except FinanceProfile.DoesNotExist as exc:
            raise serializers.ValidationError('Create a finance profile first.') from exc
        validated_data['profile'] = profile
        return super().create(validated_data)


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

    class Meta:
        model = FinanceProfile
        fields = [
            'budgetLimit',
            'currency',
            'accounts',
            'transactions',
            'dueBorrowRecords',
        ]

    def _upsert_accounts(self, profile, accounts):
        existing = {str(item.pk): item for item in profile.accounts.all()}
        for raw_attrs in accounts:
            attrs = dict(raw_attrs)
            attrs.pop('balance', None)
            account_id = str(attrs.pop('id', '') or '')
            account = existing.pop(account_id, None) if account_id else None
            attrs.update(user=profile.user, profile=profile)
            if account is None:
                if account_id:
                    attrs['id'] = account_id
                Account.objects.create(**attrs)
            else:
                for field, value in attrs.items():
                    setattr(account, field, value)
                account.save()
        return existing

    def _sync_transactions(self, profile, transactions):
        existing = {str(item.pk): item for item in profile.transactions.all()}
        for raw_attrs in transactions:
            attrs = dict(raw_attrs)
            item_id = str(attrs.pop('id', '') or '')
            item = existing.pop(item_id, None) if item_id else None
            account_id = attrs.pop('account_id')
            try:
                account = profile.accounts.get(pk=account_id, user=profile.user)
            except Account.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {'transactions': f'Unknown accountId: {account_id}.'}
                ) from exc
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
            Account.objects.filter(pk__in=stale_accounts).delete()
        if due_records is not None:
            sync_nested(
                profile,
                'due_borrow_records',
                DueBorrowRecord,
                due_records,
                'profile',
            )
        return profile

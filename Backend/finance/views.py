from decimal import Decimal, InvalidOperation

from django.db import transaction as db_transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Account,
    DueBorrowRecord,
    DueBorrowSettlement,
    FinanceProfile,
    Transaction,
)
from .serializers import (
    AccountSerializer,
    DueBorrowRecordSerializer,
    DueBorrowSettlementSerializer,
    FinanceProfileSerializer,
    TransactionSerializer,
    get_or_create_finance_profile,
    normalize_account_type,
)


class FinanceProfileView(APIView):
    """
    Retrieve or partially update the user's finance profile.
    Endpoint: /api/v1/finance/profile/
    """

    def get(self, request):
        profile = get_or_create_finance_profile(request.user)
        serializer = FinanceProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def patch(self, request):
        profile = get_or_create_finance_profile(request.user)
        budget_val = request.data.get('budgetLimit', request.data.get('budget_limit'))
        if budget_val is not None:
            try:
                dec_val = Decimal(str(budget_val))
                if dec_val < 0:
                    return Response(
                        {'detail': 'Budget limit cannot be negative.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                profile.budget_limit = dec_val
            except (InvalidOperation, TypeError, ValueError):
                return Response(
                    {'detail': 'Invalid budget limit format.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        currency_val = request.data.get('currency')
        if currency_val:
            profile.currency = str(currency_val).strip().upper()[:3]

        profile.save()
        serializer = FinanceProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class FinanceBudgetUpdateView(APIView):
    """
    Dedicated endpoint to update monthly budget limit.
    Endpoint: /api/v1/finance/budget/
    """

    def patch(self, request):
        profile = get_or_create_finance_profile(request.user)
        raw_val = request.data.get('budgetLimit', request.data.get('budget_limit', request.data.get('budget')))
        if raw_val is None:
            return Response(
                {'detail': 'budgetLimit is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            val = Decimal(str(raw_val))
            if val < 0:
                return Response(
                    {'detail': 'Budget limit cannot be negative.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {'detail': 'Invalid budget limit value.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.budget_limit = val
        profile.save(update_fields=['budget_limit', 'updated_at'])
        serializer = FinanceProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AccountListCreateView(APIView):
    """
    List or create accounts for the user.
    Endpoint: /api/v1/finance/accounts/
    """

    def get(self, request):
        profile = get_or_create_finance_profile(request.user)
        accounts = profile.accounts.all().order_by('account_type', 'name')
        serializer = AccountSerializer(accounts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def post(self, request):
        serializer = AccountSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(
            AccountSerializer(account, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AccountDetailView(APIView):
    """
    Retrieve, update or delete an account.
    Endpoint: /api/v1/finance/accounts/<str:pk>/
    """

    def _get_account(self, request, pk):
        profile = get_or_create_finance_profile(request.user)
        norm_type = normalize_account_type(pk)
        return Account.objects.filter(user=request.user, profile=profile).filter(
            Q(pk=pk) | Q(account_type=pk) | Q(account_type=norm_type)
        ).first()

    def get(self, request, pk):
        account = self._get_account(request, pk)
        if not account:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AccountSerializer(account, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def patch(self, request, pk):
        account = self._get_account(request, pk)
        if not account:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AccountSerializer(account, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(AccountSerializer(updated, context={'request': request}).data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def delete(self, request, pk):
        account = self._get_account(request, pk)
        if not account:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
        if account.id in ('acc-mobile', 'acc-bank', 'acc-cash', 'acc-card'):
            return Response({'detail': 'Standard default accounts cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TransactionListCreateView(APIView):
    """
    List or create transactions.
    Endpoint: /api/v1/finance/transactions/
    """

    def get(self, request):
        profile = get_or_create_finance_profile(request.user)
        qs = Transaction.objects.filter(user=request.user, profile=profile).select_related('account')

        # Filters
        tx_type = request.query_params.get('type') or request.query_params.get('transaction_type')
        if tx_type:
            qs = qs.filter(transaction_type=tx_type.lower())

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category__iexact=category)

        account_id = request.query_params.get('accountId') or request.query_params.get('account_id')
        if account_id:
            norm_type = normalize_account_type(account_id)
            qs = qs.filter(Q(account_id=account_id) | Q(account__account_type=account_id) | Q(account__account_type=norm_type))

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(notes__icontains=search) | Q(category__icontains=search)
            )

        month = request.query_params.get('month')  # format: YYYY-MM
        if month:
            parts = month.split('-')
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                qs = qs.filter(date__year=int(parts[0]), date__month=int(parts[1]))

        from_date = request.query_params.get('from_date')
        if from_date:
            qs = qs.filter(date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            qs = qs.filter(date__lte=to_date)

        serializer = TransactionSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def post(self, request):
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        tx = serializer.save()
        return Response(
            TransactionSerializer(tx, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class TransactionDetailView(APIView):
    """
    Retrieve, update or delete a transaction.
    Endpoint: /api/v1/finance/transactions/<str:pk>/
    """

    def _get_transaction(self, request, pk):
        try:
            return Transaction.objects.select_related('account').get(pk=pk, user=request.user)
        except Transaction.DoesNotExist:
            return None

    def get(self, request, pk):
        tx = self._get_transaction(request, pk)
        if not tx:
            return Response({'detail': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(tx, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def patch(self, request, pk):
        tx = self._get_transaction(request, pk)
        if not tx:
            return Response({'detail': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(tx, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(TransactionSerializer(updated, context={'request': request}).data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def delete(self, request, pk):
        tx = self._get_transaction(request, pk)
        if not tx:
            return Response({'detail': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        tx.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DueBorrowRecordListCreateView(APIView):
    """
    List or create due/borrow records.
    Endpoint: /api/v1/finance/due-borrow/
    """

    def get(self, request):
        profile = get_or_create_finance_profile(request.user)
        qs = DueBorrowRecord.objects.filter(user=request.user, profile=profile).prefetch_related('settlements')

        direction = request.query_params.get('direction')
        if direction:
            qs = qs.filter(direction=direction.lower())

        rec_status = request.query_params.get('status')
        if rec_status:
            qs = qs.filter(status=rec_status.lower())

        serializer = DueBorrowRecordSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def post(self, request):
        serializer = DueBorrowRecordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            DueBorrowRecordSerializer(record, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class DueBorrowRecordDetailView(APIView):
    """
    Retrieve, update or delete a due/borrow record.
    Endpoint: /api/v1/finance/due-borrow/<str:pk>/
    """

    def _get_record(self, request, pk):
        try:
            return DueBorrowRecord.objects.prefetch_related('settlements').get(pk=pk, user=request.user)
        except DueBorrowRecord.DoesNotExist:
            return None

    def get(self, request, pk):
        record = self._get_record(request, pk)
        if not record:
            return Response({'detail': 'Due/borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DueBorrowRecordSerializer(record, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def patch(self, request, pk):
        record = self._get_record(request, pk)
        if not record:
            return Response({'detail': 'Due/borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DueBorrowRecordSerializer(record, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(DueBorrowRecordSerializer(updated, context={'request': request}).data, status=status.HTTP_200_OK)

    @db_transaction.atomic
    def delete(self, request, pk):
        record = self._get_record(request, pk)
        if not record:
            return Response({'detail': 'Due/borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DueBorrowSettleView(APIView):
    """
    Settle part or all of a due/borrow record, optionally logging a cash/account transaction.
    Endpoint: /api/v1/finance/due-borrow/<str:pk>/settle/
    """

    @db_transaction.atomic
    def post(self, request, pk):
        try:
            record = DueBorrowRecord.objects.select_for_update().get(pk=pk, user=request.user)
        except DueBorrowRecord.DoesNotExist:
            return Response({'detail': 'Due/borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)

        remaining = record.amount - record.settled_amount
        if remaining <= Decimal('0.00'):
            return Response({'detail': 'This record is already fully settled.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_amount = request.data.get('amount')
        if raw_amount is None:
            # Settle entire remaining amount if not specified
            settle_amount = remaining
        else:
            try:
                settle_amount = Decimal(str(raw_amount))
            except (InvalidOperation, TypeError, ValueError):
                return Response({'detail': 'Invalid settlement amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if settle_amount <= Decimal('0.00'):
            return Response({'detail': 'Settlement amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
        if settle_amount > remaining:
            return Response(
                {'detail': f'Amount cannot exceed remaining balance ({remaining}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        settle_date = request.data.get('date') or timezone.localdate()
        note = request.data.get('note', '')
        create_tx = request.data.get('createTransaction', False)
        account_id = request.data.get('accountId', 'acc-cash')

        linked_tx = None
        if create_tx:
            profile = get_or_create_finance_profile(request.user)
            norm_type = normalize_account_type(account_id)
            account = Account.objects.filter(user=request.user, profile=profile).filter(
                Q(pk=account_id) | Q(account_type=account_id) | Q(account_type=norm_type)
            ).first()
            if not account:
                account = Account.objects.filter(user=request.user, profile=profile, account_type=Account.AccountType.CASH).first()

            if record.direction == DueBorrowRecord.Direction.I_OWE:
                # Paying debt -> Expense
                tx_type = Transaction.TransactionType.EXPENSE
                title_prefix = 'Debt Paid'
            else:
                # Collecting owed money -> Income
                tx_type = Transaction.TransactionType.INCOME
                title_prefix = 'Due Collected'

            linked_tx = Transaction.objects.create(
                user=request.user,
                profile=profile,
                account=account,
                transaction_type=tx_type,
                title=f'{title_prefix}: {record.title}',
                amount=settle_amount,
                category=Transaction.Category.OTHER,
                date=settle_date,
                notes=note or f'Automated settlement for record {record.title}',
            )

        settlement = DueBorrowSettlement.objects.create(
            user=request.user,
            due_record=record,
            transaction=linked_tx,
            amount=settle_amount,
            date=settle_date,
            note=note,
        )

        record.settled_amount += settle_amount
        if record.settled_amount >= record.amount:
            record.status = DueBorrowRecord.Status.SETTLED
        else:
            record.status = DueBorrowRecord.Status.PARTIALLY_SETTLED
        record.save(update_fields=['settled_amount', 'status', 'updated_at'])

        return Response({
            'record': DueBorrowRecordSerializer(record, context={'request': request}).data,
            'settlement': DueBorrowSettlementSerializer(settlement, context={'request': request}).data,
            'transaction': TransactionSerializer(linked_tx, context={'request': request}).data if linked_tx else None,
        }, status=status.HTTP_200_OK)


class DueBorrowReopenView(APIView):
    """
    Reopen a settled or partially settled due/borrow record.
    Endpoint: /api/v1/finance/due-borrow/<str:pk>/reopen/
    """

    @db_transaction.atomic
    def post(self, request, pk):
        try:
            record = DueBorrowRecord.objects.select_for_update().get(pk=pk, user=request.user)
        except DueBorrowRecord.DoesNotExist:
            return Response({'detail': 'Due/borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Remove settlement records
        record.settlements.all().delete()
        record.settled_amount = Decimal('0.00')
        record.status = DueBorrowRecord.Status.OPEN
        record.save(update_fields=['settled_amount', 'status', 'updated_at'])

        return Response(
            DueBorrowRecordSerializer(record, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class FinanceSyncBatchView(APIView):
    """
    Idempotent batch sync for full offline-to-cloud synchronization.
    Endpoint: /api/v1/finance/sync/
    """

    @db_transaction.atomic
    def post(self, request):
        profile = get_or_create_finance_profile(request.user)
        serializer = FinanceProfileSerializer(
            profile, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated_profile = serializer.save()
        return Response(
            FinanceProfileSerializer(updated_profile, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class FinanceClearView(APIView):
    """
    Clear all financial transactions and due records for the user.
    Endpoint: /api/v1/finance/clear/
    """

    @db_transaction.atomic
    def delete(self, request):
        profile = get_or_create_finance_profile(request.user)
        profile.transactions.all().delete()
        profile.due_borrow_records.all().delete()
        # Reset accounts opening balance to 0
        profile.accounts.all().update(opening_balance=Decimal('0.00'))
        return Response(
            FinanceProfileSerializer(profile, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

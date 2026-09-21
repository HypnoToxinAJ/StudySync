from django.urls import path

from .views import (
    AccountDetailView,
    AccountListCreateView,
    DueBorrowRecordDetailView,
    DueBorrowRecordListCreateView,
    DueBorrowReopenView,
    DueBorrowSettleView,
    FinanceBudgetUpdateView,
    FinanceClearView,
    FinanceProfileView,
    FinanceSyncBatchView,
    TransactionDetailView,
    TransactionListCreateView,
)

app_name = 'finance'

urlpatterns = [
    path('profile/', FinanceProfileView.as_view(), name='profile'),
    path('budget/', FinanceBudgetUpdateView.as_view(), name='budget'),
    path('accounts/', AccountListCreateView.as_view(), name='account-list'),
    path('accounts/<str:pk>/', AccountDetailView.as_view(), name='account-detail'),
    path('transactions/', TransactionListCreateView.as_view(), name='transaction-list'),
    path('transactions/<str:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
    path('due-borrow/', DueBorrowRecordListCreateView.as_view(), name='due-borrow-list'),
    path('due-borrow/<str:pk>/', DueBorrowRecordDetailView.as_view(), name='due-borrow-detail'),
    path('due-borrow/<str:pk>/settle/', DueBorrowSettleView.as_view(), name='due-borrow-settle'),
    path('due-borrow/<str:pk>/reopen/', DueBorrowReopenView.as_view(), name='due-borrow-reopen'),
    path('sync/', FinanceSyncBatchView.as_view(), name='batch-sync'),
    path('clear/', FinanceClearView.as_view(), name='clear-all'),
]

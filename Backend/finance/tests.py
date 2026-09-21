from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import jwt

from django.test import override_settings
from rest_framework.test import APITestCase

from .models import (
    Account,
    DueBorrowRecord,
    DueBorrowSettlement,
    FinanceProfile,
    Transaction,
)


@override_settings(
    SUPABASE_JWT_SECRET='test-only-supabase-secret-with-sufficient-length',
    SUPABASE_JWT_ISSUER='https://test-project.supabase.co/auth/v1',
    SUPABASE_JWT_AUDIENCE='authenticated',
    SUPABASE_JWT_ALGORITHMS=('HS256',),
)
class FinanceApiTests(APITestCase):
    def make_token(self, email='student@example.com', subject='11111111-1111-4111-8111-111111111111'):
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                'iss': 'https://test-project.supabase.co/auth/v1',
                'aud': 'authenticated',
                'sub': subject,
                'email': email,
                'role': 'authenticated',
                'iat': now,
                'exp': now + timedelta(minutes=10),
                'app_metadata': {'provider': 'google'},
                'user_metadata': {'full_name': 'StudySync Student'},
            },
            'test-only-supabase-secret-with-sufficient-length',
            algorithm='HS256',
        )

    def authenticate(self, **kwargs):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.make_token(**kwargs)}'
        )

    def test_unauthorized_access(self):
        res = self.client.get('/api/v1/finance/profile/')
        self.assertEqual(res.status_code, 401)

    def test_profile_auto_provisioning(self):
        self.authenticate()
        res = self.client.get('/api/v1/finance/profile/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['budgetLimit'], 12000.0)
        self.assertEqual(data['currency'], 'BDT')
        self.assertEqual(len(data['accounts']), 4)
        acc_ids = [acc['id'] for acc in data['accounts']]
        self.assertIn('acc-cash', acc_ids)
        self.assertIn('acc-mobile', acc_ids)
        self.assertIn('acc-bank', acc_ids)
        self.assertIn('acc-card', acc_ids)
        self.assertIn('summary', data)
        self.assertEqual(data['summary']['totalBalance'], 0.0)

    def test_update_budget_limit(self):
        self.authenticate()
        # Via /api/v1/finance/budget/
        res = self.client.patch('/api/v1/finance/budget/', {'budgetLimit': 16500}, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['budgetLimit'], 16500.0)

        # Via /api/v1/finance/profile/
        res2 = self.client.patch('/api/v1/finance/profile/', {'budgetLimit': 18000}, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()['budgetLimit'], 18000.0)

        # Invalid budget
        res3 = self.client.patch('/api/v1/finance/budget/', {'budgetLimit': -500}, format='json')
        self.assertEqual(res3.status_code, 400)

    def test_transactions_crud_and_balance_calculation(self):
        self.authenticate()

        # Add Income transaction to Cash
        today_str = date.today().isoformat()
        res = self.client.post('/api/v1/finance/transactions/', {
            'type': 'income',
            'title': 'Tuition Salary',
            'amount': 5000,
            'category': 'Tuition Income',
            'accountId': 'acc-cash',
            'date': today_str,
            'notes': 'Grade 10 batch',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        tx_income = res.json()
        tx_id = tx_income['id']

        # Add Expense transaction from Mobile Banking
        res_exp = self.client.post('/api/v1/finance/transactions/', {
            'type': 'expense',
            'title': 'Book Purchase',
            'amount': 800,
            'category': 'Academic Materials',
            'accountId': 'acc-mobile',
            'date': today_str,
            'notes': 'Math textbook',
        }, format='json')
        self.assertEqual(res_exp.status_code, 201)

        # Verify Accounts balance
        acc_res = self.client.get('/api/v1/finance/accounts/')
        self.assertEqual(acc_res.status_code, 200)
        accounts_map = {acc['id']: acc['balance'] for acc in acc_res.json()}
        self.assertEqual(accounts_map['acc-cash'], 5000.0)
        self.assertEqual(accounts_map['acc-mobile'], -800.0)

        # Verify Profile Summary
        prof_res = self.client.get('/api/v1/finance/profile/')
        summary = prof_res.json()['summary']
        self.assertEqual(summary['totalBalance'], 4200.0)
        self.assertEqual(summary['totalIncome'], 5000.0)
        self.assertEqual(summary['totalExpense'], 800.0)

        # Filter transactions
        filt_res = self.client.get('/api/v1/finance/transactions/?type=expense')
        self.assertEqual(len(filt_res.json()), 1)
        self.assertEqual(filt_res.json()[0]['title'], 'Book Purchase')

        # Update transaction
        patch_res = self.client.patch(f'/api/v1/finance/transactions/{tx_id}/', {
            'amount': 5500,
        }, format='json')
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()['amount'], 5500.0)

        # Delete transaction
        del_res = self.client.delete(f'/api/v1/finance/transactions/{tx_id}/')
        self.assertEqual(del_res.status_code, 204)

        # Verify count
        list_res = self.client.get('/api/v1/finance/transactions/')
        self.assertEqual(len(list_res.json()), 1)

    def test_due_borrow_flow_and_settlement(self):
        self.authenticate()

        # Create I Owe record
        res = self.client.post('/api/v1/finance/due-borrow/', {
            'title': 'Borrowed from Shakil for Books',
            'direction': 'i_owe',
            'amount': 1500,
            'dueDate': '2026-10-01',
            'note': 'Library purchase',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        record = res.json()
        rec_id = record['id']
        self.assertEqual(record['status'], 'open')
        self.assertEqual(record['settledAmount'], 0.0)

        # Partial settlement with linked transaction
        settle_res = self.client.post(f'/api/v1/finance/due-borrow/{rec_id}/settle/', {
            'amount': 500,
            'note': 'First installment paid in cash',
            'accountId': 'acc-cash',
            'createTransaction': True,
        }, format='json')
        self.assertEqual(settle_res.status_code, 200)
        s_data = settle_res.json()
        self.assertEqual(s_data['record']['settledAmount'], 500.0)
        self.assertEqual(s_data['record']['status'], 'partially_settled')
        self.assertIsNotNone(s_data['transaction'])
        self.assertEqual(s_data['transaction']['amount'], 500.0)
        self.assertEqual(s_data['transaction']['type'], 'expense')

        # Full settlement of remaining balance
        settle_res2 = self.client.post(f'/api/v1/finance/due-borrow/{rec_id}/settle/', {
            'amount': 1000,
        }, format='json')
        self.assertEqual(settle_res2.status_code, 200)
        self.assertEqual(settle_res2.json()['record']['status'], 'settled')
        self.assertEqual(settle_res2.json()['record']['settledAmount'], 1500.0)

        # Reopen record
        reopen_res = self.client.post(f'/api/v1/finance/due-borrow/{rec_id}/reopen/')
        self.assertEqual(reopen_res.status_code, 200)
        self.assertEqual(reopen_res.json()['status'], 'open')
        self.assertEqual(reopen_res.json()['settledAmount'], 0.0)

    def test_batch_sync_and_clear(self):
        self.authenticate()

        today_str = date.today().isoformat()
        sync_payload = {
            'budgetLimit': 20000,
            'accounts': [
                {'id': 'acc-cash', 'name': 'Physical Wallet Cash', 'type': 'cash', 'openingBalance': 1000, 'color': '#10B981'},
                {'id': 'acc-mobile', 'name': 'Mobile Banking', 'type': 'mobile_banking', 'openingBalance': 2000, 'color': '#EC4899'},
            ],
            'transactions': [
                {
                    'id': 'tx-sync-1',
                    'type': 'expense',
                    'title': 'Canteen Lunch',
                    'amount': 120,
                    'category': 'Food',
                    'accountId': 'acc-cash',
                    'date': today_str,
                }
            ],
            'dueBorrowRecords': [
                {
                    'id': 'due-sync-1',
                    'title': 'Owed by Fahim',
                    'direction': 'owed_to_me',
                    'amount': 450,
                    'settledAmount': 0,
                    'dueDate': None,
                    'status': 'open',
                }
            ]
        }

        res = self.client.post('/api/v1/finance/sync/', sync_payload, format='json')
        self.assertEqual(res.status_code, 200)
        profile_data = res.json()
        self.assertEqual(profile_data['budgetLimit'], 20000.0)
        self.assertEqual(len(profile_data['transactions']), 1)
        self.assertEqual(len(profile_data['dueBorrowRecords']), 1)

        # Test Clear
        clear_res = self.client.delete('/api/v1/finance/clear/')
        self.assertEqual(clear_res.status_code, 200)
        cleared_data = clear_res.json()
        self.assertEqual(len(cleared_data['transactions']), 0)
        self.assertEqual(len(cleared_data['dueBorrowRecords']), 0)

    def test_user_data_isolation(self):
        # User 1
        self.authenticate(email='user1@example.com', subject='11111111-1111-4111-8111-111111111111')
        today_str = date.today().isoformat()
        res1 = self.client.post('/api/v1/finance/transactions/', {
            'type': 'expense',
            'title': 'Secret User 1 Note',
            'amount': 250,
            'category': 'Food',
            'accountId': 'acc-cash',
            'date': today_str,
        }, format='json')
        self.assertEqual(res1.status_code, 201)
        user1_tx_id = res1.json()['id']

        # User 2
        self.authenticate(email='user2@example.com', subject='22222222-2222-4222-8222-222222222222')
        # User 2 listing transactions should not see user 1 transaction
        res2 = self.client.get('/api/v1/finance/transactions/')
        self.assertEqual(len(res2.json()), 0)

        # User 2 attempting to get User 1 transaction directly should get 404
        res3 = self.client.get(f'/api/v1/finance/transactions/{user1_tx_id}/')
        self.assertEqual(res3.status_code, 404)

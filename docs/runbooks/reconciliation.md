# Runbook: Payments Reconciliation

## Purpose
Automatically close stale `created/pending` payments that were never finalized by provider webhook.

## Scheduler
- Service: `PaymentsReconciliationService`
- Default cron: `*/10 * * * *`

## Controls
- `PAYMENT_RECONCILE_ENABLED=true|false`
- `PAYMENT_RECONCILE_CRON`
- `PAYMENT_RECONCILE_STALE_MINUTES` (default `60`)
- `PAYMENT_RECONCILE_BATCH` (default `200`)

## What it does
1. Acquires Redis lock (`locks:payments:reconcile`).
2. Finds stale `PaymentStatus.created|pending`.
3. Marks them `failed` and writes ledger entry `payment_reconcile_timeout`.
4. Writes immutable audit entry (`payment.reconcile.timeout`).

## Manual trigger
Restart backend pod with temporary short cron:
```bash
PAYMENT_RECONCILE_CRON="*/1 * * * *"
```
Then observe logs and metrics.

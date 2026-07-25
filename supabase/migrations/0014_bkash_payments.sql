-- bKash support alongside SSLCommerz. provider column tags which gateway a
-- transaction went through; bkash_payment_id is the gateway's own payment
-- identifier (analogous to SSLCommerz's val_id) and must stay unique so a
-- completed paymentID can't be replayed against a different pending tran_id.

alter table payment_transactions
  add column provider text not null default 'sslcommerz' check (provider in ('sslcommerz', 'bkash')),
  add column bkash_payment_id text,
  add column bkash_trx_id text;

create unique index payment_transactions_bkash_payment_id_unique
  on payment_transactions (bkash_payment_id)
  where bkash_payment_id is not null;

alter table subscriptions
  add column bkash_payment_id text,
  add column bkash_trx_id text;

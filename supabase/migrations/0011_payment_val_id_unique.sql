-- A validated SSLCommerz val_id must not be attachable to more than one
-- transaction — otherwise a single real payment's val_id could be replayed
-- against any number of freshly-created pending tran_ids to grant free
-- lifetime access. Partial unique index (val_id is null until validated).

create unique index payment_transactions_val_id_unique
  on payment_transactions (val_id)
  where val_id is not null;

-- Self-service account deletion (lib/account.ts) deletes the auth.users row
-- and relies on foreign keys to remove everything the user owns. These FKs
-- were created without ON DELETE, so they would block that delete. Rows
-- they point from belong to the deleted user (bills they issued, proofs they
-- uploaded, invitations they sent), so they go with the account.

alter table plot_collaborators
  drop constraint if exists plot_collaborators_invited_by_fkey,
  add constraint plot_collaborators_invited_by_fkey
    foreign key (invited_by) references auth.users(id) on delete cascade;

alter table apartment_collaborators
  drop constraint if exists apartment_collaborators_invited_by_fkey,
  add constraint apartment_collaborators_invited_by_fkey
    foreign key (invited_by) references auth.users(id) on delete cascade;

alter table public.apartment_tenants
  drop constraint if exists apartment_tenants_owner_id_fkey,
  add constraint apartment_tenants_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete cascade;

alter table public.apartment_bills
  drop constraint if exists apartment_bills_owner_id_fkey,
  add constraint apartment_bills_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete cascade;

alter table public.apartment_bill_proofs
  drop constraint if exists apartment_bill_proofs_user_id_fkey,
  add constraint apartment_bill_proofs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

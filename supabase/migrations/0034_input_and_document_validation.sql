-- Enforce upload size/MIME allowlists even when the Storage API is called directly.
-- Opaque AES-GCM attachments use application/octet-stream and add a 16-byte tag.
update storage.buckets
set public = false,
    file_size_limit = 20971536,
    allowed_mime_types = array['application/pdf', 'application/octet-stream']
where id in ('land-documents', 'apartment-documents');

-- NOT VALID preserves legacy rows while enforcing these checks on new writes.
alter table plot_documents add constraint plot_documents_upload_metadata_check check (
  file_size_bytes is not null and file_size_bytes > 0
  and file_size_bytes <= case when is_encrypted then 20971536 else 20971520 end
  and mime_type is not null and mime_type = 'application/pdf'
  and length(file_name) between 5 and 180
  and lower(right(file_name, 4)) = '.pdf'
  and ((is_encrypted and encryption_iv is not null and octet_length(encryption_iv) = 12 and file_size_bytes > 16)
    or (not is_encrypted and encryption_iv is null))
) not valid;

alter table apartment_documents add constraint apartment_documents_upload_metadata_check check (
  file_size_bytes is not null and file_size_bytes > 0
  and file_size_bytes <= case when is_encrypted then 20971536 else 20971520 end
  and mime_type is not null and mime_type = 'application/pdf'
  and length(file_name) between 5 and 180
  and lower(right(file_name, 4)) = '.pdf'
  and ((is_encrypted and encryption_iv is not null and octet_length(encryption_iv) = 12 and file_size_bytes > 16)
    or (not is_encrypted and encryption_iv is null))
) not valid;

-- Backstop key input limits for callers that use the public PostgREST API.
-- Existing RLS policies remain responsible for ownership/collaborator access.
alter table land_plots add constraint land_plots_input_limits check (
  name is not null and length(btrim(name)) between 1 and 200
  and coalesce(length(notes), 0) <= 10000
  and coalesce(length(village), 0) <= 200
  and coalesce(length(mutation_number), 0) <= 100
  and (purchase_price is null or purchase_price between 0 and 1000000000000)
  and (current_estimated_value is null or current_estimated_value between 0 and 1000000000000)
  and (dolil_area is null or dolil_area between 0 and 1000000000000)
  and (actual_area is null or actual_area between 0 and 1000000000000)
  and ((sensitive_encrypted is null and sensitive_iv is null) or
    (sensitive_encrypted is not null and octet_length(sensitive_encrypted) between 16 and 32768
      and sensitive_iv is not null and octet_length(sensitive_iv) = 12))
) not valid;

alter table apartments add constraint apartments_input_limits check (
  name is not null and length(btrim(name)) between 1 and 200
  and coalesce(length(notes), 0) <= 10000
  and coalesce(length(building_name), 0) <= 200
  and coalesce(length(unit_number), 0) <= 100
  and coalesce(length(floor), 0) <= 50
  and (purchase_price is null or purchase_price between 0 and 1000000000000)
  and (current_estimated_value is null or current_estimated_value between 0 and 1000000000000)
  and (size is null or size between 0 and 1000000000000)
  and ((sensitive_encrypted is null and sensitive_iv is null) or
    (sensitive_encrypted is not null and octet_length(sensitive_encrypted) between 16 and 32768
      and sensitive_iv is not null and octet_length(sensitive_iv) = 12))
) not valid;

alter table leases add constraint leases_input_limits check (
  length(btrim(tenant_name)) between 1 and 200
  and coalesce(length(tenant_email), 0) <= 254
  and coalesce(length(tenant_phone), 0) <= 32
  and coalesce(length(notes), 0) <= 10000
  and rent_amount > 0 and rent_amount <= 1000000000000
  and (end_date is null or end_date >= start_date)
) not valid;

alter table lease_payments add constraint lease_payments_input_limits check (
  (paid_amount is null or paid_amount between 0 and 1000000000000)
  and coalesce(length(notes), 0) <= 10000
) not valid;

alter table expenses add constraint expenses_input_limits check (
  amount > 0 and amount <= 1000000000000
  and coalesce(length(notes), 0) <= 10000
) not valid;

alter table vendors add constraint vendors_input_limits check (
  length(btrim(name)) between 1 and 200
  and coalesce(length(trade), 0) <= 100
  and coalesce(length(phone), 0) <= 32
  and coalesce(length(notes), 0) <= 10000
) not valid;

alter table maintenance_requests add constraint maintenance_requests_input_limits check (
  length(btrim(title)) between 1 and 200
  and coalesce(length(description), 0) <= 10000
  and (cost is null or cost between 0 and 1000000000000)
) not valid;

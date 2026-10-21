# Apartment locations

After adding an apartment, use its **Apartment location** section. Owners and
editor collaborators can save, move or remove the building’s pin. Viewers can
view the saved pin but cannot change it. This does not change sharing permissions
or expose apartment data to tenant billing accounts.

Open the map to search for a place, select a point or drag the marker. Street and
satellite layers use the same map providers as plots. The **Use my current
location** button asks the browser for GPS permission only when pressed. Latitude
and longitude can also be entered directly, including when maps/search are
unavailable. Choose **Save location** to persist a selection. GPS and map changes
are drafts until saved. **Remove location** clears both coordinates.

The map is loaded only when opened, so apartment details do not download MapLibre
or tiles on initial load. Both English and Bangla are supported. Place search uses
the existing Photon provider; a failed search does not prevent manual pinning.

Locations belong to the building, independently of floor area or plot boundaries.
Existing apartments have no pin until one is saved. Guest locations persist in
the browser, survive metadata edits, and accompany guest apartment migration into
an account. Legacy guest records without coordinates remain valid.

## Deployment and verification

Apply `supabase/migrations/20261021152407_apartment_location.sql` before deploying.
It adds nullable latitude/longitude columns and a database constraint requiring
both to be null or both finite and within geographic bounds. Existing owner/editor
RLS controls writes; location saves use an authenticated server action and verify
that exactly one row was updated. No new API keys are needed.

Component, action and IndexedDB tests cover lazy map loading, explicit saving,
read-only controls, GPS errors, location removal, persistence and imported legacy
records. `supabase/tests/apartment_location.sql` tests real PostgreSQL coordinate
constraints and owner/editor/viewer/unrelated-account permissions, then rolls back
all fixtures. Browser checks use fictional data and mocked map/search services.

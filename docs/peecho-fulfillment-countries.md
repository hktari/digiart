# Peecho Fulfillment Countries

## Purpose

The platform only serves booklet subscriptions for collectors in countries that meet both conditions:

1. Peecho supports fulfillment for the configured booklet offering IDs.
2. The country is in the MVP launch region: EU member states or the United States.

The active country list is stored in the database so collector onboarding does not depend on a live Peecho API call.

## Database Model

Supported countries are stored in `FulfillmentCountry`.

Key fields:

- `code` — ISO-style country code from Peecho, for example `DE`, `SI`, `US`.
- `name` — display name from Peecho.
- `region` — `EU` or `US`.
- `isActive` — controls whether the country is shown to collectors.
- `source` — currently `peecho`.
- `syncedAt` — timestamp of the last Peecho sync.

## Sync Command

From the repository root:

```bash
pnpm --filter mvp pod:sync-countries
```

The command uses:

- `DATABASE_URL`
- `PEECHO_API_URL` if overriding the default sandbox URL
- `PEECHO_MERCHANT_API_KEY`
- `PEECHO_OFFERING_IDS`

## Sync Behavior

The script calls Peecho `POST /offering/countries` through `peechoClient.getCountries()`.

It then:

1. Keeps only EU member-state country codes and `US`.
2. Upserts matching countries into `FulfillmentCountry`.
3. Marks matching countries as `isActive = true`.
4. Deactivates previously synced Peecho countries that are no longer returned or no longer in the MVP region.

If Peecho returns no eligible EU or US countries, the script fails instead of clearing the active list silently.

## API Route

`GET /api/peecho/countries` returns active database countries:

```json
[
  { "code": "DE", "name": "Germany", "region": "EU" },
  { "code": "US", "name": "United States", "region": "US" }
]
```

Collector onboarding should use this route for the shipping-country selector.

## Operational Notes

Run the sync when:

- setting up a new environment
- changing `PEECHO_OFFERING_IDS`
- moving between Peecho sandbox and production
- Peecho changes fulfillment coverage

For MVP, do not manually add non-EU or non-US countries unless the pricing, VAT, and fulfillment policy are updated first.

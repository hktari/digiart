# Deployment

This is the operational runbook for deploying the MVP with Peecho-backed fulfillment data.

## Order Of Operations

1. Apply database migrations.
2. Deploy the application.
3. Sync fulfillment reference data from Peecho.
4. Verify collector onboarding and quote flows.

## Required Data Sync

The sync process is split into two layers:

- `FulfillmentCountry` stores country-level support.
- `FulfillmentState` stores US state-level support.

Run the sync after the database schema is migrated:

```bash
pnpm --filter mvp db:migrate
pnpm --filter mvp pod:sync-countries
```

`pod:sync-countries` now derives the active Peecho offering IDs from the current merchant key and fetches:

- EU and US fulfillment countries
- US fulfillment states

Do not hardcode offering IDs in deployment notes. Peecho offering IDs can change with the merchant key, so the sync must resolve them from the live catalog.

## US Collector Onboarding

US collectors must provide a 2-letter `shippingStateCode` during onboarding.

The onboarding flow should only accept a US state if:

- `shippingCountry` is `US`
- `shippingStateCode` is present
- the state exists in active `FulfillmentState` rows synced from Peecho

If `FulfillmentState` is missing, the database has not been migrated yet and `pod:sync-countries` will fail.

## Quote Flow

The pricing quote flow uses the collector’s stored shipping data:

- `shippingCountry`
- `shippingStateCode` for US collectors

US quotes must include the state code when calling Peecho.

## Verification Checklist

After deployment and sync:

- `pnpm --filter mvp pod:sync-countries` succeeds
- the sync output includes EU countries and US states
- collector onboarding rejects US profiles without a state code
- pricing quotes succeed for US collectors with a valid state code

## Related Docs

- [Deployment Guidelines](./deployment-guideline.md)
- [Sprint 4 Summary](./SPRINT_4_SUMMARY.md)

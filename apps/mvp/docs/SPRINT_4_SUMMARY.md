# Sprint 4: Platform Controls Implementation - Summary

## Overview

Sprint 4 successfully implemented the platform control layer that enables admins to manage global subscription cycles, configure booklet constraints, integrate with Peecho POD provider, and display live pricing estimates to collectors.

## Completed Tasks

### T16: Admin Cycles Management ✅

**Admin Role Guard:**
- Added `requireAdmin()` helper to `lib/roles.ts` for route protection
- Redirects non-admin users to home page

**Cycle Status Logic:**
- Created `lib/cycle-status.ts` with automatic status transitions based on dates
- Status flow: OPEN → LOCKED → PROCESSING → COMPLETE
- Manual override capability for testing

**Cycle Utilities:**
- Created `lib/cycle-utils.ts` with helper functions:
  - `getCurrentCycle()` - fetch active cycle with computed status
  - `canEditRelease()` - check if cycle allows editing
  - `canEditSelections()` - check if cycle allows selection changes
  - `getCycleStatusBadge()` - UI badge configuration
  - `getTimeUntilLock()` - countdown calculations

**API Routes:**
- `app/api/admin/cycles/route.ts` - GET (list), POST (create)
- `app/api/admin/cycles/[id]/route.ts` - GET, PATCH, DELETE
- Full validation with Zod schemas
- Unique month/year constraint enforcement

**Admin UI:**
- `app/admin/cycles/page.tsx` - List view with status badges
- `app/admin/cycles/new/page.tsx` - Create form
- `app/admin/cycles/[id]/page.tsx` - Edit form with status override
- `components/cycle-form.tsx` - Reusable form component

**Server Actions:**
- `lib/actions/cycle-actions.ts` - createCycle, updateCycle, deleteCycle, updateCycleStatus

### T17: Booklet Constraints Configuration ✅

**API Routes:**
- `app/api/admin/booklet-constraints/route.ts` - GET (list), POST (create)
- `app/api/admin/booklet-constraints/[id]/route.ts` - GET, PATCH, DELETE
- Auto-deactivate other constraints when activating one

**Admin UI:**
- `app/admin/booklet-constraints/page.tsx` - Full management interface
- Active constraint highlighted in green
- Version history table
- Inline create/edit functionality
- `components/constraint-form.tsx` - Reusable form component

**Server Actions:**
- `lib/actions/constraint-actions.ts` - createConstraint, updateConstraint, deleteConstraint, toggleConstraintActive

### T18: Peecho Integration ✅

**Peecho API Client:**
- `lib/peecho/client.ts` - HTTP client for Peecho API
- Methods: `getOfferings()`, `getQuote()`
- Environment variables: `PEECHO_API_KEY`, `PEECHO_API_URL`, `PEECHO_ENVIRONMENT`

**Offering Sync Service:**
- `lib/peecho/offering-sync.ts` - Sync offerings from Peecho to DB
- Maps Peecho fields to `PodOffering` schema
- Updates `syncedAt` timestamp

**Quote Service:**
- `lib/peecho/quote-service.ts` - Get pricing quotes
- Auto-selects default offering if not specified
- Returns: shipping, product, tax, total amounts

**API Routes:**
- `app/api/admin/pod/sync/route.ts` - POST to trigger sync
- `app/api/admin/pod/provider/route.ts` - GET provider with offerings
- `app/api/admin/pod/offerings/[id]/route.ts` - PATCH to toggle active status
- `app/api/pricing/quote/route.ts` - POST to get quote (authenticated users)

**Admin UI:**
- `app/admin/pod/page.tsx` - Full POD management interface
- Provider details display
- Offerings table with sync timestamps
- Manual sync button
- Toggle offering active/inactive

### T19: Collector Pricing Display ✅

**Quote Snapshot Service:**
- `lib/pricing/quote-snapshot.ts` - Persist quotes to DB
- `createQuoteSnapshot()` - Save quote data
- `getLatestQuote()` - Fetch most recent quote

**Pricing Actions:**
- `lib/actions/pricing-actions.ts` - fetchAndPersistQuote server action
- Validates collector has shipping country set
- Uses default page count of 20 for MVP

**Collector UI:**
- `app/collector/pricing/page.tsx` - Pricing estimate display
- Shows breakdown: product, shipping, tax, total
- Displays last quote timestamp
- "Refresh Quote" button
- `components/pricing-quote-display.tsx` - Reusable quote display component

### T20: Cycle Status UI Enforcement ✅

**Status Components:**
- `components/cycle-status-badge.tsx` - Color-coded status badges
- `components/cycle-lock-countdown.tsx` - Real-time countdown timer
- `components/cycle-locked-banner.tsx` - Warning banners for locked cycles

**Release Actions Updates:**
- Added cycle status checks to `lib/actions/releases.ts`:
  - `updateRelease()` - blocks if cycle locked
  - `setReleaseArtworks()` - blocks if cycle locked
  - `publishRelease()` - blocks if cycle locked

**Creator UI Updates:**
- `app/creator/releases/page.tsx`:
  - Displays current cycle status badge
  - Shows countdown to lock date when OPEN
  - Disables "New Release" button when cycle not OPEN
  - Warning message when cycle locked
- `app/creator/releases/new/page.tsx`:
  - Redirects if cycle not OPEN
  - Shows lock date warning banner
- `app/creator/releases/[id]/page.tsx`:
  - Displays cycle locked banner when applicable
  - Disables all edit actions when cycle locked
  - Shows read-only view

### Seed Scripts ✅

**Development/Test Seed (`scripts/reset-test-db.ts`):**
- Resets test DB and seeds deterministic E2E/dev data
- Creates creator user (CREATOR) and no-role user
- Seeds collector profile, catalog data, subscriptions, and selections
- Seeds booklet constraint and an OPEN subscription cycle
- Writes session credentials to `.env.test.local`

**Production Seed (`scripts/seed-production.ts`):**
- Creates admin user from `ADMIN_EMAIL` env var
- Creates initial booklet constraint (30-50 pages)
- Creates POD provider config (Peecho)
- Creates first subscription cycle (next month)
- Idempotent - safe to run multiple times
- No test data - production-ready only

**Package.json Scripts:**
- `pnpm db:seed` - Run development seed
- `pnpm db:seed:production` - Run production seed

## Environment Variables Required

```env
# Peecho POD Integration
PEECHO_API_KEY=your_sandbox_key
PEECHO_API_URL=https://sandbox.peecho.com/api/v1
PEECHO_ENVIRONMENT=SANDBOX  # or PRODUCTION

# Production Seed
ADMIN_EMAIL=admin@yourplatform.com
```

## Files Created

### Core Logic
- `lib/roles.ts` (modified - added requireAdmin)
- `lib/cycle-status.ts`
- `lib/cycle-utils.ts`
- `lib/peecho/client.ts`
- `lib/peecho/offering-sync.ts`
- `lib/peecho/quote-service.ts`
- `lib/pricing/quote-snapshot.ts`

### Server Actions
- `lib/actions/cycle-actions.ts`
- `lib/actions/constraint-actions.ts`
- `lib/actions/pricing-actions.ts`
- `lib/actions/releases.ts` (modified - added cycle checks)

### API Routes
- `app/api/admin/cycles/route.ts`
- `app/api/admin/cycles/[id]/route.ts`
- `app/api/admin/booklet-constraints/route.ts`
- `app/api/admin/booklet-constraints/[id]/route.ts`
- `app/api/admin/pod/sync/route.ts`
- `app/api/admin/pod/provider/route.ts`
- `app/api/admin/pod/offerings/[id]/route.ts`
- `app/api/pricing/quote/route.ts`

### Admin Pages
- `app/admin/cycles/page.tsx` (replaced placeholder)
- `app/admin/cycles/new/page.tsx`
- `app/admin/cycles/[id]/page.tsx`
- `app/admin/booklet-constraints/page.tsx` (replaced placeholder)
- `app/admin/pod/page.tsx` (replaced placeholder)

### Collector Pages
- `app/collector/pricing/page.tsx` (replaced placeholder)

### Creator Pages (modified)
- `app/creator/releases/page.tsx` (added cycle status)
- `app/creator/releases/new/page.tsx` (added cycle check)
- `app/creator/releases/[id]/page.tsx` (added cycle lock banner)

### Components
- `components/cycle-form.tsx`
- `components/constraint-form.tsx`
- `components/pricing-quote-display.tsx`
- `components/cycle-status-badge.tsx`
- `components/cycle-lock-countdown.tsx`
- `components/cycle-locked-banner.tsx`

### Scripts
- `scripts/reset-test-db.ts` (modified)
- `scripts/seed-production.ts`
- `package.json` (modified - added seed scripts)

## Key Features

### Admin Controls
- ✅ Create/edit/delete subscription cycles
- ✅ Set lock and fulfillment dates
- ✅ Manual status override for testing
- ✅ Configure booklet page constraints
- ✅ Version history for constraints
- ✅ Sync Peecho offerings
- ✅ Toggle offering active status

### Cycle Status Enforcement
- ✅ Automatic status transitions based on dates
- ✅ Block release creation when cycle locked
- ✅ Block release editing when cycle locked
- ✅ Block release publishing when cycle locked
- ✅ Visual indicators (badges, countdowns, banners)
- ✅ User-friendly error messages

### Pricing Integration
- ✅ Peecho API integration
- ✅ Offering sync to database
- ✅ Quote generation with breakdown
- ✅ Quote persistence for history
- ✅ Collector-facing pricing display
- ✅ Refresh quote functionality

## Testing Recommendations

### Manual Testing Checklist
- [ ] Admin can create cycles with date validation
- [ ] Only one constraint can be active at a time
- [ ] Peecho offering sync populates database
- [ ] Collector sees pricing quote estimate
- [ ] Quote persists to snapshot table
- [ ] Countdown timer displays correctly
- [ ] "New Release" button disabled when cycle locked
- [ ] Edit actions disabled on locked releases
- [ ] Status badges show correct colors
- [ ] Locked banner displays with appropriate messaging
- [ ] Cannot create/edit releases when cycle locked (UI + API)
- [ ] Cannot change selections when cycle locked

### Unit Tests Needed
- Cycle status transition logic
- Constraint activation/deactivation
- Quote calculation (with mocked Peecho)
- Cycle status utility functions
- Time until lock calculations

### Integration Tests Needed
- Admin CRUD operations for cycles/constraints
- Peecho offering sync (with mock API)
- Quote API endpoint
- Release creation blocked when cycle locked
- Selection changes blocked when cycle locked

## Next Steps

1. **Run database migrations** to apply schema changes
2. **Run seed script** to initialize data:
   - Development: `pnpm db:seed`
   - Production: `pnpm db:seed:production`
3. **Configure Peecho credentials** in environment variables
4. **Sync Peecho offerings** via admin UI
5. **Test cycle status enforcement** with different cycle states
6. **Verify pricing quotes** work end-to-end

## Notes

- Peecho client uses simple error handling with console logging
- Quote caching stores in DB (no Redis needed for MVP)
- Cycle status transitions are automated but admin can override
- Default offering used if collector doesn't specify
- Page count calculation uses placeholder (20 pages) until Sprint 3 selection flow complete
- All admin routes protected with ADMIN role check
- Cycle status checked on both UI and API level for security

## Dependencies

No new dependencies added. Using existing:
- `zod` for validation
- `@prisma/client` for DB operations
- Native `fetch` for Peecho API calls

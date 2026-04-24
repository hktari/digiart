# Sprint 4: Test Coverage Effort Estimate

## Overview

Comprehensive backend test coverage for Sprint 4 platform controls implementation.

## Scope

### 1. Merge Main Trunk

- **Effort**: 1-2 hours
- **Tasks**:
  - Resolve merge conflicts (if any)
  - Update dependencies
  - Run linter/formatter
  - Verify build passes
  - Manual smoke test

### 2. Unit Tests

#### T16: Cycle Management (8-10 hours)

**Files to test:**

- `lib/cycle-status.ts` - Status computation logic
- `lib/cycle-utils.ts` - Utility functions
- `lib/actions/cycle-actions.ts` - Server actions

**Test cases (~25 tests):**

- ✅ `computeCycleStatus()` returns OPEN when before lock date
- ✅ `computeCycleStatus()` returns LOCKED between lock and fulfillment
- ✅ `computeCycleStatus()` returns PROCESSING on fulfillment date
- ✅ `computeCycleStatus()` returns COMPLETE after fulfillment
- ✅ `getCurrentCycle()` returns cycle with computed status
- ✅ `canEditRelease()` returns true when OPEN
- ✅ `canEditRelease()` returns false when LOCKED/PROCESSING/COMPLETE
- ✅ `getTimeUntilLock()` calculates days/hours/minutes correctly
- ✅ `getTimeUntilLock()` returns isExpired=true when past lock date
- ✅ `createCycle()` validates date order (selection < lock < fulfillment)
- ✅ `createCycle()` enforces unique month/year constraint
- ✅ `updateCycle()` validates dates
- ✅ `updateCycle()` allows manual status override
- ✅ `deleteCycle()` prevents deletion if has releases
- ✅ Cycle status auto-updates based on current date

#### T17: Booklet Constraints (4-5 hours)

**Files to test:**

- `lib/actions/constraint-actions.ts`

**Test cases (~15 tests):**

- ✅ `createConstraint()` validates minPages < maxPages
- ✅ `createConstraint()` auto-increments version
- ✅ `updateConstraint()` validates page range
- ✅ `toggleConstraintActive()` deactivates others when activating
- ✅ `toggleConstraintActive()` allows multiple inactive
- ✅ `deleteConstraint()` prevents deletion of active constraint
- ✅ Only one constraint can be active at a time
- ✅ Version increments correctly

#### T18: Peecho Integration (6-8 hours)

**Files to test:**

- `lib/peecho/client.ts` - API client
- `lib/peecho/offering-sync.ts` - Sync service
- `lib/peecho/quote-service.ts` - Quote service

**Test cases (~20 tests):**

- ✅ `getOfferings()` fetches from Peecho API
- ✅ `getOfferings()` handles API errors gracefully
- ✅ `getQuote()` fetches quote with correct params
- ✅ `getQuote()` handles missing offering_id
- ✅ `syncPeechoOfferings()` creates new offerings
- ✅ `syncPeechoOfferings()` updates existing offerings
- ✅ `syncPeechoOfferings()` sets syncedAt timestamp
- ✅ `getQuote()` auto-selects offering by page count
- ✅ `getQuote()` throws error if no suitable offering
- ✅ Mock Peecho API responses
- ✅ Handle network failures

#### T19: Pricing Quotes (4-5 hours)

**Files to test:**

- `lib/pricing/quote-snapshot.ts`
- `lib/actions/pricing-actions.ts`

**Test cases (~12 tests):**

- ✅ `createQuoteSnapshot()` persists quote data
- ✅ `createQuoteSnapshot()` validates collector has shipping country
- ✅ `getLatestQuote()` returns most recent quote
- ✅ `fetchAndPersistQuote()` creates snapshot
- ✅ `fetchAndPersistQuote()` validates user is authenticated
- ✅ `fetchAndPersistQuote()` requires shipping country
- ✅ Quote includes all cost breakdowns

#### T20: Cycle Status Enforcement (3-4 hours)

**Files to test:**

- `lib/actions/releases.ts` (modified)

**Test cases (~10 tests):**

- ✅ `updateRelease()` blocks when cycle locked
- ✅ `setReleaseArtworks()` blocks when cycle locked
- ✅ `publishRelease()` blocks when cycle locked
- ✅ Actions succeed when cycle OPEN
- ✅ Error messages are user-friendly

**Total Unit Tests: 25-32 hours**

### 3. Integration Tests

#### API Routes (12-15 hours)

**Routes to test:**

- `/api/admin/cycles` (GET, POST)
- `/api/admin/cycles/[id]` (GET, PATCH, DELETE)
- `/api/admin/booklet-constraints` (GET, POST)
- `/api/admin/booklet-constraints/[id]` (GET, PATCH, DELETE)
- `/api/admin/pod/sync` (POST)
- `/api/admin/pod/provider` (GET)
- `/api/admin/pod/offerings/[id]` (PATCH)
- `/api/pricing/quote` (POST)

**Test cases (~40 tests):**

- ✅ Admin routes require ADMIN role
- ✅ Non-admin users get 401
- ✅ CRUD operations work correctly
- ✅ Validation errors return 400
- ✅ Not found returns 404
- ✅ Unique constraints enforced
- ✅ Peecho sync creates offerings
- ✅ Quote API validates input
- ✅ Quote API requires authentication

#### Database Integration (6-8 hours)

**Test cases (~15 tests):**

- ✅ Cycle unique constraint on month/year
- ✅ Constraint activation deactivates others
- ✅ Quote snapshot foreign keys
- ✅ Cascade deletes work correctly
- ✅ Transaction rollbacks on error

**Total Integration Tests: 18-23 hours**

### 4. Real Peecho Integration Test (3-4 hours)

**Separate test script for on-demand execution:**

- Script: `pnpm test:peecho` (uses real Peecho sandbox API)
- Not part of regular test suite
- Requires `.env.test` with Peecho credentials

**Test cases (~8 tests):**

- ✅ Fetch real offerings from Peecho sandbox
- ✅ Sync offerings to database
- ✅ Get real quote for various page counts
- ✅ Validate quote response structure
- ✅ Test different countries (US, UK, DE)
- ✅ Handle API rate limits gracefully
- ✅ Verify offering data mapping
- ✅ Test quote with invalid parameters

**Mock PDF generation:**

- Mock any PDF generation dependencies
- Focus on Peecho API integration only

## Total Effort Estimate

| Task                    | Low     | High    | Avg     |
| ----------------------- | ------- | ------- | ------- |
| Merge main trunk        | 1h      | 2h      | 1.5h    |
| Unit tests              | 25h     | 32h     | 28.5h   |
| Integration tests       | 18h     | 23h     | 20.5h   |
| Peecho integration test | 3h      | 4h      | 3.5h    |
| **Total**               | **47h** | **61h** | **54h** |

## Recommended Approach

### Phase 1: Foundation (1-2 days)

1. Merge main trunk
2. Set up test infrastructure
3. Create test utilities and mocks

### Phase 2: Unit Tests (3-4 days)

1. Cycle management tests (highest priority)
2. Constraint tests
3. Peecho integration tests (with mocks)
4. Pricing tests
5. Release action tests

### Phase 3: Integration Tests (2-3 days)

1. API route tests
2. Database integration tests
3. End-to-end backend flows

### Phase 4: Real Peecho Test (0.5 day)

1. Create separate test script
2. Test against real Peecho sandbox
3. Verify offering sync and quotes
4. Document usage

## Test Infrastructure Needed

### Mocks

- Peecho API client mock
- Database transaction mocks
- Auth session mocks
- Date/time mocks for cycle status

### Utilities

- Test data factories (cycles, constraints, offerings)
- Database cleanup helpers
- API request helpers
- Mock Peecho responses
- Real Peecho test script (`scripts/test-peecho-integration.ts`)
- PDF generation mocks

### Configuration

- Vitest config for unit tests
- Playwright config for E2E
- Test database setup
- CI/CD integration

## Risk Factors

**Low Risk:**

- Cycle status logic (pure functions)
- Constraint validation
- Quote snapshot persistence

**Medium Risk:**

- Peecho API integration (external dependency)
- Cycle status enforcement (multiple touch points)
- Database unique constraints

**High Risk:**

- Date/time calculations (timezone issues)
- Transaction rollbacks
- Race conditions in constraint activation

## Success Criteria

- ✅ 80%+ code coverage on business logic
- ✅ All API routes have integration tests
- ✅ All edge cases covered
- ✅ Tests run in < 30 seconds (unit)
- ✅ Tests run in < 2 minutes (integration)
- ✅ CI/CD pipeline green
- ✅ No flaky tests

## Deliverables

1. **Unit test suite** (~82 tests) - Backend logic only
2. **Integration test suite** (~55 tests) - API routes & DB
3. **Real Peecho integration test** (~8 tests) - Separate script
4. **Test documentation** (README updates)
5. **CI/CD configuration** (GitHub Actions)
6. **Mock utilities** (reusable test helpers)
7. **Peecho test script** (`pnpm test:peecho`)

## Timeline

**Conservative estimate: 7-8 working days (56-64 hours)**
**Aggressive estimate: 5-6 working days (40-48 hours)**
**Recommended: 6-7 working days with buffer**

This includes:

- Writing tests
- Debugging failures
- Refactoring for testability
- Documentation
- Code review iterations

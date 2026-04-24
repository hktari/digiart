# Sprint 4: Backend Testing Plan

## Executive Summary

**Total Effort: 47-61 hours (6-7 working days)**

Focus: Backend systems only (no frontend/UI testing)
- Unit tests for business logic
- Integration tests for API routes & database
- Real Peecho integration test (separate on-demand script)

## Test Coverage Breakdown

### 1. Merge Main Trunk (1-2 hours)
- Resolve merge conflicts
- Update dependencies
- Run linter/formatter
- Verify build passes
- Manual smoke test

### 2. Unit Tests (25-32 hours) - ~82 tests

#### Cycle Management (8-10 hours) - 25 tests
**Files:**
- `lib/cycle-status.ts`
- `lib/cycle-utils.ts`
- `lib/actions/cycle-actions.ts`

**Coverage:**
- Status computation (OPEN/LOCKED/PROCESSING/COMPLETE)
- Date-based transitions
- Countdown calculations
- Edit permissions
- CRUD validations
- Unique month/year constraint

#### Booklet Constraints (4-5 hours) - 15 tests
**Files:**
- `lib/actions/constraint-actions.ts`

**Coverage:**
- Page range validation (min < max)
- Single active constraint enforcement
- Version auto-increment
- Activation/deactivation logic

#### Peecho Integration (6-8 hours) - 20 tests
**Files:**
- `lib/peecho/client.ts`
- `lib/peecho/offering-sync.ts`
- `lib/peecho/quote-service.ts`

**Coverage:**
- Mock Peecho API responses
- Offering sync logic
- Quote calculation
- Auto-offering selection
- Error handling

#### Pricing Quotes (4-5 hours) - 12 tests
**Files:**
- `lib/pricing/quote-snapshot.ts`
- `lib/actions/pricing-actions.ts`

**Coverage:**
- Quote persistence
- Shipping country validation
- Latest quote retrieval
- Cost breakdown accuracy

#### Release Enforcement (3-4 hours) - 10 tests
**Files:**
- `lib/actions/releases.ts` (modified sections)

**Coverage:**
- Block edits when cycle locked
- Block artwork changes when locked
- Block publishing when locked
- Allow operations when OPEN

### 3. Integration Tests (18-23 hours) - ~55 tests

#### API Routes (12-15 hours) - 40 tests
**Routes:**
```
/api/admin/cycles (GET, POST)
/api/admin/cycles/[id] (GET, PATCH, DELETE)
/api/admin/booklet-constraints (GET, POST)
/api/admin/booklet-constraints/[id] (GET, PATCH, DELETE)
/api/admin/pod/sync (POST)
/api/admin/pod/provider (GET)
/api/admin/pod/offerings/[id] (PATCH)
/api/pricing/quote (POST)
```

**Coverage:**
- Admin role enforcement (401 for non-admin)
- CRUD operations
- Validation errors (400)
- Not found errors (404)
- Unique constraints
- Transaction integrity

#### Database Integration (6-8 hours) - 15 tests
**Coverage:**
- Unique constraints (cycle month/year)
- Constraint activation logic
- Foreign key relationships
- Cascade deletes
- Transaction rollbacks

### 4. Real Peecho Integration Test (3-4 hours) - ~8 tests

**Separate script: `pnpm test:peecho`**

Uses real Peecho sandbox API (not mocked)

**Test cases:**
- Fetch real offerings from Peecho
- Sync offerings to test database
- Get quotes for various page counts (20, 30, 40, 50)
- Test multiple countries (US, UK, DE)
- Validate response structure
- Handle API errors gracefully
- Verify data mapping
- Test invalid parameters

**Configuration:**
```bash
# .env.test
PEECHO_API_KEY=your_sandbox_key
PEECHO_ENV=sandbox
DATABASE_URL_TEST=postgresql://...
```

**Mock PDF generation if needed**

## Test Infrastructure

### Mocks Required
```typescript
// Peecho API mock for unit tests
vi.mock('@/lib/peecho/client', () => ({
  peechoClient: {
    getOfferings: vi.fn(),
    getQuote: vi.fn()
  }
}))

// Auth mock
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

// Date/time mock for cycle status
vi.useFakeTimers()
```

### Test Utilities
```typescript
// Test data factories
createTestCycle(overrides?)
createTestConstraint(overrides?)
createTestOffering(overrides?)
createTestQuote(overrides?)

// Database helpers
cleanupDatabase()
seedTestData()

// API helpers
authenticatedRequest(route, options)
adminRequest(route, options)
```

### Mock Peecho Responses
```typescript
// Mock offering response
{
  id: "peecho-offering-1",
  name: "Softcover Booklet",
  min_pages: 20,
  max_pages: 100,
  width_mm: 210,
  height_mm: 297
}

// Mock quote response
{
  offering_id: "peecho-offering-1",
  page_count: 30,
  country: "US",
  product_amount: 12.50,
  shipping_amount: 5.00,
  tax_amount: 1.75,
  total_amount: 19.25,
  currency: "USD"
}
```

## Execution Plan

### Phase 1: Foundation (Days 1-2)
**Tasks:**
1. Merge main trunk
2. Set up test infrastructure
3. Create mock utilities
4. Create test data factories
5. Database cleanup helpers

**Deliverables:**
- Clean merge
- Test utilities file
- Mock Peecho responses
- Factory functions

### Phase 2: Unit Tests (Days 3-4)
**Priority order:**
1. Cycle management tests (critical path)
2. Constraint tests
3. Peecho integration tests (mocked)
4. Pricing tests
5. Release enforcement tests

**Deliverables:**
- ~82 unit tests passing
- 80%+ code coverage on business logic

### Phase 3: Integration Tests (Days 5-6)
**Tasks:**
1. API route tests (admin auth, CRUD)
2. Database integration tests
3. End-to-end backend flows

**Deliverables:**
- ~55 integration tests passing
- All API routes covered

### Phase 4: Real Peecho Test (Day 7)
**Tasks:**
1. Create `scripts/test-peecho-integration.ts`
2. Test against real Peecho sandbox
3. Document usage
4. Add to package.json

**Deliverables:**
- Working Peecho integration test
- Documentation in README
- `pnpm test:peecho` script

## File Structure

```
apps/mvp/
├── lib/
│   ├── __tests__/
│   │   ├── cycle-status.test.ts
│   │   ├── cycle-utils.test.ts
│   │   ├── constraint-actions.test.ts
│   │   ├── peecho-client.test.ts
│   │   ├── peecho-sync.test.ts
│   │   ├── quote-service.test.ts
│   │   ├── quote-snapshot.test.ts
│   │   ├── pricing-actions.test.ts
│   │   └── releases.test.ts
│   └── test-utils/
│       ├── factories.ts
│       ├── mocks.ts
│       └── db-helpers.ts
├── app/api/
│   └── __tests__/
│       ├── admin-cycles.test.ts
│       ├── admin-constraints.test.ts
│       ├── admin-pod.test.ts
│       └── pricing-quote.test.ts
├── scripts/
│   └── test-peecho-integration.ts
└── package.json (add test:peecho script)
```

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run lib/",
    "test:integration": "vitest run app/api/",
    "test:peecho": "dotenv -e .env.test -- tsx scripts/test-peecho-integration.ts",
    "test:all": "pnpm test && pnpm test:peecho"
  }
}
```

## Success Criteria

- ✅ All unit tests pass (82 tests)
- ✅ All integration tests pass (55 tests)
- ✅ 80%+ code coverage on business logic
- ✅ Peecho integration test works on-demand
- ✅ Tests run fast (< 30s unit, < 2min integration)
- ✅ No flaky tests
- ✅ CI/CD pipeline green
- ✅ Documentation updated

## Risk Mitigation

**Date/Time Calculations:**
- Use `vi.useFakeTimers()` for predictable testing
- Test multiple timezones
- Test edge cases (midnight, month boundaries)

**Peecho API:**
- Mock for unit tests (fast, reliable)
- Real API for integration test (on-demand only)
- Handle rate limits gracefully
- Test error scenarios

**Database Transactions:**
- Clean up after each test
- Use test database only
- Test rollback scenarios
- Verify foreign key constraints

**Race Conditions:**
- Test constraint activation concurrency
- Test cycle status updates
- Use database transactions properly

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      
      # Unit tests
      - run: pnpm --filter mvp test:unit
      
      # Integration tests (requires test DB)
      - run: pnpm --filter mvp test:integration
        env:
          DATABASE_URL_TEST: ${{ secrets.DATABASE_URL_TEST }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
      
      # Peecho test (manual trigger only)
      # Not run in CI by default
```

## Documentation Updates

**TESTING.md additions:**
- Backend testing strategy
- How to run Peecho integration test
- Mock utilities documentation
- Test data factories guide

**README.md additions:**
- Add `pnpm test:peecho` to commands
- Document test database setup
- Explain test coverage

## Timeline

**Conservative: 7-8 working days (56-64 hours)**
**Aggressive: 5-6 working days (40-48 hours)**
**Recommended: 6-7 working days with buffer**

Includes:
- Writing tests
- Debugging failures
- Refactoring for testability
- Documentation
- Code review iterations

## Next Steps

1. **Get approval** for this plan
2. **Merge main trunk** (Day 1 morning)
3. **Set up test infrastructure** (Day 1 afternoon)
4. **Start unit tests** (Day 2)
5. **Daily progress updates**

Ready to proceed? 🚀

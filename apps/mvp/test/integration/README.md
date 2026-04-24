# MVP Backend Integration Tests

End-to-end integration tests for the MVP backend, testing the complete flow from API routes through database, Redis queue, to PDF worker.

## Architecture

```
Test Case → MVP API → Neon DB → BullMQ Redis → PDF Worker → Storage (mocked)
```

## Prerequisites

1. **Neon Test Branch**: Create a dedicated test branch in Neon
2. **Redis**: Local Redis server running (or use testcontainers)
3. **Environment**: Copy `.env.test.example` to `.env.test` and configure

## Quick Start

```bash
# 1. Install dependencies (from monorepo root)
pnpm install

# 2. Set up test environment
cp .env.test.example .env.test
# Edit .env.test with your Neon test branch URL

# 3. Run database migrations on test branch
DATABASE_URL="your-test-branch-url" pnpm db:push

# 4. Run integration tests
pnpm test:integration

# 5. Run in watch mode
pnpm test:integration:watch
```

## Environment Variables

Create `.env.test`:

```bash
# Neon test branch (required)
DATABASE_URL="postgresql://user:pass@host/test-db?sslmode=require"

# Redis (defaults to localhost:6379)
REDIS_URL="redis://localhost:6379"

# Storage (mocked)
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/tmp/test-uploads

# Auth bypass
AUTH_SECRET="test-secret"
AUTH_BYPASS_TEST_USER_ID="test-user-id"

# AWS (mocked)
AWS_S3_BUCKET=test-bucket
AWS_REGION=eu-west-1
```

## Test Structure

```
test/integration/
├── __tests__/
│   ├── health-check.spec.ts       # DB + Redis connectivity
│   ├── artwork-upload.spec.ts     # Artwork flow tests
│   └── booklet-generation.spec.ts # Full stack: API → Worker
├── factories/
│   ├── user.factory.ts            # User/Creator/Collector factories
│   ├── artwork.factory.ts         # Artwork factory
│   ├── cycle.factory.ts           # Cycle/Release/Selection factories
│   └── index.ts
├── utils/
│   ├── database.ts                # Prisma client & cleanup
│   ├── redis.ts                   # BullMQ utilities
│   ├── s3-mock.ts                 # S3 mocking
│   └── index.ts
├── setup.ts                       # Global test setup
└── jest.config.js                 # Jest configuration
```

## Test Factories

Use factories to create test data:

```typescript
import { getTestPrismaClient } from "../utils/database";
import { createTestCreator, createTestCycle } from "../factories";

const db = getTestPrismaClient();
const { user, profile: creator } = await createTestCreator(db);
const cycle = await createTestCycle(db);
```

## Cleanup Strategy

- **After each test**: All test data is automatically cleaned up
- **Database**: Rows deleted in reverse dependency order
- **Redis**: Queue jobs removed via `queue.obliterate()`
- **S3**: Mock storage directory wiped

## Writing Integration Tests

```typescript
describe("Feature Integration", () => {
  it("should do something end-to-end", async () => {
    // 1. Setup: Create test entities
    const db = getTestPrismaClient();
    const { profile: creator } = await createTestCreator(db);

    // 2. Execute: Call API or service directly
    const result = await someOperation();

    // 3. Assert: Verify database state, responses, etc.
    expect(result.success).toBe(true);
    const dbRecord = await db.someTable.findUnique({ ... });
    expect(dbRecord).toBeDefined();
  });
});
```

## Full Stack Booklet Tests

The booklet generation tests verify the complete flow:

1. Create test scenario (collectors, creators, artworks, selections)
2. Mock S3 with test artwork images
3. Call MVP API to enqueue job
4. PDF worker processes job from Redis
5. Verify `GeneratedPrintFile` record in database
6. Verify PDF was "uploaded" to mock storage

## Troubleshooting

### Database connection errors
- Verify `DATABASE_URL` is set and points to test branch
- Ensure test branch is accessible

### Redis connection errors
- Start local Redis: `redis-server`
- Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`

### Type errors in factories
These are often false positives from the IDE. Run tests to verify:
```bash
pnpm test:integration
```

## CI/CD

Add to GitHub Actions:

```yaml
- name: Integration Tests
  run: pnpm test:integration
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
    REDIS_URL: redis://localhost:6379
    AUTH_SECRET: test-secret
```

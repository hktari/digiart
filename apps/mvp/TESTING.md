# Testing Guide

This project uses **Vitest** for component tests and **Playwright** for E2E tests.

## Quick Start

```bash
# Run all component tests
pnpm test

# Run component tests in watch mode
pnpm test:watch

# Run E2E tests (requires test database)
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

---

## Component Tests (Vitest)

### Setup

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom
- **Location**: `**/__tests__/*.test.tsx` files

### Running Tests

```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

### Writing Tests

Component tests are located next to the components they test:

```
app/auth/sign-in/
  page.tsx
  __tests__/
    page.test.tsx
```

Example test:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Mocking

Global mocks are configured in `vitest.setup.ts`:

- `next/navigation` (useRouter, usePathname, redirect)

For component-specific mocks, use `vi.mock()`:

```tsx
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "test-id" } })),
}));
```

---

## E2E Tests (Playwright)

### Setup

E2E tests require a **Neon test branch** for database operations.

#### 1. Create Test Environment File

```bash
cp .env.test.example .env.test
```

#### 2. Configure Test Database

Edit `.env.test`:

```env
# Neon test branch URL
DATABASE_URL="postgresql://user:password@host/test-db?sslmode=require"

# Auth configuration
AUTH_SECRET="your-auth-secret"
AUTH_URL="http://localhost:3000"
```

#### 3. Run Migrations on Test Database

```bash
dotenv -e .env.test -- pnpm db:push
```

#### 4. Seed Test User

This creates a test user with CREATOR role and generates auth credentials:

```bash
pnpm test:seed
```

This will output:

- Test user email and ID
- Session token
- Credentials written to `.env.test.local`

### Running E2E Tests

**Two-step workflow:**

1. **Start the dev server** (in one terminal):

```bash
pnpm test:e2e:server
```

This starts Next.js on port 3005.

2. **Run the tests** (in another terminal):

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e e2e/auth.spec.ts
```

**Note:**

- The dev server must be running on port 3005 before executing tests
- If tests fail with auth errors, re-run `pnpm test:seed` to regenerate credentials
- All development and testing uses port 3005

### How E2E Auth Works

E2E tests use an **auth bypass** mechanism to avoid sending real emails:

1. **Global Setup** (`playwright/global-setup.ts`):
   - Creates a test user in the database
   - Generates a session token
   - Saves auth cookie to `playwright/.auth/user.json`

2. **Auth Bypass** (`lib/auth.ts`):
   - When `AUTH_BYPASS_TEST_USER_ID` is set (non-production only)
   - `auth()` returns a mock session for that user
   - No email verification needed

3. **Tests**:
   - All tests automatically use the pre-authenticated session
   - No need to sign in manually

### Writing E2E Tests

E2E tests are in the `e2e/` directory:

```typescript
import { expect, test } from "../playwright/fixtures";

test.describe("My Feature", () => {
  test("does something", async ({ page }) => {
    await page.goto("/my-page");
    await expect(page.getByText("Hello")).toBeVisible();
  });
});
```

### API Mocking in E2E

For tests that call external APIs (e.g., S3), use `page.route()`:

```typescript
test("uploads file", async ({ page }) => {
  // Mock the presign API
  await page.route("**/api/artworks/presign", (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ uploadUrl: "https://s3.example.com/upload" }),
    });
  });

  // Mock S3 upload
  await page.route("https://s3.example.com/upload", (route) => {
    route.fulfill({ status: 200 });
  });

  // Test continues...
});
```

---

## Test Coverage

### Component Tests

| Component                           | Tests                                     |
| ----------------------------------- | ----------------------------------------- |
| `app/auth/sign-in/page.tsx`         | Email input, submit button, error display |
| `app/onboarding/page.tsx`           | Role selection UI                         |
| `app/creator/artworks/new/page.tsx` | File upload, title input, validation      |
| `components/placeholder-page.tsx`   | Rendering with/without description        |

### E2E Tests

| Test File                      | Coverage                          |
| ------------------------------ | --------------------------------- |
| `e2e/auth.spec.ts`             | Sign-in page, error handling      |
| `e2e/onboarding.spec.ts`       | Role selection flow               |
| `e2e/artwork-upload.spec.ts`   | Full upload flow with mocked APIs |
| `e2e/creator-artworks.spec.ts` | Artworks list page                |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

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
          cache: "pnpm"

      - run: pnpm install

      # Component tests
      - run: pnpm --filter mvp test

      # E2E tests (requires test database)
      - run: pnpm --filter mvp test:e2e
        env:
          DATABASE_URL_TEST: ${{ secrets.DATABASE_URL_TEST }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
          AUTH_BYPASS_TEST_USER_ID: ${{ secrets.TEST_USER_ID }}
```

---

## Troubleshooting

### Component Tests

**Issue**: Tests fail with "Cannot find module"

- **Fix**: Ensure `vitest.config.ts` has the correct path alias

**Issue**: "useRouter is not a function"

- **Fix**: Check that `vitest.setup.ts` mocks `next/navigation`

### E2E Tests

**Issue**: "Authentication failed"

- **Fix**: Verify `.env.test` has correct `DATABASE_URL_TEST` and `AUTH_BYPASS_TEST_USER_ID`

**Issue**: "Test user not found"

- **Fix**: Run `playwright/global-setup.ts` manually or delete `playwright/.auth/user.json`

**Issue**: Tests timeout

- **Fix**: Increase timeout in `playwright.config.ts` or specific test with `test.setTimeout(30000)`

---

## Best Practices

1. **Component Tests**:
   - Test user-facing behavior, not implementation details
   - Use `screen.getByRole()` over `getByTestId()` when possible
   - Mock external dependencies (API calls, auth, etc.)

2. **E2E Tests**:
   - Mock external APIs (S3, payment providers, etc.)
   - Use `page.route()` for API mocking
   - Keep tests independent (no shared state)
   - Use descriptive test names

3. **General**:
   - Run tests before committing
   - Keep tests fast (< 5s for component, < 30s for E2E)
   - Update tests when changing features

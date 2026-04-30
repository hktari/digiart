# E2E Testing Guide

## Playwright Configuration Structure

The Playwright configuration uses a **dependency-based test organization system** to manage test execution order and data dependencies.

### Test Projects

The e2e tests are organized into 7 projects:

1. **creator-onboarding** - Creates the CreatorProfile (runs first)
   - File: `e2e/creator-onboarding.spec.ts`
   - No dependencies
   - Must complete before any creator-flow tests

2. **creator-profile** - Profile & social links
   - File: `e2e/creator-profile.spec.ts`
   - Depends on: `creator-onboarding`
   - Requires existing CreatorProfile

3. **creator-artworks** - Artwork upload
   - File: `e2e/artwork-upload.spec.ts`
   - Depends on: `creator-onboarding`
   - Requires existing CreatorProfile

4. **creator-release** - Release creation
   - File: `e2e/creator-release.spec.ts`
   - Depends on: `creator-onboarding`
   - Requires existing CreatorProfile

5. **creator-flow** - Creator dashboard journey (quick actions, artwork upload flow, release-entry behavior)
   - File: `e2e/creator-flow.spec.ts`
   - Depends on: `creator-onboarding`
   - Covers the connected creator UX across core pages

6. **collector-flow** - Collector dashboard and navigation journey
   - File: `e2e/collector-flow.spec.ts`
   - Depends on: `creator-onboarding`
   - Covers collector dashboard and core collector app navigation

7. **general** - All other independent tests
   - Matches any file not in `testIgnore` list
   - No dependencies
   - Includes: auth, smoke tests, public pages, etc.

## Adding New E2E Tests

### Decision Tree

When creating a new e2e test, follow these rules:

1. **Does the test need an existing CreatorProfile?**
   - ✅ Add to a creator-flow project (or create new dependent project)
   - ❌ Add to `general` project

2. **Does the test create its own data?**
   - ✅ Add to `general` project
   - ❌ Ensure it doesn't conflict with creator-flow tests

3. **Is it part of the creator onboarding flow?**
   - ✅ Add to `creator-onboarding` project (rare - should be minimal)

### Adding Creator-Flow Tests

If you need a new test that requires a CreatorProfile:

```typescript
// playwright.config.ts
{
  name: "creator-subscriptions", // New project name
  testMatch: "e2e/creator-subscriptions.spec.ts",
  dependencies: ["creator-onboarding"], // Must depend on onboarding
  use: { ...devices["Desktop Chrome"] },
}
```

Then add the file to the `testIgnore` list in the `general` project:

```typescript
testIgnore: [
  "e2e/creator-onboarding.spec.ts",
  "e2e/creator-profile.spec.ts",
  "e2e/creator-release.spec.ts",
  "e2e/artwork-upload.spec.ts",
  "e2e/creator-flow.spec.ts",
  "e2e/collector-flow.spec.ts",
  "e2e/creator-subscriptions.spec.ts", // Add new file
],
```

### Adding General Tests

For independent tests (auth, smoke, public pages):

1. Create the file in `e2e/` directory
2. No config changes needed - automatically picked up by `general` project
3. Ensure it doesn't require creator data

## Configuration Details

- **Test execution order**: Respects dependency graph
- **Parallel execution**: Disabled (`fullyParallel: false`) to ensure proper data setup
- **Workers**: Single worker (`workers: 1`) to avoid race conditions
- **Timeout**: 30s per test, 10s for assertions
- **Base URL**: `http://localhost:3003`
- **Storage state**: Uses `playwright/.auth/user.json` for authentication

## Important Constraints

- Creator-flow tests cannot run standalone
- Tests requiring CreatorProfile must depend on `creator-onboarding`
- Only `creator-onboarding` should create the initial CreatorProfile
- General tests must be self-contained and create their own data if needed

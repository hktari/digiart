# E2E Testing Setup

## Single Port Configuration

All development and testing uses **port 3003** only. No dual configuration.

## Workflow

### 1. Start the dev server (Terminal 1)

```bash
pnpm dev
```

This starts Next.js on `http://localhost:3003`

### 2. Seed test data (one time, or when needed)

```bash
pnpm test:seed
```

This creates:

- Test user with CREATOR role
- Admin user
- Subscription cycles
- Auth credentials in `.env.test.local`

### 3. Run e2e tests (Terminal 2)

```bash
pnpm test:e2e
```

## Key Points

- ✅ Single port (3003) for everything
- ✅ No separate test server script
- ✅ Tests expect server already running
- ✅ Simple two-terminal workflow
- ✅ No port conflicts

## Troubleshooting

**Tests timeout:**

- Ensure `pnpm dev` is running on port 3003
- Check server logs for compilation errors

**Auth errors:**

- Run `pnpm test:seed` to regenerate credentials

**Port conflicts:**

- Kill any process on 3003: `fuser -k 3003/tcp`

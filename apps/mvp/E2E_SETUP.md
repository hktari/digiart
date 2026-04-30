# E2E Testing Setup

## Single Port Configuration

All development and testing uses **port 3003** only. No dual configuration.

## Workflow

### 1. Start the dev server (Terminal 1)

```bash
pnpm dev
```

This starts Next.js on `http://localhost:3003`

### 2. Reset + seed test data (before E2E runs)

```bash
pnpm test:reset
```

This resets and creates:

- Test user with CREATOR role
- No-role user
- Seeded collector profile + subscriptions/selections
- Published creator catalog (profiles, releases, tags, artworks)
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

**Auth/data errors:**

- Run `pnpm test:reset` to fully rebuild test data and credentials

**Port conflicts:**

- Kill any process on 3003: `fuser -k 3003/tcp`

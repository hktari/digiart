- use vitest + playwright for testing
- MVP is deployed on Railway

# E2E testing
1. pnpm test:reset          # reset DB + write .env.test.local
2. pnpm test:e2e:server     # start Next.js on port 3003 with test env
3. pnpm test:e2e            # run all Playwright tests

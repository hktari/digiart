#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL_TEST or DATABASE_URL not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function seedTestUser() {
  try {
    const testUserId = randomUUID();
    const sessionToken = randomUUID();

    const user = await db.user.upsert({
      where: { email: "test@example.com" },
      update: {
        id: testUserId,
        name: "Test User",
      },
      create: {
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
      },
    });

    await db.session.deleteMany({ where: { userId: user.id } });

    await db.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await db.userRole.upsert({
      where: { userId_role: { userId: user.id, role: "CREATOR" } },
      create: { userId: user.id, role: "CREATOR" },
      update: {},
    });

    const envContent = `# Auto-generated test user credentials
AUTH_BYPASS_TEST_USER_ID="${user.id}"
TEST_SESSION_TOKEN="${sessionToken}"
`;

    writeFileSync(resolve(__dirname, "../.env.test.local"), envContent);

    console.log("✅ Test user created successfully!");
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Session Token: ${sessionToken}`);
    console.log(`   Role: CREATOR`);
    console.log("");
    console.log("📝 Credentials written to .env.test.local");
    console.log("");
    console.log("🚀 You can now run: pnpm test:e2e");
  } catch (error) {
    console.error("❌ Error seeding test user:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedTestUser();

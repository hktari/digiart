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

    // Create test user
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

    // Create admin user
    const adminUser = await db.user.upsert({
      where: { email: "admin@example.com" },
      create: {
        email: "admin@example.com",
        name: "Admin User",
      },
      update: {},
    });

    await db.userRole.upsert({
      where: { userId_role: { userId: adminUser.id, role: "ADMIN" } },
      create: { userId: adminUser.id, role: "ADMIN" },
      update: {},
    });

    // Create booklet constraint
    const constraint = await db.bookletConstraint.upsert({
      where: { id: "test-constraint-1" },
      create: {
        id: "test-constraint-1",
        minPages: 30,
        maxPages: 50,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    // Create subscription cycles
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Open cycle (current month)
    const openCycle = await db.subscriptionCycle.upsert({
      where: { month_year: { month: currentMonth + 1, year: currentYear } },
      create: {
        label: `${new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} ${currentYear}`,
        month: currentMonth + 1,
        year: currentYear,
        selectionOpenDate: new Date(currentYear, currentMonth, 1),
        lockDate: new Date(currentYear, currentMonth, 23),
        fulfillmentDate: new Date(currentYear, currentMonth + 1, 1),
        status: "OPEN",
      },
      update: {},
    });

    // Locked cycle (next month)
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const lockedCycle = await db.subscriptionCycle.upsert({
      where: { month_year: { month: (nextMonth % 12) + 1, year: nextYear } },
      create: {
        label: `${new Date(nextYear, nextMonth % 12).toLocaleString("default", { month: "long" })} ${nextYear}`,
        month: (nextMonth % 12) + 1,
        year: nextYear,
        selectionOpenDate: new Date(nextYear, nextMonth % 12, 1),
        lockDate: new Date(nextYear, nextMonth % 12, 23),
        fulfillmentDate: new Date(nextYear, (nextMonth % 12) + 1, 1),
        status: "LOCKED",
      },
      update: {},
    });

    const envContent = `# Auto-generated test user credentials
AUTH_BYPASS_TEST_USER_ID="${user.id}"
TEST_SESSION_TOKEN="${sessionToken}"
`;

    writeFileSync(resolve(__dirname, "../.env.test.local"), envContent);

    console.log("✅ Test data seeded successfully!");
    console.log("");
    console.log("👤 Test User:");
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Session Token: ${sessionToken}`);
    console.log(`   Role: CREATOR`);
    console.log("");
    console.log("👑 Admin User:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Role: ADMIN`);
    console.log("");
    console.log("📋 Booklet Constraint:");
    console.log(`   Pages: ${constraint.minPages}-${constraint.maxPages}`);
    console.log(`   Active: ${constraint.isActive}`);
    console.log("");
    console.log("📅 Subscription Cycles:");
    console.log(`   Open: ${openCycle.label} (${openCycle.status})`);
    console.log(`   Locked: ${lockedCycle.label} (${lockedCycle.status})`);
    console.log("");
    console.log("📝 Credentials written to .env.test.local");
    console.log("");
    console.log("🚀 You can now run: pnpm test:e2e");
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedTestUser();

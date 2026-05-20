#!/usr/bin/env node
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  console.error("❌ ADMIN_EMAIL environment variable not set");
  console.error("   Set it to the email address of the platform admin");
  process.exit(1);
}

const PEECHO_ENV = process.env.PEECHO_ENV || "SANDBOX";

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function seedProduction() {
  try {
    console.log("🌱 Seeding production database...");
    console.log("");

    // Create admin user
    const adminUser = await db.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        email: ADMIN_EMAIL!,
        name: "Platform Admin",
      },
      update: {},
    });

    await db.userRole.upsert({
      where: { userId_role: { userId: adminUser.id, role: "ADMIN" } },
      create: { userId: adminUser.id, role: "ADMIN" },
      update: {},
    });

    console.log("✅ Admin user created/verified:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log("");

    // Create initial booklet constraint
    const existingConstraint = await db.bookletConstraint.findFirst({
      where: { isActive: true },
    });

    if (!existingConstraint) {
      const constraint = await db.bookletConstraint.create({
        data: {
          minPages: 30,
          maxPages: 50,
          isActive: true,
          version: 1,
        },
      });

      console.log("✅ Initial booklet constraint created:");
      console.log(`   Pages: ${constraint.minPages}-${constraint.maxPages}`);
      console.log(`   Version: ${constraint.version}`);
      console.log("");
    } else {
      console.log("ℹ️  Booklet constraint already exists (skipped)");
      console.log("");
    }

    // Create POD provider config
    const existingProvider = await db.podProviderConfig.findFirst({
      where: { provider: "Peecho" },
    });

    if (!existingProvider) {
      const provider = await db.podProviderConfig.create({
        data: {
          provider: "Peecho",
          environment: PEECHO_ENV as "SANDBOX" | "PRODUCTION",
          isActive: true,
        },
      });

      console.log("✅ POD provider config created:");
      console.log(`   Provider: ${provider.provider}`);
      console.log(`   Environment: ${provider.environment}`);
      console.log("");
    } else {
      console.log("ℹ️  POD provider config already exists (skipped)");
      console.log("");
    }

    // Create first subscription cycle (next month)
    const now = new Date();
    const nextMonth = now.getMonth() + 1;
    const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
    const cycleMonth = (nextMonth % 12) + 1;

    const existingCycle = await db.subscriptionCycle.findUnique({
      where: { month_year: { month: cycleMonth, year: nextYear } },
    });

    if (!existingCycle) {
      const monthName = new Date(nextYear, nextMonth % 12).toLocaleString(
        "default",
        {
          month: "long",
        },
      );

      const cycle = await db.subscriptionCycle.create({
        data: {
          label: `${monthName} ${nextYear}`,
          month: cycleMonth,
          year: nextYear,
          selectionOpenDate: new Date(nextYear, nextMonth % 12, 1),
          lockDate: new Date(nextYear, nextMonth % 12, 23),
          fulfillmentDate: new Date(nextYear, (nextMonth % 12) + 1, 1),
          status: "OPEN",
        },
      });

      console.log("✅ First subscription cycle created:");
      console.log(`   Label: ${cycle.label}`);
      console.log(`   Lock Date: ${cycle.lockDate.toLocaleDateString()}`);
      console.log(
        `   Fulfillment Date: ${cycle.fulfillmentDate.toLocaleDateString()}`,
      );
      console.log("");
    } else {
      console.log("ℹ️  Subscription cycle already exists (skipped)");
      console.log("");
    }

    console.log("✅ Production database seeded successfully!");
    console.log("");
    console.log("📝 Next steps:");
    console.log(
      "   1. Admin user can sign in with magic link at: /auth/sign-in",
    );
    console.log("   2. Navigate to /admin/pod to sync Peecho offerings");
    console.log("   3. Create additional subscription cycles at /admin/cycles");
    console.log("");
  } catch (error) {
    console.error("❌ Error seeding production database:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedProduction();

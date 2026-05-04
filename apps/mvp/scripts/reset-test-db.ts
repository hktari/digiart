#!/usr/bin/env node
/**
 * Resets the test database to a clean state, then seeds the minimum data
 * needed for E2E tests:
 *  - Creator test user (CREATOR role) + fresh session token
 *  - No-role user + fresh session token
 *  - Published creator catalog for collector flow (profiles, releases, tags)
 *  - Collector subscriptions + selections for seeded collector profile
 *  - BookletConstraint + open SubscriptionCycle
 *
 * User IDs are FIXED (hardcoded below) so AUTH_BYPASS_TEST_USER_ID can live
 * permanently in .env.test and the server never needs a restart after reset.
 * Only the session tokens are written to .env.test.local.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

// Fixed UUIDs — these never change so AUTH_BYPASS_TEST_USER_ID can be
// hardcoded in .env.test and the running server needs no restart after reset.
const CREATOR_USER_ID = "00000000-e2e0-0000-0000-000000000001";
const NO_ROLE_USER_ID = "00000000-e2e0-0000-0000-000000000002";
const SEEDED_COLLECTOR_PROFILE_ID = "00000000-e2e0-0000-0000-000000000101";

async function resetAndSeed() {
  try {
    console.log("🗑  Truncating test data...");

    // Delete in FK-safe order (children first)
    await db.$executeRawUnsafe(`
      TRUNCATE TABLE
        "CollectorReleaseSelection",
        "CollectorCreatorSubscription",
        "ReleaseArtwork",
        "ReleaseTag",
        "GeneratedPrintFile",
        "PricingQuoteSnapshot",
        "Release",
        "Artwork",
        "CreatorSocialLink",
        "CreatorPayoutProfile",
        "CreatorProfile",
        "CollectorProfile",
        "NotificationPreference",
        "EmailNotificationLog",
        "UserRole",
        "Session",
        "Account",
        "VerificationToken",
        "User",
        "Tag",
        "SubscriptionCycle",
        "BookletConstraint"
      CASCADE
    `);

    console.log("✅ Database cleared");

    // ---- Creator test user ------------------------------------------------
    const creatorSessionToken = randomUUID();

    const creatorUser = await db.user.create({
      data: {
        id: CREATOR_USER_ID,
        email: "creator@test.digiart",
        name: "Test Creator",
      },
    });

    await db.session.create({
      data: {
        sessionToken: creatorSessionToken,
        userId: creatorUser.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await db.userRole.create({
      data: { userId: creatorUser.id, role: "CREATOR" },
    });

    // Seed collector profile on the same test user so collector-flow E2E
    // tests can exercise dashboard/navigation without depending on setup APIs.
    // Use raw SQL so this seed stays resilient when Prisma client/schema and DB
    // migration state are temporarily out of sync.
    await db.$executeRawUnsafe(
      `
      INSERT INTO "CollectorProfile"
      ("id", "userId", "displayName", "shippingCountry", "onboardingState", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `,
      SEEDED_COLLECTOR_PROFILE_ID,
      creatorUser.id,
      "E2E Collector",
      "SI",
      "COMPLETE",
    );

    // ---- No-role user (for onboarding tests) ------------------------------
    const noRoleSessionToken = randomUUID();

    const noRoleUser = await db.user.create({
      data: {
        id: NO_ROLE_USER_ID,
        email: "norole@test.digiart",
        name: "No Role User",
      },
    });

    await db.session.create({
      data: {
        sessionToken: noRoleSessionToken,
        userId: noRoleUser.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // ---- Booklet constraint -----------------------------------------------
    await db.bookletConstraint.create({
      data: {
        id: "test-constraint-1",
        minPages: 18,
        maxPages: 500,
        isActive: true,
        version: 1,
      },
    });

    // ---- Open subscription cycle ------------------------------------------
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // lockDate is always 30 days out so the cycle is OPEN whenever tests run
    const lockDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fulfillmentDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

    const openCycle = await db.subscriptionCycle.create({
      data: {
        label: `${now.toLocaleString("default", { month: "long" })} ${year}`,
        month,
        year,
        selectionOpenDate: new Date(year, month - 1, 1),
        lockDate,
        fulfillmentDate,
        status: "OPEN",
      },
    });

    // ---- Published creator catalog for collector flow ---------------------
    const tags = await Promise.all([
      db.tag.create({ data: { name: "Illustration", slug: "illustration" } }),
      db.tag.create({ data: { name: "Abstract", slug: "abstract" } }),
      db.tag.create({ data: { name: "Portrait", slug: "portrait" } }),
    ]);

    const creators = [
      {
        email: "maya@test.digiart",
        name: "Maya Flores",
        slug: "maya-flores",
        bio: "Color-rich abstract and figurative work.",
        sourcePlatform: "Instagram,ArtStation",
        tagSlugs: ["abstract", "illustration"],
      },
      {
        email: "liam@test.digiart",
        name: "Liam Park",
        slug: "liam-park",
        bio: "Editorial-style line work and portraits.",
        sourcePlatform: "Behance",
        tagSlugs: ["portrait", "illustration"],
      },
      {
        email: "nora@test.digiart",
        name: "Nora Kova",
        slug: "nora-kova",
        bio: "Contemporary mixed-media compositions.",
        sourcePlatform: "DeviantArt",
        tagSlugs: ["abstract"],
      },
      {
        email: "elena@test.digiart",
        name: "Elena Novak",
        slug: "elena-novak",
        bio: "Dreamy botanical scenes with layered textures.",
        sourcePlatform: "Instagram",
        tagSlugs: ["illustration", "portrait"],
      },
      {
        email: "tomas@test.digiart",
        name: "Tomas Reed",
        slug: "tomas-reed",
        bio: "Graphic compositions inspired by urban architecture.",
        sourcePlatform: "Behance,ArtStation",
        tagSlugs: ["abstract", "illustration"],
      },
      {
        email: "ivy@test.digiart",
        name: "Ivy Chen",
        slug: "ivy-chen",
        bio: "Character-focused portrait work with bold palettes.",
        sourcePlatform: "DeviantArt,Instagram",
        tagSlugs: ["portrait"],
      },
    ] as const;

    const tagBySlug = Object.fromEntries(tags.map((tag) => [tag.slug, tag.id]));

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      const creatorUserSeed = await db.user.create({
        data: {
          email: creator.email,
          name: creator.name,
          roles: {
            create: {
              role: "CREATOR",
            },
          },
        },
      });

      const creatorProfile = await db.creatorProfile.create({
        data: {
          userId: creatorUserSeed.id,
          slug: creator.slug,
          displayName: creator.name,
          bio: creator.bio,
          sourcePlatform: creator.sourcePlatform,
          status: "PUBLISHED",
        },
      });

      const artworkCount = Math.min(Math.floor(Math.random() * 10) + 3, 10);
      const artworks = await Promise.all(
        Array.from({ length: artworkCount }, (_, n) =>
          db.artwork.create({
            data: {
              creatorProfileId: creatorProfile.id,
              title: `${creator.name} Artwork ${n}`,
              storageKey: `seed/${creator.slug}/artwork-${n}.jpg`,
              mimeType: "image/jpeg",
              width: 1200,
              height: 1600,
              orientation: "PORTRAIT",
              status: "ACTIVE",
            },
          }),
        ),
      );

      const release = await db.release.create({
        data: {
          creatorProfileId: creatorProfile.id,
          cycleId: openCycle.id,
          title: `${creator.name} Monthly Selection`,
          description: `Seeded published release for ${creator.name}.`,
          status: "PUBLISHED",
        },
      });

      await db.releaseArtwork.createMany({
        data: artworks.map((artwork, index) => ({
          releaseId: release.id,
          artworkId: artwork.id,
          sortOrder: index,
        })),
      });

      await db.releaseTag.createMany({
        data: creator.tagSlugs.map((slug) => ({
          releaseId: release.id,
          tagId: tagBySlug[slug],
        })),
      });

      if (i < 2) {
        await db.collectorCreatorSubscription.create({
          data: {
            collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
            creatorProfileId: creatorProfile.id,
            isActive: true,
            entryCreatorId: creatorProfile.id,
          },
        });

        await db.collectorReleaseSelection.create({
          data: {
            collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
            releaseId: release.id,
            cycleId: openCycle.id,
          },
        });
      }
    }

    // ---- Write session tokens to .env.test.local -------------------------
    // IDs are fixed so AUTH_BYPASS_TEST_USER_ID lives in .env.test permanently.
    // Only the rotating session tokens go here.
    const envContent = `# Auto-generated by reset-test-db.ts — DO NOT EDIT MANUALLY
TEST_SESSION_TOKEN="${creatorSessionToken}"
NO_ROLE_SESSION_TOKEN="${noRoleSessionToken}"
`;

    writeFileSync(resolve(__dirname, "../.env.test.local"), envContent);

    console.log("");
    console.log("🌱 Seed complete");
    console.log(`   Creator user:  ${creatorUser.email} (${creatorUser.id})`);
    console.log(`   No-role user:  ${noRoleUser.email} (${noRoleUser.id})`);
    console.log(`   Published creators: ${creators.length}`);
    console.log("   Collector subscriptions: 2");
    console.log("   Cycle: OPEN");
    console.log("   BookletConstraint: 30-50 pages");
    console.log("");
    console.log("📝 Written to .env.test.local (session tokens only)");
    console.log(
      "💡 AUTH_BYPASS_TEST_USER_ID is fixed in .env.test — no server restart needed",
    );
    console.log("🚀 Run: pnpm test:e2e");
  } catch (err) {
    console.error("❌ Reset failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

resetAndSeed();

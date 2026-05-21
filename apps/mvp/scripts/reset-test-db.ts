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
        "FulfillmentOrder",
        "BillingRecord",
        "CheckoutIntent",
        "GeneratedPrintFile",
        "PricingQuoteSnapshot",
        "CreatorPayout",
        "PayoutCalculation",
        "PlatformConfig",
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
        "BookletConstraint",
        "PodOffering",
        "PodProviderConfig"
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

    // ---- Fulfillment countries & states (needed for collector setup form) ---
    await db.$executeRawUnsafe(`
      INSERT INTO "FulfillmentCountry" (code, name, region, "isActive", "syncedAt", "createdAt", "updatedAt")
      VALUES
        ('SI', 'Slovenia',       'EU', true, NOW(), NOW(), NOW()),
        ('GB', 'United Kingdom', 'EU', true, NOW(), NOW(), NOW()),
        ('US', 'United States',  'US', true, NOW(), NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `);

    await db.$executeRawUnsafe(`
      INSERT INTO "FulfillmentState" ("countryCode", "stateCode", name, "isActive", "syncedAt", "createdAt", "updatedAt")
      VALUES
        ('US', 'CA', 'California', true, NOW(), NOW(), NOW()),
        ('US', 'NY', 'New York',   true, NOW(), NOW(), NOW())
      ON CONFLICT ("countryCode", "stateCode") DO NOTHING
    `);

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
      // Additional creators for infinite scroll testing
      {
        email: "alex@test.digiart",
        name: "Alex Rivera",
        slug: "alex-rivera",
        bio: "Digital landscapes and environmental art.",
        sourcePlatform: "ArtStation",
        tagSlugs: ["illustration", "abstract"],
      },
      {
        email: "sam@test.digiart",
        name: "Sam Thompson",
        slug: "sam-thompson",
        bio: "Minimalist geometric compositions.",
        sourcePlatform: "Behance",
        tagSlugs: ["abstract"],
      },
      {
        email: "jordan@test.digiart",
        name: "Jordan Lee",
        slug: "jordan-lee",
        bio: "Traditional portrait paintings with modern twists.",
        sourcePlatform: "Instagram",
        tagSlugs: ["portrait", "illustration"],
      },
      {
        email: "casey@test.digiart",
        name: "Casey Morgan",
        slug: "casey-morgan",
        bio: "Fantasy illustration and concept art.",
        sourcePlatform: "ArtStation,DeviantArt",
        tagSlugs: ["illustration"],
      },
      {
        email: "taylor@test.digiart",
        name: "Taylor Kim",
        slug: "taylor-kim",
        bio: "Abstract expressionism and texture studies.",
        sourcePlatform: "Behance,Instagram",
        tagSlugs: ["abstract", "illustration"],
      },
      {
        email: "morgan@test.digiart",
        name: "Morgan Blake",
        slug: "morgan-blake",
        bio: "Portrait photography and digital manipulation.",
        sourcePlatform: "Instagram",
        tagSlugs: ["portrait"],
      },
      {
        email: "riley@test.digiart",
        name: "Riley Santos",
        slug: "riley-santos",
        bio: "Surrealist digital paintings.",
        sourcePlatform: "DeviantArt",
        tagSlugs: ["illustration", "abstract"],
      },
      {
        email: "quinn@test.digiart",
        name: "Quinn Patel",
        slug: "quinn-patel",
        bio: "Character design and visual storytelling.",
        sourcePlatform: "ArtStation",
        tagSlugs: ["illustration", "portrait"],
      },
      {
        email: "avery@test.digiart",
        name: "Avery Cooper",
        slug: "avery-cooper",
        bio: "Bold abstract compositions with vibrant colors.",
        sourcePlatform: "Behance",
        tagSlugs: ["abstract"],
      },
      {
        email: "skyler@test.digiart",
        name: "Skyler Wright",
        slug: "skyler-wright",
        bio: "Contemporary portrait art with emotional depth.",
        sourcePlatform: "Instagram,ArtStation",
        tagSlugs: ["portrait"],
      },
      {
        email: "dakota@test.digiart",
        name: "Dakota Foster",
        slug: "dakota-foster",
        bio: "Mixed media illustrations exploring nature themes.",
        sourcePlatform: "DeviantArt,Behance",
        tagSlugs: ["illustration", "abstract"],
      },
      {
        email: "reese@test.digiart",
        name: "Reese Bennett",
        slug: "reese-bennett",
        bio: "Modern abstract art with geometric influences.",
        sourcePlatform: "ArtStation",
        tagSlugs: ["abstract", "portrait"],
      },
      {
        email: "hayden@test.digiart",
        name: "Hayden Morris",
        slug: "hayden-morris",
        bio: "Illustrative storytelling through sequential art.",
        sourcePlatform: "Instagram",
        tagSlugs: ["illustration"],
      },
      {
        email: "blake@test.digiart",
        name: "Blake Anderson",
        slug: "blake-anderson",
        bio: "Portrait studies focusing on human emotion.",
        sourcePlatform: "Behance",
        tagSlugs: ["portrait", "illustration"],
      },
      {
        email: "cameron@test.digiart",
        name: "Cameron Ross",
        slug: "cameron-ross",
        bio: "Experimental abstract digital art.",
        sourcePlatform: "DeviantArt",
        tagSlugs: ["abstract"],
      },
      {
        email: "drew@test.digiart",
        name: "Drew Coleman",
        slug: "drew-coleman",
        bio: "Fantasy portraits and character illustrations.",
        sourcePlatform: "ArtStation,Instagram",
        tagSlugs: ["portrait", "illustration"],
      },
      {
        email: "ellis@test.digiart",
        name: "Ellis Bailey",
        slug: "ellis-bailey",
        bio: "Abstract textures and pattern design.",
        sourcePlatform: "Behance,DeviantArt",
        tagSlugs: ["abstract", "illustration"],
      },
      {
        email: "finley@test.digiart",
        name: "Finley Murray",
        slug: "finley-murray",
        bio: "Contemporary portrait and figure studies.",
        sourcePlatform: "Instagram",
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

    // ---- Payout seed data (dev testing of /admin/payouts) ----------------
    // Seeds: PlatformConfig, PayPal profiles on creators, a PAID billing
    // record + SHIPPED fulfillment order for the seeded collector, then
    // PayoutCalculation + PENDING CreatorPayout rows ready to send.

    const podProvider = await db.podProviderConfig.create({
      data: { provider: "Peecho", environment: "SANDBOX", isActive: true },
    });

    const podOffering = await db.podOffering.create({
      data: {
        providerId: podProvider.id,
        externalId: "test-product-1",
        name: "A5 Softcover Booklet",
        minPages: 18,
        maxPages: 500,
        isActive: true,
      },
    });

    await db.platformConfig.create({
      data: { creatorPayoutSplit: 0.7, platformFeeSplit: 0.3 },
    });

    // Give each seeded creator a PayPal payout profile
    const seededCreatorProfiles = await db.creatorProfile.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true },
    });

    for (const profile of seededCreatorProfiles) {
      await db.creatorPayoutProfile.create({
        data: {
          creatorProfileId: profile.id,
          paypalEmail: `${profile.slug}@paypal-test.digiart`,
          isReady: true,
        },
      });
    }

    // Create a frozen PricingQuoteSnapshot for the seeded collector
    const quoteSnapshot = await db.pricingQuoteSnapshot.create({
      data: {
        collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
        cycleId: openCycle.id,
        offeringId: podOffering.id,
        country: "SI",
        requestedPageCount: 32,
        shippingAmount: 3.5,
        productAmount: 12.0,
        taxAmount: 3.1,
        markupAmount: 4.5,
        totalEstimate: 23.1,
        currency: "EUR",
        isFrozen: true,
        frozenAt: new Date(),
      },
    });

    // PAID BillingRecord with realistic order-based pricing fields
    await db.billingRecord.create({
      data: {
        collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
        cycleId: openCycle.id,
        quoteSnapshotId: quoteSnapshot.id,
        amount: 23.1,
        currency: "EUR",
        status: "PAID",
        paidAt: new Date(),
        retailTotalAmount: 23.1,
        wholesaleTotalAmount: 14.6,
        platformMarkupAmount: 4.5,
        peechoOrderId: "test-peecho-order-001",
      },
    });

    // SHIPPED FulfillmentOrder (makes collector eligible for payout)
    const printFile = await db.generatedPrintFile.create({
      data: {
        collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
        cycleId: openCycle.id,
        storageUrl: "https://storage.test/seed/booklet.pdf",
        pageCount: 32,
        status: "READY",
        generatedAt: new Date(),
      },
    });

    await db.fulfillmentOrder.create({
      data: {
        collectorProfileId: SEEDED_COLLECTOR_PROFILE_ID,
        cycleId: openCycle.id,
        generatedPrintFileId: printFile.id,
        quoteSnapshotId: quoteSnapshot.id,
        providerOrderId: "test-peecho-order-001",
        status: "SHIPPED",
        submittedAt: new Date(),
      },
    });

    // PayoutCalculation + PENDING CreatorPayout rows
    // Margin pool = retail - wholesale = 23.1 - 14.6 = 8.5
    // Creator pool (70%) = 5.95, platform fee (30%) = 2.55
    const marginPool = 23.1 - 14.6; // 8.5
    const creatorPoolTotal = marginPool * 0.7; // 5.95

    const payoutCalcSnapshot = {
      payouts: seededCreatorProfiles.map((p) => ({
        creatorId: p.id,
        amount:
          Math.round((creatorPoolTotal / seededCreatorProfiles.length) * 100) /
          100,
        currency: "EUR",
      })),
      totalMarginPool: marginPool,
      totalCreatorPayout: creatorPoolTotal,
      totalPlatformFee: marginPool * 0.3,
      creatorPayoutSplit: 0.7,
      platformFeeSplit: 0.3,
    };

    await db.payoutCalculation.create({
      data: {
        cycleId: openCycle.id,
        totalMarkupPool: creatorPoolTotal,
        totalPaidCollectors: 1,
        totalFulfilledCollectors: 1,
        calculationSnapshot: payoutCalcSnapshot,
      },
    });

    const perCreator =
      Math.round((creatorPoolTotal / seededCreatorProfiles.length) * 100) / 100;

    await db.creatorPayout.createMany({
      data: seededCreatorProfiles.map((profile) => ({
        creatorProfileId: profile.id,
        cycleId: openCycle.id,
        amount: perCreator,
        currency: "EUR",
        status: "PENDING",
      })),
    });

    console.log(
      `   Payout seed: ${seededCreatorProfiles.length} PENDING creator payouts @ €${perCreator} each`,
    );
    console.log(
      `   Margin pool: €${marginPool.toFixed(2)} → creator pool €${creatorPoolTotal.toFixed(2)}`,
    );

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
    console.log(
      `   Published creators: ${creators.length} (24 for infinite scroll testing)`,
    );
    console.log("   Collector subscriptions: 2");
    console.log("   Cycle: OPEN");
    console.log("   BookletConstraint: 18-500 pages");
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

import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";

export interface CreateUserOptions {
  email?: string;
  name?: string;
  roles?: ("CREATOR" | "COLLECTOR" | "ADMIN")[];
}

export async function createTestUser(
  db: PrismaClient,
  options: CreateUserOptions = {},
) {
  const email = options.email ?? faker.internet.email();
  const name = options.name ?? faker.person.fullName();

  const user = await db.user.create({
    data: {
      email,
      name,
      emailVerified: new Date(),
    },
  });

  // Create roles if specified
  if (options.roles && options.roles.length > 0) {
    await db.userRole.createMany({
      data: options.roles.map((role) => ({
        userId: user.id,
        role,
      })),
    });
  }

  return user;
}

export async function createTestCreator(
  db: PrismaClient,
  options: CreateUserOptions & {
    slug?: string;
    displayName?: string;
  } = {},
) {
  const user = await createTestUser(db, {
    ...options,
    roles: [...(options.roles ?? []), "CREATOR"],
  });

  const profile = await db.creatorProfile.create({
    data: {
      userId: user.id,
      slug: options.slug ?? faker.internet.username().toLowerCase(),
      displayName: options.displayName ?? faker.person.fullName(),
      status: "PUBLISHED",
    },
  });

  return { user, profile };
}

export async function createTestCollector(
  db: PrismaClient,
  options: CreateUserOptions & {
    displayName?: string;
    shippingCountry?: string;
  } = {},
) {
  const user = await createTestUser(db, {
    ...options,
    roles: [...(options.roles ?? []), "COLLECTOR"],
  });

  const profile = await db.collectorProfile.create({
    data: {
      userId: user.id,
      displayName: options.displayName ?? faker.person.fullName(),
      shippingCountry: options.shippingCountry ?? "US",
      onboardingState: "COMPLETE",
    },
  });

  return { user, profile };
}

export async function createTestAdmin(
  db: PrismaClient,
  options: CreateUserOptions = {},
) {
  return createTestUser(db, {
    ...options,
    roles: [...(options.roles ?? []), "ADMIN"],
  });
}

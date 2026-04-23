import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export type { Role };

export async function getUserRoles(userId: string): Promise<Role[]> {
  const rows = await db.userRole.findMany({ where: { userId } });
  return rows.map((r) => r.role);
}

export async function hasRole(userId: string, role: Role): Promise<boolean> {
  const row = await db.userRole.findUnique({
    where: { userId_role: { userId, role } },
  });
  return row !== null;
}

export async function addRole(userId: string, role: Role): Promise<void> {
  await db.userRole.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role },
    update: {},
  });
}

export async function removeRole(userId: string, role: Role): Promise<void> {
  await db.userRole.deleteMany({ where: { userId, role } });
}

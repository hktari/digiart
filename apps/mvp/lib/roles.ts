import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }
  const isAdmin = await hasRole(session.user.id, "ADMIN");
  if (!isAdmin) {
    redirect("/");
  }
  return session.user.id;
}

"use server";

import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { addRole, hasRole, removeRole } from "@/lib/roles";

const ROLE_REDIRECT: Record<Role, string> = {
  CREATOR: "/creator/setup",
  COLLECTOR: "/collector/setup",
  ADMIN: "/admin",
};

export async function assignRole(role: Role) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  await addRole(session.user.id, role);
  revalidatePath("/");
  revalidatePath("/account/roles");
  redirect(ROLE_REDIRECT[role]);
}

export async function revokeRole(role: Role) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  await removeRole(session.user.id, role);
  revalidatePath("/");
  revalidatePath("/account/roles");
}

export async function ensureRole(userId: string, role: Role) {
  const has = await hasRole(userId, role);
  if (!has) {
    await addRole(userId, role);
  }
}

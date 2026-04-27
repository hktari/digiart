"use server";

import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_ROLES_COOKIE } from "@/lib/constants/dev";

const VALID_ROLES: Role[] = ["ADMIN", "CREATOR", "COLLECTOR"];

export async function setDevRoles(roles: Role[]): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const cookieStore = await cookies();
  const valid = roles.filter((r) => VALID_ROLES.includes(r));

  if (valid.length === 0) {
    cookieStore.delete(DEV_ROLES_COOKIE);
  } else {
    cookieStore.set(DEV_ROLES_COOKIE, valid.join(","), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  redirect("/");
}

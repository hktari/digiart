"use client";

import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setDevRoles } from "@/lib/actions/dev-auth";

const ROLES: Role[] = ["CREATOR", "COLLECTOR", "ADMIN"];

const ROLE_COLORS: Record<Role, string> = {
  CREATOR: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  COLLECTOR: "bg-ocean-100 text-ocean-800 border-ocean-300",
  ADMIN: "bg-jade-100 text-jade-800 border-jade-300",
};

const ROLE_ACTIVE: Record<Role, string> = {
  CREATOR: "bg-fuchsia-600 text-white border-fuchsia-600",
  COLLECTOR: "bg-ocean-600 text-white border-ocean-600",
  ADMIN: "bg-jade-600 text-white border-jade-600",
};

function getActiveCookieRoles(): Role[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("dev-roles="));
  if (!match) return [];
  return match.split("=")[1].split(",") as Role[];
}

export function DevRoleSwitcher() {
  const [active, setActive] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setActive(getActiveCookieRoles());
  }, []);

  function toggle(role: Role) {
    setActive((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function apply() {
    await setDevRoles(active);
    router.refresh();
  }

  return (
    <div className="fixed bottom-4 right-4 z-9999 font-sans">
      {open ? (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-xl p-4 w-64 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Dev: Role Override
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {ROLES.map((role) => {
              const isActive = active.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggle(role)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    isActive ? ROLE_ACTIVE[role] : ROLE_COLORS[role]
                  }`}
                >
                  <span>{role}</span>
                  <span>{isActive ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={apply}
            className="w-full bg-neutral-900 text-white text-xs font-semibold py-2 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Apply &amp; reload
          </button>
          <p className="text-[10px] text-neutral-400 text-center">
            Sets <code>dev-roles</code> cookie · dev only
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-neutral-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg hover:bg-neutral-700 transition-colors flex items-center gap-1.5"
          title="Dev role switcher"
        >
          <span>🛠</span>
          <span>Roles</span>
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  browse: "Browse",
  creator: "Creator",
  collector: "Collector",
  admin: "Admin",
  account: "Account",
  artworks: "Artworks",
  releases: "Releases",
  profile: "Profile",
  payout: "Payouts",
  share: "Share",
  subscriptions: "Subscriptions",
  pricing: "Pricing",
  "lock-status": "Lock Status",
  setup: "Setup",
  roles: "Roles",
  auth: "Auth",
  "sign-in": "Sign In",
  "sign-up": "Sign Up",
  dashboard: "Dashboard",
  notifications: "Notifications",
  onboarding: "Onboarding",
  creators: "Creators",
  privacy: "Privacy",
  terms: "Terms",
};

export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/creators/")) {
    return null;
  }

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = routeLabels[segment] ?? segment;

          return (
            <Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

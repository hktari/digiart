"use client";

import { usePathname } from "next/navigation";
import { CollectorBookletCart } from "@/components/collector-booklet-cart";

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isCheckout =
    pathname === "/collector/checkout" ||
    pathname.startsWith("/collector/checkout/");

  return (
    <div className="relative">
      <div className={isCheckout ? "" : "lg:pr-80"}>{children}</div>
      {!isCheckout && <CollectorBookletCart />}
    </div>
  );
}

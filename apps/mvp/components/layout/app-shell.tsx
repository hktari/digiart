"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Public funnel pages pitched on social — rendered standalone, without the
// authenticated app chrome (sidebar, breadcrumb, footer).
const BARE_PREFIXES = ["/c/", "/claim/"];

function isBarePath(pathname: string): boolean {
  return BARE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isBarePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BreadcrumbNav />
        </header>
        <div className="flex flex-1 flex-col">
          {children}
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

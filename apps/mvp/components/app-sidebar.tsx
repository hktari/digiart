"use client";

import {
  Eye,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.roles?.includes("ADMIN") ?? false;
  const isCollector = session?.user?.roles?.includes("COLLECTOR") ?? false;
  const isCreator = session?.user?.roles?.includes("CREATOR") ?? false;

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={handleLinkClick}>
                <Image
                  src="/logo.png"
                  alt="Booklet Drops"
                  width={128}
                  height={128}
                  className="size-32 object-contain"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/browse"}>
                <Link href="/browse" onClick={handleLinkClick}>
                  <Eye className="size-4" />
                  <span>Browse</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {(isCreator || isCollector) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/" onClick={handleLinkClick}>
                    <LayoutDashboard className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {isCreator && (
          <SidebarGroup>
            <SidebarGroupLabel>Creator</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/creator")}
                >
                  <Link href="/creator" onClick={handleLinkClick}>
                    <Palette className="size-4" />
                    <span>Creator</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/creator/artworks"}
                    >
                      <Link href="/creator/artworks" onClick={handleLinkClick}>
                        Artworks
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/creator/releases"}
                    >
                      <Link href="/creator/releases" onClick={handleLinkClick}>
                        Releases
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/creator/profile"}
                    >
                      <Link href="/creator/profile" onClick={handleLinkClick}>
                        Profile
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/creator/payout"}
                    >
                      <Link href="/creator/payout" onClick={handleLinkClick}>
                        Payouts
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/creator/share"}
                    >
                      <Link href="/creator/share" onClick={handleLinkClick}>
                        Share
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isCollector && (
          <SidebarGroup>
            <SidebarGroupLabel>Collector</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/collector")}
                >
                  <Link href="/collector" onClick={handleLinkClick}>
                    <ShoppingBag className="size-4" />
                    <span>Collector</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/collector/subscriptions"}
                    >
                      <Link
                        href="/collector/subscriptions"
                        onClick={handleLinkClick}
                      >
                        Subscriptions
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/collector/releases"}
                    >
                      <Link
                        href="/collector/releases"
                        onClick={handleLinkClick}
                      >
                        Releases
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/browse"}
                    >
                      <Link href="/browse" onClick={handleLinkClick}>
                        Browse
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/collector/pricing"}
                    >
                      <Link href="/collector/pricing" onClick={handleLinkClick}>
                        Pricing
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/collector/lock-status"}
                    >
                      <Link
                        href="/collector/lock-status"
                        onClick={handleLinkClick}
                      >
                        Lock status
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/collector/setup"}
                    >
                      <Link href="/collector/setup" onClick={handleLinkClick}>
                        Setup
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin")}
                >
                  <Link href="/admin" onClick={handleLinkClick}>
                    <Settings className="size-4" />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {isAuthenticated ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut()}>
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/auth/sign-in" onClick={handleLinkClick}>
                  <User className="size-4" />
                  <span>Sign in</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <SidebarSeparator />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-sidebar-foreground/70">
            Theme
          </span>
          <ThemeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

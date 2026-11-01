"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  CalendarCheck,
  Award,
  Sparkles,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { href: "/coach", label: "Overview", icon: LayoutDashboard },
  { href: "/coach/players", label: "Players", icon: Users },
  { href: "/coach/sessions", label: "Sessions", icon: CalendarCheck },
  { href: "/coach/matches", label: "Matches", icon: Award },
  { href: "/coach/ready", label: "Ready Board", icon: Sparkles },
];

export function CoachNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/coach" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Trophy className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight">Academy Desk</span>
              <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">
                Dumka Academy
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/coach"
                  ? pathname === "/coach"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-right">
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-foreground">
                {session?.user?.name || "Coach"}
              </span>
              <span className="text-[10px] text-muted-foreground">Dumka Head Coach</span>
            </div>
            <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
              Coach
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            title="Sign Out"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t overflow-x-auto px-2 py-1 gap-1 bg-muted/30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/coach"
              ? pathname === "/coach"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}


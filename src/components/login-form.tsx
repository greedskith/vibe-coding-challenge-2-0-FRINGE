"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid username or password. Check credentials.");
        setLoading(false);
        return;
      }

      // Check session to route to role-specific dashboard
      const session = await getSession();
      const role = (session?.user as any)?.role;

      if (role === "coach") {
        router.push("/coach");
      } else if (role === "player") {
        router.push("/player");
      } else if (role === "scout") {
        router.push("/scout");
      } else {
        router.push("/coach");
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-xl border-border bg-card">
        <CardHeader className="text-center pb-4 pt-6">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Trophy className="size-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Academy Desk
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Dumka Sports Academy • Attendance & Readiness
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-sm font-medium text-foreground block"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="coach, scout, or player username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground block"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-primary text-primary-foreground font-semibold shadow hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Academy</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <div className="pt-4 mt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 text-center">
                Quick Test Credentials
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fillCredentials("coach", "coach123")}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-left hover:bg-accent transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold group-hover:text-primary transition-colors">
                    Coach
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    coach123
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("scout", "scout123")}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-left hover:bg-accent transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold group-hover:text-primary transition-colors">
                    Scout
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    scout123
                  </Badge>
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        Dumka Sports Academy • Role-based access: Coach, Player, Scout
      </div>
    </div>
  );
}

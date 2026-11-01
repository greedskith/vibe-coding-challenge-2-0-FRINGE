"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle, Loader2 } from "lucide-react";

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
      <Card className="shadow-lg border-muted">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Academy Desk
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Dumka Sports Academy • Attendance & Readiness
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. coach, scout, or player name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In to Academy"
              )}
            </Button>

            <div className="pt-4 border-t border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                Quick Test Credentials
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("coach", "coach123")}
                  className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="text-xs font-medium">Coach</span>
                  <Badge variant="secondary" className="text-[10px]">
                    coach123
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("scout", "scout123")}
                  className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-accent transition-colors"
                >
                  <span className="text-xs font-medium">Scout</span>
                  <Badge variant="secondary" className="text-[10px]">
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

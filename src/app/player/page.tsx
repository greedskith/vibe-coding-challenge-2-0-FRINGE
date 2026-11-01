"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, CheckCircle2 } from "lucide-react";

export default function PlayerDashboardPlaceholder() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <User className="size-4" />
          </div>
          <div>
            <span className="font-bold text-sm">Academy Desk</span>
            <span className="text-xs text-muted-foreground ml-2">Player Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold">
            Player: {session?.user?.name || "Player"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  Welcome, {session?.user?.name || "Athlete"}
                </CardTitle>
                <CardDescription>
                  Your individual attendance log and match performance records.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                Phase 1 Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <CheckCircle2 className="size-8 mx-auto mb-2 text-blue-600/60" />
              <p className="font-medium text-foreground">Player Portal Shell Initialized</p>
              <p className="text-xs text-muted-foreground mt-1">
                You will see your personal attendance row, match scores, and readiness status here.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


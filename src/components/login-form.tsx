"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { ArrowRight, Loader2, Lock, User, AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid credentials");
        setLoading(false);
        return;
      }

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
    } catch {
      setError("Connection failed");
      setLoading(false);
    }
  };

  const selectRolePill = (role: "coach" | "scout" | "player") => {
    setActiveRole(role);
    setError(null);
    if (role === "coach") {
      setUsername("coach");
      setPassword("coach123");
    } else if (role === "scout") {
      setUsername("scout");
      setPassword("scout123");
    } else if (role === "player") {
      setUsername("rohit");
      setPassword("rohit123");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Visual Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Academy Desk
          </h1>
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Dumka
        </span>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setActiveRole(null);
              }}
              placeholder="Username"
              required
              autoComplete="username"
              className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setActiveRole(null);
              }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-semibold text-zinc-950 shadow hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>Enter</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Pills */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectRolePill("coach")}
              className={`flex h-10 items-center justify-center rounded-xl border text-xs font-mono transition-colors ${
                activeRole === "coach"
                  ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [ coach ]
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("scout")}
              className={`flex h-10 items-center justify-center rounded-xl border text-xs font-mono transition-colors ${
                activeRole === "scout"
                  ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [ scout ]
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("player")}
              className={`flex h-10 items-center justify-center rounded-xl border text-xs font-mono transition-colors ${
                activeRole === "player"
                  ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [ player ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

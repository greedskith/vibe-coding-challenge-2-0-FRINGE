"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { ArrowRight, Loader2, Lock, User, AlertCircle, Trophy } from "lucide-react";

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
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Visual Header */}
      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-lg w-fit">
        <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
          <Trophy className="size-4 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            Academy Desk
          </h1>
          <p className="text-[11px] text-zinc-400 font-mono">One Academy</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/92 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setActiveRole(null);
                }}
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-base sm:text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setActiveRole(null);
                }}
                required
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-base sm:text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 font-semibold text-xs uppercase tracking-wide text-zinc-950 shadow hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Role Pills */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectRolePill("coach")}
              className={`flex h-9 items-center justify-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                activeRole === "coach"
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100 font-semibold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              coach
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("scout")}
              className={`flex h-9 items-center justify-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                activeRole === "scout"
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100 font-semibold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              scout
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("player")}
              className={`flex h-9 items-center justify-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                activeRole === "player"
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100 font-semibold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

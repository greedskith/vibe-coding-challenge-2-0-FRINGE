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
      <div className="flex items-center gap-2.5 rounded-md border-2 border-amber-300/80 bg-zinc-950 px-3.5 py-2 shadow-[3px_3px_0px_0px_#f59e0b] w-fit">
        <div className="flex size-8 items-center justify-center rounded-sm border border-amber-400/60 bg-amber-950/40 text-amber-400">
          <Trophy className="size-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent uppercase font-mono">
            Academy Desk
          </h1>
          <p className="text-[10px] text-amber-500/80 font-mono tracking-wider font-semibold">ONE ACADEMY</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="rounded-md border-2 border-zinc-100 bg-zinc-950 p-6 sm:p-7 shadow-[6px_6px_0px_0px_#ffffff]">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-sm bg-red-950/60 border-2 border-red-500 p-3 text-xs text-red-200 font-mono">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-medium">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
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
                className="h-10 w-full rounded-sm border-2 border-zinc-700 bg-zinc-900/90 pl-10 pr-3 text-sm text-zinc-100 font-mono focus:border-zinc-100 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
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
                className="h-10 w-full rounded-sm border-2 border-zinc-700 bg-zinc-900/90 pl-10 pr-3 text-sm text-zinc-100 font-mono focus:border-zinc-100 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border-2 border-amber-300 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 font-black text-xs uppercase tracking-wider text-zinc-950 shadow-[3px_3px_0px_0px_#b45309] hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 mt-3"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin text-zinc-950" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Role Pills */}
        <div className="mt-6 pt-4 border-t-2 border-zinc-800">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2.5">Quick Select</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectRolePill("coach")}
              className={`flex h-9 items-center justify-center rounded-sm text-xs font-mono transition-all cursor-pointer uppercase tracking-wider ${
                activeRole === "coach"
                  ? "border-2 border-zinc-100 bg-zinc-100 text-zinc-950 font-bold shadow-[2px_2px_0px_0px_#ffffff]"
                  : "border-2 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white"
              }`}
            >
              coach
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("scout")}
              className={`flex h-9 items-center justify-center rounded-sm text-xs font-mono transition-all cursor-pointer uppercase tracking-wider ${
                activeRole === "scout"
                  ? "border-2 border-zinc-100 bg-zinc-100 text-zinc-950 font-bold shadow-[2px_2px_0px_0px_#ffffff]"
                  : "border-2 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white"
              }`}
            >
              scout
            </button>
            <button
              type="button"
              onClick={() => selectRolePill("player")}
              className={`flex h-9 items-center justify-center rounded-sm text-xs font-mono transition-all cursor-pointer uppercase tracking-wider ${
                activeRole === "player"
                  ? "border-2 border-zinc-100 bg-zinc-100 text-zinc-950 font-bold shadow-[2px_2px_0px_0px_#ffffff]"
                  : "border-2 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white"
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

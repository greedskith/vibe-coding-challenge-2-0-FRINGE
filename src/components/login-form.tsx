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
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-xl shadow-lg ring-1 ring-white/5 w-fit">
        <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
          <Trophy className="size-4 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">
            Academy Desk
          </h1>
          <p className="text-[10px] text-zinc-400 font-mono tracking-wider">ONE ACADEMY</p>
        </div>
      </div>

      {/* Floating Minimal Glass Login Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6 sm:p-7 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
        {/* Quick Role Segmented Switcher */}
        <div className="mb-5 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80 grid grid-cols-3 gap-1">
          {(["coach", "scout", "player"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => selectRolePill(role)}
              className={`h-8 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                activeRole === role
                  ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-300">
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium block">Username</label>
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
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:bg-zinc-900/90 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-300 font-medium block">Password</label>
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
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:bg-zinc-900/90 focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 font-semibold text-xs tracking-wide text-zinc-950 hover:bg-white active:scale-[0.985] transition-all cursor-pointer disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

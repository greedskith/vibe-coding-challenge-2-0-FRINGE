import { LoginForm } from "@/components/login-form";
import { P5ArtBackground } from "@/components/p5-art-background";

export const metadata = {
  title: "Sign In — Academy Desk",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh w-full flex flex-col justify-center items-center px-4 py-8 overflow-hidden text-zinc-50">
      {/* Generative P5.js shuffling art background */}
      <P5ArtBackground />

      {/* Optical lens vignette with subtle gold atmosphere */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-[1] bg-radial from-amber-500/5 via-zinc-950/20 to-zinc-950/65"
      />

      {/* Login container placed above the artwork */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <LoginForm />
      </div>
    </main>
  );
}

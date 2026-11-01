import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Desk — Dumka",
};

export default function LoginPage() {
  return (
    <main className="min-h-dvh max-w-md mx-auto flex flex-col justify-center px-4 py-8 bg-zinc-950 text-zinc-50">
      <LoginForm />
    </main>
  );
}

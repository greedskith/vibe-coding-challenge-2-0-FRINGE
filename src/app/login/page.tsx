import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign In — Academy Desk",
};

export default function LoginPage() {
  return (
    <main className="min-h-dvh w-full flex flex-col justify-center items-center px-4 py-8 bg-zinc-950 text-zinc-50">
      <LoginForm />
    </main>
  );
}

import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Login — Academy Desk Dumka",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-muted/50 to-background">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}

import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign In — Academy Desk Dumka",
  description: "Sign in to Dumka Sports Academy Desk.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}

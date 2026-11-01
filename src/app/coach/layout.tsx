import { CoachNav } from "@/components/coach-nav";

export const metadata = {
  title: "Coach Dashboard — Academy Desk Dumka",
};

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <CoachNav />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}


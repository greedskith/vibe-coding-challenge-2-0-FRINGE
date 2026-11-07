import { P5ArtBackground } from "@/components/p5-art-background";

export const metadata = {
  title: "Coach — Academy Desk",
};

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden text-zinc-50">
      {/* Generative ambient p5 art background */}
      <P5ArtBackground mode="ambient" shapeCount={360} opacityMultiplier={0.7} />

      {/* Deep vignette scrim for contrast and zero clash */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-[1] bg-radial from-zinc-950/70 via-zinc-950/85 to-zinc-950/95"
      />

      {/* Main interactive content above artwork */}
      <div className="relative z-10 w-full min-h-dvh">
        {children}
      </div>
    </div>
  );
}

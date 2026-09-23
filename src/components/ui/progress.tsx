import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  tone = "gold",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "gold" | "teal" | "rose";
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  const bar =
    tone === "teal" ? "bg-teal" : tone === "rose" ? "bg-rose" : "bg-gold";

  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/8", className)}>
      <div className={cn("h-full rounded-full", bar)} style={{ width: `${width}%` }} />
    </div>
  );
}

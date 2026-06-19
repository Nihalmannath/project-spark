import type { ReactNode } from "react";
import { LABELS, type LabelKey } from "@/data/labels";
import { cn } from "@/lib/utils";

export function LabelBadge({ label, className }: { label: LabelKey; className?: string }) {
  const def = LABELS[label];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        borderColor: def.color,
        color: def.color,
        backgroundColor: `${def.color}10`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: def.color }}
      />
      {def.name}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-5",
        emphasis && "border-foreground/40",
      )}
    >
      <p className="smallcaps text-[10px] text-muted-foreground">{label}</p>
      <p className="metric-num mt-2 text-3xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      {eyebrow && (
        <p className="smallcaps text-[11px] text-accent">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-serif text-3xl font-medium text-foreground md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export function KeyValueRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="hairline-bottom grid grid-cols-3 gap-4 py-3 last:border-b-0">
      <dt className="smallcaps col-span-1 text-[10px] text-muted-foreground">
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="hairline-bottom bg-background">
      <div className="mx-auto max-w-6xl px-6 pb-14 pt-16">
        <p className="smallcaps text-[11px] text-accent">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-[1.1] text-foreground md:text-5xl">
          {title}
        </h1>
        {lede && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {lede}
          </p>
        )}
      </div>
    </header>
  );
}

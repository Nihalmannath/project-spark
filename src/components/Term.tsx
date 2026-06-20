import { type ReactNode } from "react";

/**
 * Layered-tone helper: shows a research term with a dotted underline; hovering
 * reveals a plain-language explanation. Keeps the UI deep but readable.
 */
export function Term({ children, explain }: { children: ReactNode; explain: string }) {
  return (
    <span className="group relative cursor-help border-b border-dotted border-foreground/50">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-sm border border-border bg-[#15191f] px-3 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {explain}
      </span>
    </span>
  );
}

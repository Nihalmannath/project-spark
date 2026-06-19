import { useTransfer, verdictTone, buildAudit } from "../lib/transfer-context";

export function TransferConnector({ compact = false }: { compact?: boolean }) {
  const { source, target } = useTransfer();
  const audit = buildAudit(source, target);
  const tone = verdictTone(audit.verdict);

  return (
    <div className={`flex items-center gap-3 ${compact ? "text-[10px]" : "text-[11px]"}`}>
      <div className="flex flex-col leading-tight">
        <span className="smallcaps text-[9px] text-muted-foreground">Source model</span>
        <span className="font-serif text-foreground">{source.training_city}</span>
      </div>
      <svg width="46" height="14" viewBox="0 0 46 14" className="text-foreground/60">
        <line x1="2" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <path d="M40 3 L44 7 L40 11 Z" fill="currentColor" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="smallcaps text-[9px] text-muted-foreground">Target city</span>
        <span className="font-serif text-foreground">{target ? target.display_name : "— not selected —"}</span>
      </div>
      <div className="ml-2 flex items-center gap-1.5 rounded-sm border border-border bg-[color:var(--color-muted)] px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
        <span className="smallcaps text-[9px] text-foreground">{tone.label}</span>
      </div>
    </div>
  );
}

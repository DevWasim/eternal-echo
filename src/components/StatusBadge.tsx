import type { ProcessingStatus } from "@/types";

const labels: Record<ProcessingStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  ready: "Ready to Chat",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: ProcessingStatus }) {
  return (
    <span className="inline-flex items-center rounded-full border border-echo-gold/25 bg-echo-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-echo-gold">
      {labels[status]}
    </span>
  );
}

import type { Ancestor } from "@/types";

export function ConversationStarters({
  ancestor,
  onPick,
}: {
  ancestor: Ancestor;
  onPick: (starter: string) => void;
}) {
  const starters = [
    `Ask ${ancestor.name} about their childhood in ${ancestor.origin_city ?? "their hometown"}`,
    `Ask about their marriage and the advice they would give now`,
    `Ask for ${ancestor.nickname ?? ancestor.name}'s guidance on a hard decision`,
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {starters.map((starter) => (
        <button
          key={starter}
          type="button"
          onClick={() => onPick(starter)}
          className="rounded-full border border-echo-cream/10 bg-white/[0.04] px-4 py-2 text-left text-sm text-echo-cream/75 transition hover:border-echo-gold/40 hover:text-echo-cream"
        >
          {starter}
        </button>
      ))}
    </div>
  );
}

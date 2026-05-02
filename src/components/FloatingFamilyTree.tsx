const nodes = [
  "left-[12%] top-[18%] h-24 w-24 delay-0",
  "left-[28%] top-[62%] h-16 w-16 delay-300",
  "left-[76%] top-[24%] h-20 w-20 delay-700",
  "left-[66%] top-[72%] h-28 w-28 delay-1000",
  "left-[46%] top-[42%] h-14 w-14 delay-500",
  "left-[86%] top-[48%] h-12 w-12 delay-200",
];

export function FloatingFamilyTree() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,110,0.14),transparent_34%),radial-gradient(circle_at_70%_75%,rgba(232,221,209,0.08),transparent_32%)]" />
      {nodes.map((node) => (
        <div
          key={node}
          className={`family-node absolute rounded-full border border-echo-gold/20 bg-echo-cream/5 ${node}`}
        />
      ))}
      <div className="absolute left-[18%] top-[31%] h-px w-[64%] rotate-12 bg-gradient-to-r from-transparent via-echo-gold/20 to-transparent" />
      <div className="absolute left-[26%] top-[56%] h-px w-[48%] -rotate-12 bg-gradient-to-r from-transparent via-echo-cream/10 to-transparent" />
    </div>
  );
}

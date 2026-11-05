import { cn } from "@/lib/utils";

// Paths match markInner in scripts/generate-brand-assets.mjs.
const POINTS = [
  [15, 20],
  [45, 14],
  [50, 44],
  [20, 50],
];

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Landlord"
    >
      <rect width="64" height="64" rx="16" fill="#164B3F" />
      <path
        d="M15 20 45 14 50 44 20 50Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M27 24v15h12"
        fill="none"
        stroke="#D9F279"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#D9F279" stroke="#164B3F" strokeWidth="2">
        {POINTS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
        ))}
      </g>
    </svg>
  );
}

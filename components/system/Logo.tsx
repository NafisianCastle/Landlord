import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Landlord"
    >
      <rect width="64" height="64" rx="17" fill="#164B3F" />
      <path
        d="M17 23 43 16 49 42 23 49Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M28 25v13h11"
        fill="none"
        stroke="#D9F279"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#D9F279">
        <circle cx="17" cy="23" r="3" />
        <circle cx="43" cy="16" r="3" />
        <circle cx="49" cy="42" r="3" />
        <circle cx="23" cy="49" r="3" />
      </g>
    </svg>
  );
}

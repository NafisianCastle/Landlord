import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Landlord"
    >
      <rect width="512" height="512" rx="96" fill="#15803d" />
      <path
        d="M138 196 L378 158 L402 330 L162 372 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="26"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="138" cy="196" r="16" fill="#ffffff" />
      <circle cx="378" cy="158" r="16" fill="#ffffff" />
      <circle cx="402" cy="330" r="16" fill="#ffffff" />
      <circle cx="162" cy="372" r="16" fill="#ffffff" />
    </svg>
  );
}

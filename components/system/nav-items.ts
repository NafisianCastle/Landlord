import { LayoutDashboard, Map, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plots", label: "Plots", icon: Map },
  { href: "/profile", label: "Profile", icon: User },
] as const;

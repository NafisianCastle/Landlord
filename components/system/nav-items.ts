import { LayoutDashboard, Map, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/plots", key: "plots", icon: Map },
  { href: "/profile", key: "profile", icon: User },
] as const;

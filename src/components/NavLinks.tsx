"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/compare", label: "Compare" },
  { href: "/agents", label: "Agents" },
  { href: "/how-it-works", label: "How It Works" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link key={href} href={href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={isActive ? "font-semibold" : ""}
            >
              {label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

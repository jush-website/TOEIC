"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";

const LINKS = [
  { href: "/", label: "總覽" },
  { href: "/vocab", label: "單字庫" },
  { href: "/flashcards", label: "單字卡" },
  { href: "/quiz", label: "測驗" },
];

export function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-10 border-b border-line/70 bg-ink/80 px-5 py-4 backdrop-blur-md">
      <nav className="flex items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="display text-xl font-semibold tracking-tight text-cream">
            多益<span className="text-gold">神器</span>
          </span>
          <span className="display hidden text-xs italic text-muted sm:inline">
            TOEIC&nbsp;Master
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ul className="flex items-center gap-1 text-sm">
            {LINKS.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      active
                        ? "bg-gold/15 font-semibold text-gold"
                        : "text-cream-dim hover:bg-panel-2 hover:text-cream"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}

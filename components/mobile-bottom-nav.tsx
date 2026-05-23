"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, FileText, Home, Search, UserCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";

type NavKey = "home" | "search" | "portfolio" | "report" | "mypage";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { key: "home", label: "홈", href: "/", icon: Home },
  { key: "search", label: "검색", href: "/#home-search", icon: Search },
  { key: "portfolio", label: "보유", href: "/portfolio", icon: BriefcaseBusiness },
  { key: "report", label: "리포트", href: "/portfolio#portfolio-report", icon: FileText },
  { key: "mypage", label: "내 계정", href: "/mypage", icon: UserCircle2 }
];

function getHash() {
  if (typeof window === "undefined") return "";
  return window.location.hash;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(getHash());
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, []);

  const activeKey = useMemo<NavKey>(() => {
    if (pathname === "/") {
      return hash.includes("home-search") ? "search" : "home";
    }
    if (pathname.startsWith("/portfolio")) {
      return hash.includes("portfolio-report") || hash.includes("reports")
        ? "report"
        : "portfolio";
    }
    if (pathname.startsWith("/mypage")) return "mypage";
    return "home";
  }, [hash, pathname]);

  const safeItems = Array.isArray(navItems) ? navItems : [];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0px)] pt-2 backdrop-blur dark:border-dark-line dark:bg-slate-950/95 md:hidden"
      aria-label="모바일 하단 내비게이션"
    >
      <ul className="grid grid-cols-5 gap-1">
        {safeItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md px-1 py-1 text-[11px] font-bold ${
                  isActive
                    ? "text-brand"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-brand" : ""}`} />
                <span className="mt-0.5 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

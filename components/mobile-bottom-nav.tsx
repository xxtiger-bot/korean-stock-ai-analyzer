"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, FileText, Home, Search, UserCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type NavKey = "home" | "search" | "portfolio" | "report" | "mypage";

type NavItem = {
  key: NavKey;
  label: string;
  path: string;
  hash?: string;
  sectionId?: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { key: "home", label: "홈", path: "/", icon: Home },
  { key: "search", label: "검색", path: "/", hash: "search", sectionId: "search", icon: Search },
  { key: "portfolio", label: "보유", path: "/portfolio", icon: BriefcaseBusiness },
  {
    key: "report",
    label: "리포트",
    path: "/portfolio",
    hash: "reports",
    sectionId: "reports",
    icon: FileText
  },
  { key: "mypage", label: "내 계정", path: "/mypage", icon: UserCircle2 }
];

function getHash() {
  if (typeof window === "undefined") return "";
  return window.location.hash;
}

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [isSearchSectionActive, setIsSearchSectionActive] = useState(false);
  const [isReportSectionActive, setIsReportSectionActive] = useState(false);

  useEffect(() => {
    const updateHash = () => setHash(getHash());
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const evaluateSection = (sectionId: string) => {
      const section = window.document.getElementById(sectionId);
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      const anchorY = 120;
      return rect.top <= anchorY && rect.bottom >= anchorY;
    };

    const updateActiveSections = () => {
      if (pathname === "/") {
        setIsSearchSectionActive(evaluateSection("search"));
      } else {
        setIsSearchSectionActive(false);
      }

      if (pathname.startsWith("/portfolio")) {
        setIsReportSectionActive(evaluateSection("reports"));
      } else {
        setIsReportSectionActive(false);
      }
    };

    updateActiveSections();
    window.addEventListener("scroll", updateActiveSections, { passive: true });
    window.addEventListener("resize", updateActiveSections);
    return () => {
      window.removeEventListener("scroll", updateActiveSections);
      window.removeEventListener("resize", updateActiveSections);
    };
  }, [pathname]);

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") return false;
    const target = window.document.getElementById(sectionId);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  const setLocationHash = (nextHash: string) => {
    if (typeof window === "undefined") return;
    const normalizedHash = nextHash.startsWith("#") ? nextHash : `#${nextHash}`;
    window.history.replaceState(null, "", `${pathname}${normalizedHash}`);
    setHash(normalizedHash);
    window.dispatchEvent(new Event("hashchange"));
  };

  const handleSearchNavigation = () => {
    if (pathname !== "/") {
      router.push("/#search");
      return;
    }
    const scrolled = scrollToSection("search");
    if (scrolled) {
      setLocationHash("#search");
      return;
    }
    router.push("/");
  };

  const handleReportNavigation = () => {
    if (!pathname.startsWith("/portfolio")) {
      router.push("/portfolio#reports");
      return;
    }
    setLocationHash("#reports");
    const scrolled = scrollToSection("reports");
    if (!scrolled) {
      router.push("/portfolio");
    }
  };

  const handleHomeNavigation = () => {
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", "/");
      setHash("");
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  const handleItemClick = (item: NavItem) => {
    if (item.key === "home") {
      handleHomeNavigation();
      return;
    }
    if (item.key === "search") {
      handleSearchNavigation();
      return;
    }
    if (item.key === "report") {
      handleReportNavigation();
      return;
    }
    router.push(item.path);
  };

  const activeKey = useMemo<NavKey>(() => {
    if (pathname === "/") {
      return hash.includes("search") || isSearchSectionActive ? "search" : "home";
    }
    if (pathname.startsWith("/portfolio")) {
      return hash.includes("reports") || isReportSectionActive
        ? "report"
        : "portfolio";
    }
    if (pathname.startsWith("/mypage")) return "mypage";
    return "home";
  }, [hash, isReportSectionActive, isSearchSectionActive, pathname]);

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
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md px-1 py-1 text-[11px] font-bold ${
                  isActive
                    ? "text-brand"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-brand" : ""}`} />
                <span className="mt-0.5 truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

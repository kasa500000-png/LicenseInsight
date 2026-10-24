"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const destinations = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/calendar", label: "일정", icon: "calendar" },
  { href: "/compare", label: "비교", icon: "compare" },
  { href: "/my-plan", label: "내 준비", icon: "plan" },
] as const;

function NavigationIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {name === "home" ? <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-8h6v8" /></>
      : name === "calendar" ? <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2" /></>
        : name === "compare" ? <><path d="M12 3v18M3 8h6m-3-3 3 3-3 3m15 5h-6m3-3-3 3 3 3" /></>
          : <><rect x="5" y="4" width="15" height="17" rx="2" /><path d="M9 3v3m6-3v3M9 11h7m-7 4h5M3 7v11" /></>}
  </svg>;
}

export function SiteNavigation({ placement }: { placement: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (placement !== "mobile" || !ref.current) return;
    const element = ref.current;
    const update = () => document.documentElement.style.setProperty("--bottom-nav-total", `${element.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--bottom-nav-total"); };
  }, [placement]);
  return <nav ref={ref} className={`site-nav site-nav-${placement}`} aria-label={placement === "mobile" ? "모바일 메뉴" : "주요 메뉴"}>
    {destinations.map(item => <Link key={item.href} href={item.href} prefetch={false}
      aria-current={pathname === item.href ? "page" : undefined}>
      <NavigationIcon name={item.icon} /><span>{item.label}</span>
    </Link>)}
  </nav>;
}

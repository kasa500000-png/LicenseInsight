import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/server/env";
import { SiteNavigation } from "@/components/site-navigation";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: env.siteUrl,
  title: "자격인사이트 | 국가자격 정보와 준비의 시작",
  description: "국가자격의 공식 일정과 통계를 바탕으로 준비를 돕는 자격인사이트입니다.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">본문으로 바로가기</a>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/" aria-label="자격인사이트 홈">
              <span className="brand-mark" aria-hidden="true">자</span>
              자격인사이트
            </Link>
            <SiteNavigation placement="desktop" />
          </div>
        </header>
        <main className="container main-content" id="main-content" tabIndex={-1}>{children}</main>
        <footer className="container site-footer">
          <p>자격인사이트는 비공식 정보 서비스입니다.</p>
          <p>최종 일정과 접수 기준은 시행기관의 공식 안내를 확인해 주세요.</p>
        </footer>
        <SiteNavigation placement="mobile" />
      </body>
    </html>
  );
}

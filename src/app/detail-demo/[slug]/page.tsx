import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/server/env";
import { DETAIL_DEMO_SLUG, parseDemoScenario } from "@/features/qualification-detail/demo-policy";
import { createQualificationDetailService } from "@/features/qualification-detail/service";
import { QualificationDetailView } from "@/features/qualification-detail/detail-view";
import { createSyntheticDetailFixture, demoClock } from "../../../../tests/fixtures/synthetic/detail/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "합성 상세 검증실 | 자격인사이트", robots: { index: false, follow: false } };

export default async function DetailDemoPage({ params, searchParams }: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  if (env.appEnv !== "local" && env.appEnv !== "test") notFound();
  const { slug } = await params;
  if (slug !== DETAIL_DEMO_SLUG) notFound();
  const query = await searchParams;
  const scenario = parseDemoScenario(query.scenario);
  const fixture = createSyntheticDetailFixture(scenario);
  // Request-scoped reads only. No live credentials, remote query, or module-level cache.
  const service = createQualificationDetailService(fixture.repository, { mode: "synthetic", eventYears: [2026, 2027], statisticsYears: [2024, 2025, 2026], syntheticEvidence: fixture.evidence });
  const result = await service.loadDetail(slug, demoClock);
  if (result.kind !== "ok") return <p role="alert">합성 상세 자료를 읽지 못했습니다.</p>;
  const year = ["2024", "2025", "2026"].includes(String(query.year)) ? Number(query.year) : 2025;
  const stage = query.stage === "practical" ? "practical" : "written";
  return <QualificationDetailView model={result.value} selectedYear={year} selectedStage={stage} scenario={scenario} />;
}

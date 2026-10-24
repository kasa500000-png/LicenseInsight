import { ActionLink, Alert, Badge, Button } from "@/components/ui/primitives";
import { DataTable, FreshnessNotice, NextActionCard, ScheduleRow, SourceStamp } from "@/components/ui/data-display";
import type { ProvenanceDto } from "@/data/repositories/public-repository";
import type { DetailEvent, DetailModel } from "./model";
import { DetailStatistics } from "./statistics-section";
import { DETAIL_DEMO_PATH, type DetailDemoScenario } from "./demo-policy";
import styles from "./detail-view.module.css";

const stageNames = { written: "필기", practical: "실기" } as const;
const eventNames = { registration: "접수", exam: "시험", result: "합격 발표", document_submission: "서류 제출" } as const;
const timeFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

function eventLabel(row: DetailEvent): string {
  const name = eventNames[row.source.eventType];
  const subtype = row.source.eventType === "registration" ? { ordinary: "일반 접수", additional: "추가 접수", vacancy: "빈자리 접수", unknown: "유형 미확인 접수" }[row.source.subtype] : name;
  return subtype;
}
function dateLabel(row: DetailEvent): string {
  const { evaluation: value } = row;
  if (value.temporalPrecision === "datetime" && value.startsAt && value.endsAt) {
    return `${timeFormatter.format(Date.parse(value.startsAt))} – ${timeFormatter.format(Date.parse(value.endsAt))} (한국시간)`;
  }
  return `${value.dateStart}${value.dateEnd !== value.dateStart ? ` – ${value.dateEnd}` : ""} · 시각 미제공`;
}
function stateLabel(row: DetailEvent): string {
  switch (row.evaluation.state) {
    case "STALE": return "갱신 지연 · 재확인 필요";
    case "PENDING_CHANGE": return "변경 확인 중";
    case "UNVERIFIED": return "검증 미완료";
    case "ENDED": return "종료";
    case "DATE_ONLY_START_DAY": return "시작일 · 시각 미확인";
    case "DATE_ONLY_END_DAY": return "종료일 · 시각 미확인";
    case "DATE_ONLY_SINGLE_DAY": return "해당일 · 시각 미확인";
    case "DATE_ONLY_PERIOD": return "기간 내 · 시각 미확인";
    case "WITHIN_KNOWN_INTERVAL": return "안내된 시간 구간 내";
    case "UPCOMING": return "예정";
    default: return "상태 확인 필요";
  }
}
function Source({ row, synthetic }: Readonly<{ row: ProvenanceDto; synthetic: boolean }>) {
  return <SourceStamp sourceName={synthetic ? "합성 레코드 · 공식 출처 아님" : "공식 제공기관"} sourceUrl={synthetic ? undefined : row.sourceUrl}
    periodLabel={row.dataAsOf ?? "기준 시점 미확인"} publishedAt={row.sourcePublishedAt} collectedAt={row.fetchedAt} validatedAt={row.validatedAt} reviewedAt={row.reviewedAt} />;
}
function Event({ row, synthetic }: Readonly<{ row: DetailEvent; synthetic: boolean }>) {
  const notices = [
    row.source.temporalPrecision === "date" ? "접수 가능 시각·마감 시각을 알 수 없습니다." : "접수 가능 여부와 잔여 좌석을 보장하지 않습니다.",
    row.source.eventType === "exam" && row.source.extent === "range" ? "시험 기간입니다. 개인별 시험일이 확정된 값은 아닙니다." : "",
    row.warnings.includes("HOLIDAYS_AND_EXCEPTIONS_REQUIRE_CHECK") ? "휴일·예외 일정은 공식 안내를 확인해 주세요." : "",
    row.warnings.includes("PERSONAL_ELIGIBILITY_REQUIRES_CHECK") ? "개인 응시자격은 공식 안내에서 별도로 확인해 주세요." : "",
  ].filter(Boolean).join(" ");
  return <div data-testid="detail-event" data-event-id={row.source.id} data-state={row.evaluation.state}>
    <ScheduleRow name={`${row.source.year}년 ${row.source.round}회 · ${eventLabel(row)}`} stage={row.source.stage} eventType={eventLabel(row)} dateLabel={dateLabel(row)} statusLabel={stateLabel(row)} notice={notices}
      source={<details><summary>이 일정의 출처·확인 시각</summary><Source row={row.source} synthetic={synthetic} /></details>} />
  </div>;
}
function NextEvent({ row, stage }: Readonly<{ row: DetailEvent | null; stage: "written" | "practical" }>) {
  return <NextActionCard title={`${stageNames[stage]} · ${row ? eventLabel(row) : "공식 안내 재확인"}`}
    description={row ? <><p>{dateLabel(row)}</p><p>{row.evaluation.countdown ? `${row.evaluation.countdown.days === 0 ? "D-Day" : `D-${row.evaluation.countdown.days}`} · ${stateLabel(row)}` : stateLabel(row)}</p><p>접수 가능·잔여 좌석을 뜻하지 않습니다.</p></> : <p>검증·갱신 상태 또는 일정 부족으로 다음 행동을 제안하지 않습니다.</p>}
    action={<ActionLink href="https://www.q-net.or.kr/" target="_blank" variant="secondary">Q-Net 공식 안내 확인 ↗</ActionLink>} />;
}

export function QualificationDetailView({ model, selectedYear, selectedStage, scenario }: Readonly<{
  model: DetailModel; selectedYear: number; selectedStage: "written" | "practical"; scenario: DetailDemoScenario;
}>) {
  const synthetic = model.mode === "synthetic";
  const group = model.statistics.groups.find(row => row.year === selectedYear && row.stage === selectedStage);
  const statusKnown = model.statuses.state === "available" && model.statuses.paginationComplete
    && ["qualifications", "events", "statistics", "details"].every(type => model.statuses.rows.some(row => row.datasetType === type));
  const fresh = statusKnown && model.statuses.rows.every(row => row.freshness === "fresh");
  const stale = model.statuses.rows.some(row => row.freshness === "stale");
  const pending = model.statuses.rows.some(row => row.pendingChange || row.verification !== "verified");
  const unsupported = model.statuses.rows.some(row => row.datasetType === "details" && row.availability === "unavailable");
  const status = model.statistics.state === "unavailable" || !group && !model.statistics.paginationComplete ? "error" : !group ? "empty" : "available";
  return <div className={styles.page}>
    {synthetic && <FreshnessNotice state="demo">상세 흐름을 확인하는 로컬/테스트 전용 합성 자료입니다. 실제 공공 데이터 검증은 완료되지 않았습니다. 고정 평가 시점: 2026-10-21 12:00 (한국시간).</FreshnessNotice>}
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>자격 상세 · {synthetic ? "SYNTHETIC" : model.qualification.provider}</p>
        <h1>{model.qualification.canonicalName}</h1><p className={styles.subtitle}>{model.qualification.grade} · {model.qualification.domain} · {model.qualification.acquisitionTrack === "exam" ? "검정형" : "취득 경로 확인 필요"}</p>
        <div className={styles.badges}><Badge tone="info">일정·통계 분리 확인</Badge><Badge tone="warning">{synthetic ? "실데이터 미검증" : "공식 안내 최종 확인"}</Badge></div>
      </div>
      <div className={styles.actions}><ActionLink href="/my-plan" variant="secondary">관심·준비 계획 진입</ActionLink><ActionLink href="https://www.q-net.or.kr/" target="_blank">Q-Net 바로가기 ↗</ActionLink></div>
    </header>
    <p className={styles.note}>관심 저장과 개인 계획 편집은 다음 단계에서 제공합니다. 현재 진입 링크로는 저장되지 않습니다.</p>
    {pending ? <FreshnessNotice state="pending" /> : stale ? <FreshnessNotice state="stale" /> : !fresh ? <FreshnessNotice state="unverified">자료의 갱신·검증 상태를 확인하지 못했습니다. 다음 행동과 통계 합산 제안을 보류합니다.</FreshnessNotice> : null}
    <nav className={styles.sectionLinks} aria-label="상세 내용"><a href="#next-events">다음 일정</a><a href="#detail-schedules">필기·실기 일정</a><a href="#detail-statistics">연도별 통계</a><a href="#detail-information">시험 정보·출처</a></nav>
    <section id="next-events" className={styles.section} aria-labelledby="next-title"><div className={styles.sectionTitle}><p>01 · 다음 확인할 일</p><h2 id="next-title">접수와 시험을 차례로 확인하세요</h2></div>
      <div className={styles.grid}><NextEvent row={model.events.nextByStage.written} stage="written" /><NextEvent row={model.events.nextByStage.practical} stage="practical" /></div>
    </section>
    <section id="detail-schedules" className={styles.section} aria-labelledby="schedule-title"><div className={styles.sectionTitle}><p>02 · 일정</p><h2 id="schedule-title">필기와 실기 일정</h2><p>일정의 날짜·기간·시각 정밀도를 구분합니다. 모든 날짜는 한국시간 기준입니다.</p></div>
      {model.events.state === "unavailable" && <Alert tone="danger" title="일정을 불러오지 못했습니다">통계와 시험 정보는 아래에서 계속 확인할 수 있습니다.</Alert>}
      {model.events.state === "partial" && <Alert tone="warning" title="일정 확인이 더 필요합니다">마지막 읽은 자료이며 다음 접수 제안을 보류합니다.</Alert>}
      {model.events.state === "empty" && <p>확인된 일정이 없습니다. 향후 일정을 추정하지 않습니다.</p>}
      <div className={styles.grid}>{(["written", "practical"] as const).map(stage => <section key={stage} className={styles.stack} aria-label={`${stageNames[stage]} 일정`}><h3>{stageNames[stage]}</h3>{model.events.rows.filter(row => row.source.stage === stage).map(row => <Event key={row.source.id} row={row} synthetic={synthetic} />)}</section>)}</div>
    </section>
    <section id="detail-statistics" className={styles.section} aria-labelledby="statistics-title"><div className={styles.sectionTitle}><p>03 · 통계</p><h2 id="statistics-title">연도별 응시·합격 통계</h2><p>과거 응시 집단의 결과입니다. 개인의 합격 가능성이나 난이도를 예측하지 않습니다.</p></div>
      <form action={DETAIL_DEMO_PATH} method="get" className={styles.filters} aria-label="통계 선택">
        <input type="hidden" name="scenario" value={scenario} /><div className={styles.filterField}><label htmlFor="detail-year">연도</label><select id="detail-year" name="year" defaultValue={selectedYear}>{[2024, 2025, 2026].map(year => <option key={year} value={year}>{year}년{year === 2026 ? " · 진행 중" : ""}</option>)}</select></div>
        <div className={styles.filterField}><label htmlFor="detail-stage">시험 단계</label><select id="detail-stage" name="stage" defaultValue={selectedStage}><option value="written">필기</option><option value="practical">실기</option></select></div><Button type="submit">통계 보기</Button>
      </form>
      {(!group || group.summary) && <DetailStatistics year={selectedYear} stage={selectedStage} summary={group?.summary ?? null} status={status} aggregateAllowed={group?.reason === null && fresh && !pending && model.statistics.paginationComplete} source={group?.rows[0] ? <Source row={group.rows[0].source} synthetic={synthetic} /> : undefined} />}
      {group && !group.summary && <><Alert tone="warning" title="통계 합산 근거가 확인되지 않았습니다">모집단·회차·검증 근거가 부족하여 비율과 연간 합계를 산출하지 않습니다.</Alert><DataTable caption="합산 전 원자료 · 비율 미산출" columns={[{ key: "round", label: "자료 구분" }, { key: "examinees", label: "응시자 원자료" }, { key: "passed", label: "합격자 원자료" }]} rows={group.rows.map(row => ({ round: row.source.round === null ? "공식 연간 원자료" : `${row.source.round}회`, examinees: row.source.examinees ?? "미확인", passed: row.source.passed ?? "미확인" }))} />{group.rows[0] && <Source row={group.rows[0].source} synthetic={synthetic} />}</>}
    </section>
    <section id="detail-information" className={styles.section} aria-labelledby="information-title"><div className={styles.sectionTitle}><p>04 · 시험 정보와 출처</p><h2 id="information-title">확인된 범위 안에서 준비하세요</h2></div>
      {model.details.state === "unavailable" ? <Alert tone="warning" title="시험 부가정보를 불러오지 못했습니다">일정·통계는 각각 독립적으로 제공합니다.</Alert> : unsupported ? <Alert tone="info" title="제공되지 않는 시험 정보입니다">응시자격·수수료·시험기준을 임의로 채우지 않습니다.</Alert> : <div className={styles.info}>{model.details.rows.map(row => <p key={row.id}>{row.safeText}</p>)}<p>응시자격 · 수수료 · 시험기준: 미확인</p></div>}
      <Source row={model.qualification} synthetic={synthetic} />
      <p className={styles.note}>{synthetic ? "위 시각은 합성 레코드의 테스트용 메타데이터입니다. 실제 공식 발표·수집·대조의 증거가 아닙니다." : "공식 발표·수집·자동 검증·운영자 대조 시각은 서로 다른 확인 단계입니다."}</p>
      <div className={styles.correction}><h3>자료가 다르게 보이나요?</h3><p>시행기관의 최신 공고에서 종목·연도·회차를 먼저 확인해 주세요. 정정 요청 접수 기능은 아직 제공하지 않습니다.</p><div className={styles.actions}><ActionLink href="https://www.q-net.or.kr/" target="_blank" variant="secondary">공식 공고 확인 ↗</ActionLink><ActionLink href="/my-plan">준비 계획 화면으로</ActionLink></div></div>
    </section>
  </div>;
}

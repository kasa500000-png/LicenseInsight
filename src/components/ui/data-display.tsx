import type { ReactNode } from "react";
import { parseInstant } from "@/domain/date";
import { ChartBoundary } from "./chart-boundary";
import styles from "./data-display.module.css";

export type SourceStampProps = Readonly<{
  sourceName: string;
  sourceUrl?: string;
  periodLabel?: string;
  publishedAt?: string | null;
  collectedAt?: string | null;
  validatedAt?: string | null;
  reviewedAt?: string | null;
}>;

const sourceDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", calendar: "gregory", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function displayTime(value: string | null | undefined): ReactNode {
  if (value == null) return "미확인";
  const parsed = parseInstant(value);
  if (!parsed.ok) return "미확인";
  const milliseconds = Date.parse(parsed.value);
  if (!Number.isFinite(milliseconds)) return "미확인";
  return <time dateTime={parsed.value}>{sourceDateFormatter.format(milliseconds)} (한국시간)</time>;
}

function sourceHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Display source assertions supplied by the caller; never infer publication or validation time. */
export function SourceStamp({ sourceName, sourceUrl, periodLabel, publishedAt, collectedAt, validatedAt, reviewedAt }: SourceStampProps) {
  const href = sourceHref(sourceUrl);
  return (
    <aside className={styles.source} aria-label="자료 출처와 확인 시각">
      <p className={styles.sourceHeading}>
        <span aria-hidden="true">↗</span> 출처: {href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{sourceName}<span className={styles.screenReaderOnly}> (새 창)</span></a>
          : <span>{sourceName}</span>}
      </p>
      {periodLabel && <p className={styles.sourcePeriod}>자료 기준: {periodLabel}</p>}
      <dl className={styles.sourceTimes}>
        <div><dt>공식 발표</dt><dd>{displayTime(publishedAt)}</dd></div>
        <div><dt>자료 수집</dt><dd>{displayTime(collectedAt)}</dd></div>
        <div><dt>마지막 자동 검증</dt><dd>{displayTime(validatedAt)}</dd></div>
        <div><dt>운영자 대조</dt><dd>{displayTime(reviewedAt)}</dd></div>
      </dl>
    </aside>
  );
}

export type FreshnessState = "stale" | "pending" | "unverified" | "demo" | "storage-failure";
const notices: Record<FreshnessState, { symbol: string; title: string; description: string; tone: "warning" | "info" | "danger" }> = {
  stale: { symbol: "◷", title: "갱신이 지연되고 있습니다", description: "마지막 확인 자료입니다. 최신 일정과 접수 가능 여부는 공식 안내를 다시 확인해 주세요.", tone: "warning" },
  pending: { symbol: "↻", title: "변경 사항을 확인하고 있습니다", description: "확인 중인 변경 내용을 새 일정으로 확정하지 않습니다. 공식 안내를 확인해 주세요.", tone: "warning" },
  unverified: { symbol: "?", title: "아직 검증되지 않은 자료입니다", description: "이 자료를 바탕으로 접수나 준비 일정을 확정하지 마세요.", tone: "warning" },
  demo: { symbol: "◇", title: "SYNTHETIC · 합성 테스트 자료", description: "컴포넌트 확인용 예시입니다. 공식 종목·일정·통계가 아닙니다.", tone: "info" },
  "storage-failure": { symbol: "!", title: "이 브라우저에 저장하지 못했습니다", description: "현재 입력은 임시 상태입니다. 새로고침하거나 창을 닫으면 사라질 수 있습니다.", tone: "danger" },
};

export function FreshnessNotice({ state, children }: Readonly<{ state: FreshnessState; children?: ReactNode }>) {
  const notice = notices[state];
  return (
    <aside className={`${styles.notice} ${styles[notice.tone]}`} role={state === "storage-failure" ? "alert" : "status"}>
      <span className={styles.noticeSymbol} aria-hidden="true">{notice.symbol}</span>
      <div><p className={styles.noticeTitle}>{notice.title}</p><div className={styles.noticeContent}>{children ?? notice.description}</div></div>
    </aside>
  );
}

export type ScheduleRowProps = Readonly<{
  name: string; stage: "written" | "practical"; eventType: string; dateLabel: string;
  statusLabel: string; notice?: string; source?: ReactNode;
}>;

export function ScheduleRow({ name, stage, eventType, dateLabel, statusLabel, notice, source }: ScheduleRowProps) {
  return (
    <article className={styles.scheduleRow}>
      <div className={styles.scheduleTop}><p className={styles.kicker}>{stage === "written" ? "필기" : "실기"} · {eventType}</p><span className={styles.status}>{statusLabel}</span></div>
      <h3 className={styles.cardTitle}>{name}</h3>
      <p className={styles.scheduleDate}>{dateLabel}</p>
      {notice && <p className={styles.detail}><span aria-hidden="true">ⓘ </span>{notice}</p>}
      {source && <div className={styles.cardSource}>{source}</div>}
    </article>
  );
}
export const ScheduleEventRow = ScheduleRow;

export function QualificationCard({ name, grade, supportLabel, action }: Readonly<{ name: string; grade: string; supportLabel: string; action?: ReactNode }>) {
  return (
    <article className={styles.card}>
      <p className={styles.kicker}>{grade}</p><h3 className={styles.cardTitle}>{name}</h3>
      <p className={styles.detail}>{supportLabel}</p>{action && <div className={styles.actions}>{action}</div>}
    </article>
  );
}

export function NextActionCard({ title, description, action, source }: Readonly<{ title: string; description: ReactNode; action?: ReactNode; source?: ReactNode }>) {
  return (
    <article className={styles.card}>
      <p className={styles.kicker}>다음 확인할 일</p><h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.detail}>{description}</div>{action && <div className={styles.actions}>{action}</div>}
      {source && <div className={styles.cardSource}>{source}</div>}
    </article>
  );
}

export type StatisticSummaryProps = Readonly<{
  label: string; rate: string | null; examinees: string | null; passed: string | null;
  periodLabel: string; completenessLabel: string;
}>;

/** Values are formatted upstream. A missing value is never converted to zero. */
export function StatisticSummary({ label, rate, examinees, passed, periodLabel, completenessLabel }: StatisticSummaryProps) {
  return (
    <section className={styles.card} aria-label={label}>
      <h3 className={styles.cardTitle}>{label}</h3><p className={styles.detail}>{periodLabel} · {completenessLabel}</p>
      <p className={styles.statistic}>{rate === null ? <span className={styles.unavailable}>산출 불가</span> : <>{rate}<span className={styles.unit}>%</span></>}</p>
      <dl className={styles.samples}>
        <div><dt>응시자</dt><dd>{examinees === null ? "미확인" : `${examinees}명`}</dd></div>
        <div><dt>합격자</dt><dd>{passed === null ? "미확인" : `${passed}명`}</dd></div>
      </dl>
    </section>
  );
}

export type DataColumn = Readonly<{ key: string; label: ReactNode }>;
export type DataRow = Readonly<Record<string, ReactNode>>;
export type DataTableProps = Readonly<{ caption: string; columns: readonly DataColumn[]; rows: readonly DataRow[]; rowKey?: string }>;

/** Only this container scrolls horizontally. The caption and first-column headers remain semantic. */
export function DataTable({ caption, columns, rows, rowKey }: DataTableProps) {
  return (
    <div className={styles.tableScroll} role="region" aria-label={`${caption} 가로 스크롤 표`} tabIndex={0}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => {
          const candidate = rowKey ? row[rowKey] : undefined;
          const key = typeof candidate === "string" || typeof candidate === "number" ? candidate : index;
          return <tr key={key}>{columns.map((column, columnIndex) => columnIndex === 0
            ? <th key={column.key} scope="row">{row[column.key] ?? "확인 불가"}</th>
            : <td key={column.key}>{row[column.key] ?? "확인 불가"}</td>)}</tr>;
        }) : <tr><td colSpan={Math.max(1, columns.length)} className={styles.tableEmpty}>표시할 자료가 없습니다.</td></tr>}</tbody>
      </table>
    </div>
  );
}

export type AccessibleChartProps = Readonly<{
  title: string; description: string; columns: readonly DataColumn[]; rows: readonly DataRow[];
  children?: ReactNode; chartUnavailable?: boolean;
}>;

/** The tabular alternative is always rendered, including when the optional chart fails. */
export function AccessibleChart({ title, description, columns, rows, children, chartUnavailable = false }: AccessibleChartProps) {
  const fallback = <p className={styles.chartFallback} role="status"><span aria-hidden="true">▦ </span>차트 대신 아래 데이터 표를 확인해 주세요.</p>;
  return (
    <figure className={styles.chart}>
      <figcaption><strong className={styles.cardTitle}>{title}</strong><p className={styles.detail}>{description}</p></figcaption>
      {chartUnavailable || !children
        ? fallback
        : <ChartBoundary fallback={fallback}><div className={styles.plot}>{children}</div></ChartBoundary>}
      <DataTable caption={`${title} 데이터 표`} columns={columns} rows={rows} />
    </figure>
  );
}

export function CompareTray({ count, max = 3, children }: Readonly<{ count: number; max?: number; children?: ReactNode }>) {
  const valid = Number.isSafeInteger(count) && count >= 0 && Number.isSafeInteger(max) && max >= 1 && max <= 3;
  return (
    <aside className={styles.tray} aria-label="비교 선택 상태">
      <div><p className={styles.noticeTitle}>비교할 자격증</p>
        <p className={styles.detail} role="status">{!valid ? "선택 수를 확인해 주세요." : `${count}개 선택 · 최대 ${max}개`}</p>
        {valid && count > max && <p className={styles.limitMessage}>최대 {max}개까지 비교할 수 있습니다.</p>}
      </div>{children && <div className={styles.actions}>{children}</div>}
    </aside>
  );
}

export function PlanWeekCard({ title, totalMinutes, children }: Readonly<{ title: string; totalMinutes: number; children?: ReactNode }>) {
  const valid = Number.isSafeInteger(totalMinutes) && totalMinutes >= 0;
  return (
    <article className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3><p className={styles.planMinutes}>{valid ? `${totalMinutes.toLocaleString("ko-KR")}분` : "시간 확인 필요"}</p>
      <p className={styles.detail}>사용자가 정한 공부시간입니다. 합격에 필요한 공식 학습시간을 뜻하지 않습니다.</p>
      {children && <div className={styles.weekContent}>{children}</div>}
    </article>
  );
}

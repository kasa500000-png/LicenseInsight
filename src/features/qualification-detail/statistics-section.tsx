import type { ReactNode } from "react";
import { AccessibleChart, StatisticSummary, type DataColumn, type DataRow } from "@/components/ui/data-display";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import { formatRate, type ExactRate, type StatisticRow, type StatisticsSummary } from "@/domain/statistics";
import styles from "./statistics-section.module.css";

export type DetailStatisticsProps = Readonly<{
  summary: StatisticsSummary | null;
  stage: "written" | "practical";
  year: number;
  status: "available" | "empty" | "error" | "unsupported";
  aggregateAllowed: boolean;
  source?: ReactNode;
}>;

const numberFormatter = new Intl.NumberFormat("ko-KR");
const verificationLabels = {
  verified: "검증 완료",
  pending: "확인 중",
  review_required: "검토 필요",
} as const;
const rateVerificationLabels = {
  verified: "원문 비율 대조 완료",
  not_provided: "원문 비율 미제공",
  review_required: "원문 비율 검토 필요",
  unverifiable: "원문 비율 대조 불가",
} as const;
const completenessLabels = {
  complete: "완료 자료",
  partial: "부분 자료",
  unknown: "완료 범위 미확인",
} as const;
const issueLabels: Record<StatisticRow["issues"][number], string> = {
  NEGATIVE_COUNT: "음수 인원 검토",
  PASSED_EXCEEDS_EXAMINEES: "응시자보다 많은 합격자 검토",
  MISSING_COUNT: "인원 누락",
  ZERO_DENOMINATOR: "응시자 0명으로 비율 산출 불가",
  SOURCE_IDENTITY_CONFLICT: "출처 식별 충돌 검토",
  NATURAL_KEY_CONFLICT: "같은 회차의 중복 자료 검토",
  ROUNDING_EVIDENCE_REQUIRED: "원문 반올림 근거 미확인",
  RATE_MISMATCH: "원문 비율 불일치 검토",
  SOURCE_NOT_VERIFIED: "출처 검증 미완료",
  FUTURE_YEAR: "미래 연도 자료 검토",
};

/** Preserve the complete integer; never coerce sample counts to Number. */
function displayCount(value: string | null): string | null {
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) return null;
  return numberFormatter.format(BigInt(value));
}

function displayRate(value: ExactRate | null): string | null {
  const formatted = formatRate(value);
  return formatted.ok ? formatted.value : null;
}

function rowRate(row: StatisticRow): string | null {
  return row.effectiveVerification === "verified" ? displayRate(row.calculatedRate) : null;
}

function rowCount(row: StatisticRow, field: "examinees" | "passed"): string | null {
  return row.effectiveVerification === "verified" ? displayCount(row[field]) : null;
}

function Verification({ row }: Readonly<{ row: StatisticRow }>) {
  return (
    <div className={styles.cellStack}>
      <Badge tone={row.effectiveVerification === "verified" ? "success" : "warning"}>
        {verificationLabels[row.effectiveVerification]}
      </Badge>
      <span>{rateVerificationLabels[row.rateVerification]}</span>
      {row.issues.length > 0 && <span>{row.issues.map(issue => issueLabels[issue]).join(" · ")}</span>}
    </div>
  );
}

function SampleCell({ value }: Readonly<{ value: string | null }>) {
  return <span className={styles.count}>{value === null ? "미확인" : `${value}명`}</span>;
}

const columns: readonly DataColumn[] = [
  { key: "round", label: "회차" },
  { key: "examinees", label: "응시자" },
  { key: "passed", label: "합격자" },
  { key: "rate", label: "인원 기준 합격률" },
  { key: "originalRate", label: "출처 원문 비율" },
  { key: "completeness", label: "수집 범위" },
  { key: "verification", label: "검증 상태" },
];

/** SSR presentation only: the caller selects the year/stage and supplies checked domain results. */
export function DetailStatistics({ summary, stage, year, status, aggregateAllowed, source }: DetailStatisticsProps) {
  const stageLabel = stage === "written" ? "필기" : "실기";
  const periodLabel = `${year}년 ${stageLabel}`;

  if (status === "error") {
    return (
      <section className={styles.stack} aria-label={`${periodLabel} 통계`}>
        <Alert tone="danger" title="통계 정보를 불러오지 못했습니다">
          통계 확인을 다시 시도해 주세요. 일정 정보와 공식 안내는 계속 확인할 수 있습니다.
        </Alert>
        {source}
      </section>
    );
  }
  if (status !== "available" || summary === null) {
    return (
      <section className={styles.stack} aria-label={`${periodLabel} 통계`}>
        <EmptyState
          headingLevel={3}
          title={status === "unsupported" ? "이 통계 범위를 지원하지 않습니다" : "이 기준의 통계가 없습니다"}
          description={status === "unsupported"
            ? `${periodLabel}에 지원되는 취득 경로와 자료 범위를 확인하지 못했습니다. 다른 연도나 시험 단계를 확인해 주세요.`
            : `${periodLabel}에 검증하여 표시할 자료가 없습니다. 자료가 없다는 뜻이며 응시자나 합격자가 0명이라는 뜻은 아닙니다.`}
        />
        {source}
      </section>
    );
  }

  const aggregate = summary.derivedAnnual;
  const aggregateVerified = aggregate.verification === "verified";
  const aggregateRate = aggregateAllowed && aggregateVerified ? displayRate(aggregate.rate) : null;
  const completeness = aggregate.completeness === "complete"
    ? "완료 연도 · 확인된 전체 회차 · 자체 합산"
    : `${summary.completedYear ? "완료 범위 미확인" : "진행 중인 연도"} · 수집된 회차 기준`;
  const rounds = summary.rounds.map(row => ({ row, rate: rowRate(row) }));
  const rows: readonly DataRow[] = rounds.map(({ row, rate }) => ({
    round: row.round,
    examinees: <SampleCell value={rowCount(row, "examinees")} />,
    passed: <SampleCell value={rowCount(row, "passed")} />,
    rate: <span data-statistic-round={row.round} data-rate={rate ?? "unavailable"}>{rate === null ? "산출 불가" : `${rate}%`}</span>,
    originalRate: <span className={styles.originalRate}>{row.sourceRateText ?? "미제공"}</span>,
    completeness: completenessLabels[row.completeness],
    verification: <Verification row={row} />,
  }));

  return (
    <section className={styles.stack} aria-label={`${periodLabel} 통계`}>
      <p className={styles.note}>
        합격률은 해당 자료의 응시자 대비 합격자 비율입니다. 개인의 합격 가능성이나 시험 난이도를 뜻하지 않습니다.
      </p>
      {summary.reviewRequired && (
        <Alert tone="warning" title="검토가 필요한 통계가 있습니다">
          검토가 필요한 인원과 산출 비율은 표시를 보류합니다. 출처 원문 비율은 대조용으로 구분하여 표시합니다.
        </Alert>
      )}
      {aggregateAllowed ? (
        <div data-testid="derived-statistics-summary" data-rate={aggregateRate ?? "unavailable"}>
          <StatisticSummary
            label={aggregate.completeness === "complete" ? "자체 회차 합산" : "수집된 회차 기준 자체 합산"}
            rate={aggregateRate}
            examinees={aggregateVerified ? displayCount(aggregate.examinees) : null}
            passed={aggregateVerified ? displayCount(aggregate.passed) : null}
            periodLabel={periodLabel}
            completenessLabel={completeness}
          />
          <p className={styles.note}>합산 검증 상태: {verificationLabels[aggregate.verification]} · 공식 연간값은 회차 합산에 더하지 않습니다.</p>
        </div>
      ) : (
        <Alert tone="warning" title="연간 합산을 보류했습니다" data-testid="statistics-aggregate-withheld">
          데이터셋 상태·모집단·회차·검증 근거를 모두 확인하지 못했습니다. 회차별 검증 자료와 공식 제공 연간값을 구분하여 확인해 주세요.
        </Alert>
      )}
      <div className={styles.coverage}>
        <p>자료 범위: {completenessLabels[aggregate.completeness]} · 수집 회차 {aggregate.rounds.length}개</p>
        <p>{aggregate.missingRounds === null
          ? "예상 회차를 확인하지 못해 누락 여부를 알 수 없습니다."
          : aggregate.missingRounds.length > 0
            ? `누락 회차: ${aggregate.missingRounds.join(", ")}`
            : "확인된 예상 회차 중 누락된 회차가 없습니다."}</p>
      </div>
      <AccessibleChart
        title={`${periodLabel} 회차별 합격률`}
        description="회차별 응시자와 합격자, 검증 상태를 아래 표에서 함께 확인할 수 있습니다. 비율이 산출되지 않은 회차는 0%로 표시하지 않습니다."
        columns={columns}
        rows={rows}
        chartUnavailable={rounds.length === 0}
      >
        <div className={styles.chart} role="img" aria-label={`${periodLabel} 회차별 합격률 막대 차트. 빗금 막대는 ${stageLabel} 합격률이며 아래 표와 같은 값을 표시합니다.`}>
          <p className={styles.legend}><span className={styles.legendSwatch} aria-hidden="true" />빗금 막대: {stageLabel} 합격률 · 가로축 0~100%</p>
          <ul className={styles.bars}>
            {rounds.map(({ row, rate }) => (
              <li className={styles.barRow} key={`${row.sourceId}:${row.logicalKey}:${row.revision}`} data-statistic-round={row.round} data-rate={rate ?? "unavailable"}>
                <span className={styles.roundLabel}>{row.round}</span>
                <span className={styles.track} aria-hidden="true">
                  {rate !== null && <span className={styles.bar} style={{ width: `${rate}%` }} />}
                </span>
                <span className={styles.rate}>{rate === null ? "산출 불가" : `${rate}%`}</span>
              </li>
            ))}
          </ul>
        </div>
      </AccessibleChart>
      {summary.officialAnnual.length > 0 && (
        <section className={styles.stack} aria-label="공식 제공 연간값" data-testid="official-annual-statistics">
          <p className={styles.note}>공식 제공 연간값은 회차별 자료와 별도인 원천 자료입니다. 자체 회차 합산에 중복으로 더하지 않습니다.</p>
          {summary.officialAnnual.map((row, index) => (
            <div className={styles.stack} key={`${row.sourceId}:${row.logicalKey}:${row.revision}`}>
              <StatisticSummary
                label={summary.officialAnnual.length === 1 ? "공식 제공 연간값" : `공식 제공 연간값 ${index + 1}`}
                rate={rowRate(row)}
                examinees={rowCount(row, "examinees")}
                passed={rowCount(row, "passed")}
                periodLabel={periodLabel}
                completenessLabel={completenessLabels[row.completeness]}
              />
              <p className={styles.note}>출처 원문 비율: <span className={styles.originalRate}>{row.sourceRateText ?? "미제공"}</span></p>
              <Verification row={row} />
            </div>
          ))}
        </section>
      )}
      {source}
    </section>
  );
}

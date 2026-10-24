"use client";

import { useRef, useState } from "react";
import { parseLocalDate } from "@/domain/date";
import { ActionLink, AdSlotPlaceholder, Alert, Badge, Button, Card, EmptyState, Skeleton, Toast } from "@/components/ui/primitives";
import { Checkbox, DateField, DurationField, Input, SearchBox, Select } from "@/components/ui/form-controls";
import { Dialog, Tabs } from "@/components/ui/interactions";
import { AccessibleChart, CompareTray, FreshnessNotice, NextActionCard, PlanWeekCard, QualificationCard, ScheduleRow, SourceStamp, StatisticSummary } from "@/components/ui/data-display";
import styles from "./gallery.module.css";

const columns = [{ key: "round", label: "합성 회차" }, { key: "examinees", label: "응시자" }, { key: "passed", label: "합격자" }, { key: "rate", label: "합격률" }];
const rows = [{ round: "회차 1", examinees: "100명", passed: "20명", rate: "20.0%" }, { round: "회차 2", examinees: "900명", passed: "450명", rate: "50.0%" }];
const longName = "합성 검증용 초고압 전기설비 설계·시공·유지관리 및 산업안전 복합 자격 종목의 매우 긴 이름";

function SyntheticChart({ failed }: { failed: boolean }) {
  if (failed) throw new Error("Synthetic chart render failure");
  return <div role="img" aria-label="합성 회차 1은20%, 회차 2는50%. 같은 값은 아래 표에서 확인할 수 있습니다.">
    <p>합성 회차 1 ━ 20.0%</p><p>합성 회차 2 ┄ 50.0%</p>
  </div>;
}

export function UiGallery() {
  const [query, setQuery] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState(90);
  const [durationValid, setDurationValid] = useState(true);
  const [chartFailed, setChartFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const [buttonResult, setButtonResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [buttonCalls, setButtonCalls] = useState(0);
  const dialogTrigger = useRef<HTMLButtonElement>(null);
  function validateForm() {
    setSubmitted(true);
    if (!parseLocalDate(goal).ok) document.getElementById("demo-goal")?.focus();
    else if (!durationValid) document.getElementById("demo-duration-hours")?.focus();
  }
  return <div className={styles.gallery}>
    <header className={styles.heading}>
      <Badge tone="warning">SYNTHETIC · 로컬/테스트 전용</Badge>
      <h1>공통 UI 검증실</h1>
      <p>아래 이름·일정·통계는 합성 예제입니다. 공식 자료나 저장된 개인 계획이 아닙니다.</p>
      <nav className={styles.sectionLinks} aria-label="검증 항목">
        <a href="#gallery-forms">입력</a><a href="#gallery-states">상태</a><a href="#gallery-data">데이터 표시</a><a href="#gallery-actions">상호작용</a>
      </nav>
    </header>

    <section id="gallery-forms" className={styles.section} aria-labelledby="forms-title">
      <div className={styles.sectionHeading}><p>01 · 입력과 오류</p><h2 id="forms-title">키보드로도 명확하게</h2></div>
      <div className={styles.grid}>
        <Card><h3>검색 입력</h3><SearchBox id="demo-search" label="합성 종목 검색" onSearch={value => { setQuery(value); setSearchCount(n => n + 1); }} />
          <p className={styles.caption} role="status" data-testid="search-result">{searchCount ? `검색 입력 확인 ${searchCount}회: ${query || "빈 검색어"}` : "검색 입력 검증만 수행하며 실제 검색은 하지 않습니다."}</p>
          <Input id="demo-alias" label="검증 별칭 예시" placeholder="긴 한국어 입력도 잘리지 않습니다" hint="입력 예시이며 저장하지 않습니다." />
        </Card>
        <Card><h3>날짜와 공부시간</h3><div className={styles.stack}>
          <DateField id="demo-goal" label="합성 목표일" value={goal} onValueChange={setGoal} error={submitted && !goal ? "목표일을 입력해 주세요." : undefined} />
          <DurationField id="demo-duration" label="하루 공부 가능시간" value={duration} onValueChange={setDuration} onValidityChange={setDurationValid} />
          <p className={styles.caption} data-testid="duration-value">마지막 유효 입력: {duration}분</p>
          <Select id="demo-stage" label="검증 단계" defaultValue="written"><option value="written">필기</option><option value="practical">실기</option></Select>
          <Checkbox id="demo-check" label="이 예제가 합성 자료임을 확인했습니다" />
          <Button variant="secondary" onClick={validateForm}>입력 오류 확인</Button>
          {submitted && parseLocalDate(goal).ok && durationValid ? <Toast tone="success">입력 형식을 확인했습니다. 저장하지 않았습니다.</Toast> : null}
        </div></Card>
      </div>
    </section>

    <section id="gallery-states" className={styles.section} aria-labelledby="states-title">
      <div className={styles.sectionHeading}><p>02 · 상태</p><h2 id="states-title">모르는 정보는 분명하게</h2></div>
      <div className={styles.grid}>
        <Card data-testid="state-loading"><h3>로딩</h3><Skeleton label="일정 정보를 불러오는 중입니다" /><p className={styles.caption}>일정 정보를 불러오는 중입니다.</p><Button loading>제출</Button></Card>
        <EmptyState data-testid="state-empty" title="확인된 일정이 없습니다" description="빈 응답을 공식 미발표로 단정하지 않습니다." action={<Button variant="secondary" onClick={() => setButtonResult(true)}>빈 상태 행동 확인</Button>} />
        <div className={styles.stack} data-testid="state-error"><Alert tone="danger" title="정보를 불러오지 못했습니다">기존 확인 자료가 없다면 공식 출처에서 확인해 주세요.</Alert><Alert tone="success" title="입력 형식 확인 완료">성공 상태의 디자인 예시입니다. 데이터 게시나 저장 성공을 뜻하지 않습니다.</Alert></div>
        <div className={styles.stack} data-testid="state-stale"><FreshnessNotice state="stale" /><FreshnessNotice state="pending" /></div>
        <div className={styles.stack} data-testid="state-storage"><FreshnessNotice state="storage-failure">현재 입력은 이 화면에 남아 있습니다. 저장 성공으로 표시하지 않습니다.</FreshnessNotice><Toast tone="danger">저장 실패 상태는 위 본문 안내에도 남아 있습니다.</Toast></div>
        <div className={styles.stack} data-testid="state-demo"><FreshnessNotice state="demo" /><FreshnessNotice state="unverified" /><AdSlotPlaceholder /></div>
      </div>
    </section>

    <section id="gallery-data" className={styles.section} aria-labelledby="data-title">
      <div className={styles.sectionHeading}><p>03 · 데이터 표시</p><h2 id="data-title">기준과 출처를 함께</h2></div>
      <div className={styles.grid}>
        <QualificationCard name={longName} grade="합성 등급" supportLabel="검증용 표시 · 실제 지원 종목 아님" action={<Button variant="ghost" onClick={() => setButtonResult(true)}>표시 상태 확인</Button>} />
        <NextActionCard title="기간형 시험 예시" description="개인 시험일이 아닌 시험기간의 시작일입니다. 접수 가능 여부를 보장하지 않습니다."
          action={<Button variant="secondary" onClick={() => setButtonResult(true)}>다음 행동 모양 확인</Button>} />
        <ScheduleRow name={longName} stage="written" eventType="접수" dateLabel="2026-10-20 ~ 2026-10-22 · 합성 날짜" statusLabel="시각 공식 확인" notice="날짜만 있는 예시입니다. 접수 시간·휴일·개인 조건 확인이 필요합니다." />
        <StatisticSummary label="합성 통계 합산" rate="47.0" examinees="1,000" passed="470" periodLabel="2025년 · 합성 두 회차 · 필기" completenessLabel="수집된 합성 회차 기준 · 공식 연간값 아님" />
        <StatisticSummary label="큰 숫자·누락값 표시" rate={null} examinees="9,223,372,036,854,775,807" passed={null} periodLabel="합성 숫자 · 정밀도 표시 점검" completenessLabel="부분 자료 · 분자 미확인" />
        <SourceStamp sourceName="합성 검증 자료 · 공식 자료 아님" periodLabel="2025년 · 합성 두 회차 · 필기" publishedAt="2026-10-18T01:00:00Z" collectedAt="2026-10-19T02:00:00Z" validatedAt="2026-10-20T03:00:00Z" reviewedAt={null} />
      </div>
      <Card><AccessibleChart title="합성 회차별 비율" description="회차 비율을 단순 평균하지 않습니다. 차트가 없어도 같은 원자료를 표에서 확인할 수 있습니다." columns={columns} rows={rows} chartUnavailable /></Card>
      <Card><Button variant="secondary" onClick={() => setChartFailed(true)}>차트 오류 확인</Button>
        <AccessibleChart title="차트 오류 격리 예시" description="차트 렌더링 오류가 발생해도 아래 데이터 표는 유지합니다." columns={columns} rows={rows}>
          <SyntheticChart failed={chartFailed} />
        </AccessibleChart>
      </Card>
    </section>

    <section id="gallery-actions" className={styles.section} aria-labelledby="actions-title">
      <div className={styles.sectionHeading}><p>04 · 상호작용</p><h2 id="actions-title">행동과 결과를 연결하기</h2></div>
      <Card><Tabs label="합성 단계별 보기" items={[
        { id: "written", label: "필기 예시", content: <p>필기 패널입니다. 방향키로 탭을 바꿀 수 있습니다.</p> },
        { id: "practical", label: "실기 예시", content: <p>실기 패널입니다. 실제 응시자격을 판정하지 않습니다.</p> },
        { id: "disabled", label: "미지원 단계", content: null, disabled: true },
      ]} /></Card>
      <div className={styles.grid}>
        <Card><h3>버튼과 대화상자</h3><div className={styles.buttonRow}>
          <Button data-testid="primary-button" onClick={() => setButtonResult(true)}>주요 행동 확인</Button>
          <Button variant="secondary" ref={dialogTrigger} onClick={() => setOpen(true)}>대화상자 열기</Button>
          <Button variant="ghost" onClick={() => setButtonResult(true)}>보조 행동</Button>
          <Button variant="destructive" onClick={() => setOpen(true)}>삭제 확인 예시</Button>
          <Button data-testid="busy-button" loading={busy} loadingLabel="처리 중 · 완료 확인 버튼을 누르세요" onClick={() => { setBusy(true); setButtonCalls(n => n + 1); }}>중복 제출 방지 확인</Button>
          <Button variant="secondary" onClick={() => setBusy(false)}>처리 완료 확인</Button>
        </div><p role="status" className={styles.caption} data-testid="button-result">{buttonResult ? "검증 버튼을 눌렀습니다. 실제 데이터를 변경하지 않았습니다." : "버튼 결과가 여기에 표시됩니다."} 제출 실행 {buttonCalls}회</p></Card>
        <PlanWeekCard title="합성 주간 배분 예시" totalMinutes={660}><Checkbox id="demo-task" label="합성 학습 항목 · 저장하지 않는 체크 예시" /></PlanWeekCard>
      </div>
      <CompareTray count={2}><Button variant="secondary" onClick={() => setButtonResult(true)}>비교 선택 모양 확인</Button></CompareTray>
      <div className={styles.lastAction} data-testid="gallery-last-action"><ActionLink variant="secondary" href="#main-content">검증실 맨 위로</ActionLink></div>
      <Dialog open={open} onClose={() => setOpen(false)} title="합성 항목 삭제 확인" description="대화상자의 포커스 이동과 닫기를 확인하는 예시입니다. 실제 항목은 삭제하지 않습니다.">
        <div className={styles.stack}><Input id="demo-dialog-note" label="검증 메모" placeholder="저장하지 않습니다" /><div className={styles.buttonRow}><Button variant="secondary" onClick={() => setOpen(false)}>취소</Button><Button variant="destructive" onClick={() => { setOpen(false); setButtonResult(true); }}>예시 확인 후 닫기</Button></div></div>
      </Dialog>
    </section>
  </div>;
}

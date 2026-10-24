import { DataUnavailable } from "@/components/data-unavailable";
import { env } from "@/server/env";

// Mode labels must follow the running server, rather than a prior test build.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      {env.dataMode === "fixture" && <p className="demo-notice" role="status">테스트 자료를 사용하는 데모 화면입니다. 공식 시험 정보가 아닙니다.</p>}
      <DataUnavailable />
      <aside className="trust-note" aria-label="정보 이용 안내">
        <strong>시험 준비는 공식 확인부터</strong>
        <p>접수 기간, 시험 기간, 합격 발표는 서로 다릅니다. 변경 사항과 개인별 접수 가능 여부는 공식 공지를 다시 확인해 주세요.</p>
      </aside>
    </>
  );
}

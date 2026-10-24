export function DataUnavailable() {
  return (
    <section className="empty-panel" aria-labelledby="data-status-title">
      <div className="status-symbol" aria-hidden="true">i</div>
      <p className="eyebrow">공식 정보, 정확한 기준</p>
      <h1 id="data-status-title">확인된 자격 정보를<br className="desktop-break" /> 준비하고 있습니다</h1>
      <p className="description">현재 제공할 수 있는 검증된 정보가 없습니다.<br />{" "}
        최신 시험 일정과 접수 기준은 Q-Net에서 확인해 주세요.</p>
      <ActionLink href="https://www.q-net.or.kr/" target="_blank" rel="noopener noreferrer">
        Q-Net에서 공식 정보 확인 <span aria-hidden="true">↗</span>
      </ActionLink>
      <p className="link-note">Q-Net은 한국산업인력공단의 국가자격 안내 사이트입니다.</p>
    </section>
  );
}
import { ActionLink } from "@/components/ui/primitives";


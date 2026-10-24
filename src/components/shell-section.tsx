import { EmptyState, ActionLink, Alert } from "@/components/ui/primitives";

/** Navigation destinations only; data and personal workflows are later STEPs. */
export function ShellSection({ title, description }: { title: string; description: string }) {
  return <>
    <div className="shell-heading"><p className="eyebrow">국가자격 정보 · 비교 · 준비</p><h1>{title}</h1><p>{description}</p></div>
    <EmptyState title={`${title} 기능을 준비하고 있습니다`} description="아직 이 화면에서 제공할 수 있는 기능이 없습니다. 공식 일정과 응시 기준은 Q-Net에서 확인해 주세요."
      action={<ActionLink href="https://www.q-net.or.kr/" target="_blank" rel="noopener noreferrer">Q-Net에서 공식 정보 확인 ↗</ActionLink>} />
    <div className="trust-note"><Alert title="공식 안내를 먼저 확인해 주세요" tone="info">접수 가능 여부와 개인 시험일은 시행기관의 공식 안내가 기준입니다.</Alert></div>
  </>;
}

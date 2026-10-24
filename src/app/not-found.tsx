import Link from "next/link";

export default function NotFound() {
  return (
    <section className="state-panel">
      <p className="eyebrow">404</p>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소를 확인하거나 처음 화면으로 이동해 주세요.</p>
      <Link className="primary-link" href="/">처음으로 돌아가기</Link>
    </section>
  );
}

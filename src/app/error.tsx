"use client";

import { Button } from "@/components/ui/primitives";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="state-panel" aria-labelledby="error-title">
      <p className="eyebrow">잠시 확인해 주세요</p>
      <h1 id="error-title">화면을 불러오지 못했습니다</h1>
      <p>잠시 후 다시 시도해 주세요. 시험 정보는 공식 안내에서 확인할 수 있습니다.</p>
      <Button onClick={reset}>다시 시도</Button>
    </section>
  );
}

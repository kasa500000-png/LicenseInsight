"use client";

import { useState } from "react";

export function BoundaryCheck() {
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error("Synthetic foundation boundary check");
  return (
    <section className="state-panel">
      <h1>오류 경계 테스트</h1>
      <button className="primary-link" onClick={() => setFailed(true)}>오류 화면 확인</button>
    </section>
  );
}

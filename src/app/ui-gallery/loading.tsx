import { Skeleton } from "@/components/ui/primitives";

// Keep streaming loading UI in the interactive gallery. Core detail HTML must
// remain visible to readers who do not execute the streaming reveal scripts.
export default function Loading() {
  return <div className="state-panel"><Skeleton label="화면을 불러오고 있습니다" /><p>화면을 불러오고 있습니다.</p></div>;
}

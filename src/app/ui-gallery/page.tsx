import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/server/env";
import { UiGallery } from "./ui-gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "공통 UI 검증실 | 자격인사이트", robots: { index: false, follow: false } };

export default function GalleryPage() {
  if (env.appEnv !== "local" && env.appEnv !== "test") notFound();
  return <UiGallery />;
}

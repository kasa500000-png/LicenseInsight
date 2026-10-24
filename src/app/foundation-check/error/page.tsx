import { notFound } from "next/navigation";
import { env } from "@/server/env";
import { BoundaryCheck } from "./trigger";

export const dynamic = "force-dynamic";

// No query/localStorage switch can expose this test route outside APP_ENV=test.
export default function BoundaryCheckPage() {
  if (env.appEnv !== "test") notFound();
  return <BoundaryCheck />;
}

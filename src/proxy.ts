import { NextResponse } from "next/server";
import { parseEnvironment } from "./config/env";
import type { NextRequest } from "next/server";
import { isDetailDemoPath } from "./features/qualification-detail/demo-policy";

// Reject the test utility before the App Router can start a streamed response.
export function proxy(request: NextRequest) {
  const appEnv = parseEnvironment(process.env).appEnv;
  const gallery = request.nextUrl.pathname === "/ui-gallery" || request.nextUrl.pathname.startsWith("/ui-gallery/");
  const detail = request.nextUrl.pathname.startsWith("/detail-demo");
  if (detail ? !["local", "test"].includes(appEnv) || !isDetailDemoPath(request.nextUrl.pathname) : gallery ? !["local", "test"].includes(appEnv) : appEnv !== "test") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/foundation-check/error/:path*", "/ui-gallery/:path*", "/detail-demo/:path*"] };

import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "cvperfect.online";
const RENDER_HOST_SUFFIX = ".onrender.com";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (!host || host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}`) {
    return NextResponse.next();
  }

  if (host.endsWith(RENDER_HOST_SUFFIX)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

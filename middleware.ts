import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    if (url.pathname === "/en" || url.pathname === "/bn") {
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith("/en/") || url.pathname.startsWith("/bn/")) {
        url.pathname = url.pathname.replace(/^\/(en|bn)/, "") || "/";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|api|favicon.ico).*)"],
};

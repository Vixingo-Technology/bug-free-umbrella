import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // Handle locale redirects (existing logic)
    if (url.pathname === "/en" || url.pathname === "/bn") {
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith("/en/") || url.pathname.startsWith("/bn/")) {
        url.pathname = url.pathname.replace(/^\/(en|bn)/, "") || "/";
        return NextResponse.redirect(url);
    }

    // Supabase session refresh + route protection
    return await updateSession(request);
}

export const config = {
    matcher: ["/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

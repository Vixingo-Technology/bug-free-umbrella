import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
    // Create a new headers object with x-pathname
    const requestHeaders = new Headers(request.headers);
    const { pathname } = request.nextUrl;
    requestHeaders.set("x-pathname", pathname);

    let supabaseResponse = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // If Supabase isn't configured, skip auth entirely instead of hanging on
    // a fake DNS lookup. Browsers with stricter request timeouts (Edge, Brave)
    // would otherwise surface this as "server not responding".
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "[supabase/middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping session refresh."
            );
        }
        return supabaseResponse;
    }

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                supabaseResponse = NextResponse.next({
                    request: {
                        headers: requestHeaders,
                    },
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: Do not add code between createServerClient and getUser().
    // Race against a 3s timeout so a Supabase outage cannot stall every request.
    const userResult = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { user: null } }), 3000)
        ),
    ]);
    const user = userResult.data.user;

    // Protected route patterns
    const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/portal") ||
        pathname.startsWith("/dojo/dashboard") ||
        // locale-prefixed portal routes e.g. /en/portal, /bn/portal
        /^\/(en|bn)\/portal/.test(pathname);

    // Auth pages
    const isAuthPage =
        pathname === "/login" ||
        pathname === "/signup";

    if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (user && isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

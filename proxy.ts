import { intlayerProxy } from "next-intlayer/proxy";
import { authProxy } from "./middleware/auth";
import { NextRequest, NextResponse } from "next/server";

const INTLAYER_COOKIE_NAME = "INTLAYER_LOCALE";
const SUPPORTED_LOCALES = ["en", "pt"];

function getPathLocale(pathname: string): string | undefined {
  return SUPPORTED_LOCALES.find(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

/**
 * Creates a copy of the request with an updated cookie value.
 * This is used to sync the locale cookie with the URL locale *before*
 * intlayerProxy runs, so the proxy doesn't redirect back to the stale
 * cookie locale when the user switches language.
 */
function cloneRequestWithCookie(
  request: NextRequest,
  name: string,
  value: string
): NextRequest {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const updatedCookies = [
    ...cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !c.startsWith(`${name}=`)),
    `${name}=${value}`,
  ].join("; ");

  const newHeaders = new Headers(request.headers);
  newHeaders.set("cookie", updatedCookies);
  return new NextRequest(request.url, { headers: newHeaders });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathLocale = getPathLocale(request.nextUrl.pathname);
  const cookieLocale = request.cookies.get(INTLAYER_COOKIE_NAME)?.value;

  // When the URL has an explicit locale, make sure the request cookie matches
  // it before passing to intlayerProxy. Without this, intlayerProxy redirects
  // to the stale cookie locale (e.g. cookie=en, URL=/pt/about → redirect /en/about).
  const requestForIntlayer =
    pathLocale && cookieLocale && cookieLocale !== pathLocale
      ? cloneRequestWithCookie(request, INTLAYER_COOKIE_NAME, pathLocale)
      : request;

  const intlayerResponse = intlayerProxy(requestForIntlayer) ?? NextResponse.next();

  // Persist the URL locale in the cookie so future visits to locale-less paths
  // (e.g. "/") redirect to the user's last selected locale.
  if (pathLocale) {
    intlayerResponse.cookies.set(INTLAYER_COOKIE_NAME, pathLocale, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  // Locale redirect takes priority — skip auth check.
  if (!intlayerResponse.ok) {
    return intlayerResponse;
  }

  // Run auth check with the original request.
  const authResponse = await authProxy(request);
  if (!authResponse.ok) {
    return authResponse;
  }

  return intlayerResponse;
}

export const config = {
  matcher:
    "/((?!api|static|assets|robots|sitemap|sw|service-worker|manifest|.*\\..*|_next).*)",
};

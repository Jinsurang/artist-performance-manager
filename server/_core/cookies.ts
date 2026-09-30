import type { CookieOptions, Request } from "express";

type CookieOpts = {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
};

function buildSetCookie(name: string, value: string, opts: CookieOpts, maxAgeSec: number, expires: Date) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || "/"}`, `Max-Age=${maxAgeSec}`, `Expires=${expires.toUTCString()}`];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (typeof opts.sameSite === "string") parts.push(`SameSite=${opts.sameSite.charAt(0).toUpperCase()}${opts.sameSite.slice(1)}`);
  return parts.join("; ");
}

// Cloudflare Pages Functions에는 Express res가 없으므로, 같은 cookie()/clearCookie() 형태로 Set-Cookie 헤더를 쓴다.
// maxAge는 Express와 동일하게 밀리초 단위로 받는다.
export function createFetchCookieResponse(resHeaders: Headers) {
  return {
    cookie(name: string, value: string, options: CookieOpts = {}) {
      const maxAgeMs = options.maxAge ?? 0;
      resHeaders.append("Set-Cookie", buildSetCookie(name, value, options, Math.floor(maxAgeMs / 1000), new Date(Date.now() + maxAgeMs)));
    },
    clearCookie(name: string, options: CookieOpts = {}) {
      resHeaders.append("Set-Cookie", buildSetCookie(name, "", options, 0, new Date(0)));
    },
  };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: any) {
  if (req.protocol === "https" || (req.url && req.url.startsWith("https"))) return true;

  const getHeader = (name: string) => {
    if (typeof req.get === 'function') return req.get(name);
    if (req.headers && typeof req.headers.get === 'function') return req.headers.get(name);
    if (req.headers) return req.headers[name.toLowerCase()];
    return undefined;
  };

  const forwardedProto = getHeader("x-forwarded-proto");
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto: any) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: any
): any {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}

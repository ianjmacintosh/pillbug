import { getAdminStats, renderAdminHtml } from "../admin";
import { validateCfAccessJwt } from "../cf-access";
import { SECURITY_HEADERS, HTTPS_SECURITY_HEADERS } from "../security-headers";
import { type Repos } from "../session";
import type { Env } from "../env";

export async function handleGetAdmin(
  request: Request,
  env: Env,
  _repos: Repos,
): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const devBypass = env.CF_ACCESS_MOCK === "true" && !secure;
  const adminHeaders = {
    ...(secure ? HTTPS_SECURITY_HEADERS : SECURITY_HEADERS),
    "Cache-Control": "no-store, private",
  };
  if (!devBypass) {
    const token = request.headers.get("cf-access-jwt-assertion");
    if (!token) {
      return new Response("Unauthorized", {
        status: 401,
        headers: adminHeaders,
      });
    }
    const valid = await validateCfAccessJwt(
      token,
      env.CF_TEAM_DOMAIN ?? "",
      env.CF_ACCESS_AUD ?? "",
    );
    if (!valid) {
      return new Response("Unauthorized", {
        status: 401,
        headers: adminHeaders,
      });
    }
  }
  const stats = await getAdminStats(env.DB);
  return new Response(renderAdminHtml(stats), {
    headers: { ...adminHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

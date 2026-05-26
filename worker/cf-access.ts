import { jwtVerify, createRemoteJWKSet } from "jose";

const jwksResolvers = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  let resolver = jwksResolvers.get(teamDomain);
  if (!resolver) {
    resolver = createRemoteJWKSet(
      new URL(`${teamDomain}/cdn-cgi/access/certs`),
    );
    jwksResolvers.set(teamDomain, resolver);
  }
  return resolver;
}

export async function validateCfAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<boolean> {
  try {
    await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain,
      audience: aud,
      algorithms: ["RS256"],
    });
    return true;
  } catch {
    return false;
  }
}

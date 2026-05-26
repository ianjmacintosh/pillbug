import { jwtVerify, createRemoteJWKSet } from "jose";

export async function validateCfAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<boolean> {
  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${teamDomain}/cdn-cgi/access/certs`),
    );
    await jwtVerify(token, JWKS, {
      issuer: teamDomain,
      audience: aud,
    });
    return true;
  } catch {
    return false;
  }
}

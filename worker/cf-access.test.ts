import { beforeAll, describe, expect, test, vi } from "vitest";
import { validateCfAccessJwt } from "./cf-access";

const TEAM_DOMAIN = "https://test.cloudflareaccess.com";
const AUD = "test-audience-tag";
const KID = "test-kid-1";

let privateKey: CryptoKey;
let jwks: object;

function b64url(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  privateKey = pair.privateKey;
  const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  jwks = { keys: [{ ...pubJwk, kid: KID, use: "sig", alg: "RS256" }] };
});

function stubJwks(keys = jwks) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve(keys),
    }),
  );
}

async function makeToken(
  overrides: {
    aud?: string;
    exp?: number;
    issuer?: string;
  } = {},
): Promise<string> {
  const header = { alg: "RS256", kid: KID };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: overrides.issuer ?? TEAM_DOMAIN,
    aud: overrides.aud ?? AUD,
    exp: overrides.exp ?? now + 60,
    iat: now,
  };
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify(header)));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    enc.encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(sig)}`;
}

describe("validateCfAccessJwt", () => {
  test("returns true for a valid JWT", async () => {
    stubJwks();
    const token = await makeToken();
    const result = await validateCfAccessJwt(token, TEAM_DOMAIN, AUD);
    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });

  test("returns false when audience does not match", async () => {
    stubJwks();
    const token = await makeToken({ aud: "wrong-audience" });
    const result = await validateCfAccessJwt(token, TEAM_DOMAIN, AUD);
    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  test("returns false when token is expired", async () => {
    stubJwks();
    const token = await makeToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    const result = await validateCfAccessJwt(token, TEAM_DOMAIN, AUD);
    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  test("returns false when issuer does not match", async () => {
    stubJwks();
    const token = await makeToken({
      issuer: "https://evil.cloudflareaccess.com",
    });
    const result = await validateCfAccessJwt(token, TEAM_DOMAIN, AUD);
    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  test("returns false when JWKS fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    // Use a domain not seen by other tests so the module-level JWKS
    // resolver cache doesn't satisfy this request from a prior fetch.
    const freshDomain = "https://fetch-fail-test.cloudflareaccess.com";
    const token = await makeToken({ issuer: freshDomain });
    const result = await validateCfAccessJwt(token, freshDomain, AUD);
    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });
});

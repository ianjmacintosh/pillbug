import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeResendEmailSender } from "./resend-email-sender";
import { makeEmailSpy, makeInMemoryRepo } from "./test/auth-helpers";

vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./resend-email-sender", () => ({ makeResendEmailSender: vi.fn() }));
vi.mock("./health", () => ({ checkHealth: vi.fn() }));

function makeEnv(
  assetResponse = new Response("ok"),
): Parameters<typeof worker.fetch>[1] {
  return {
    ASSETS: { fetch: vi.fn().mockResolvedValue(assetResponse) },
    DB: {},
    RESEND_API_KEY: "test-key",
    APP_URL: "http://localhost",
    INVITE_CODE: "test-code",
  } as unknown as Parameters<typeof worker.fetch>[1];
}

beforeEach(() => {
  vi.mocked(makeD1AuthRepo).mockReturnValue(makeInMemoryRepo());
  vi.mocked(makeResendEmailSender).mockReturnValue(makeEmailSpy().sender);
});

describe("security headers", () => {
  test("are added to asset responses", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/app"),
      makeEnv(),
    );

    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000",
    );
  });

  test("preserve existing headers from the asset response", async () => {
    const assetResponse = new Response("<html>ok</html>", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ETag: '"abc123"',
      },
    });

    const response = await worker.fetch(
      new Request("http://localhost/app"),
      makeEnv(assetResponse),
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toBe('"abc123"');
  });
});

describe("session cookie", () => {
  let repo: ReturnType<typeof makeInMemoryRepo>;
  let email: ReturnType<typeof makeEmailSpy>;

  beforeEach(() => {
    repo = makeInMemoryRepo();
    email = makeEmailSpy();
    vi.mocked(makeD1AuthRepo).mockReturnValue(repo);
    vi.mocked(makeResendEmailSender).mockReturnValue(email.sender);
  });

  test("includes Secure, HttpOnly, and SameSite=Lax on HTTPS", async () => {
    const env = makeEnv();
    await worker.fetch(
      new Request("https://pillbug.example.com/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "patient@example.com",
          inviteCode: "test-code",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );
    const token = email.sent[0].token;

    const response = await worker.fetch(
      new Request(`https://pillbug.example.com/api/auth/verify?token=${token}`),
      env,
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).toContain("; Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  test("omits Secure on HTTP", async () => {
    const env = makeEnv();
    await worker.fetch(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "patient@example.com",
          inviteCode: "test-code",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );
    const token = email.sent[0].token;

    const response = await worker.fetch(
      new Request(`http://localhost/api/auth/verify?token=${token}`),
      env,
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).not.toContain("Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});

describe("clear session cookie", () => {
  test("includes Secure, HttpOnly, and SameSite=Lax on HTTPS", async () => {
    const response = await worker.fetch(
      new Request("https://pillbug.example.com/api/logout", { method: "POST" }),
      makeEnv(),
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).toContain("; Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  test("omits Secure on HTTP", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/logout", { method: "POST" }),
      makeEnv(),
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).not.toContain("Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});

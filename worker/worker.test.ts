import { beforeEach, describe, expect, test, vi } from "vitest";
import worker from "./worker";
import { Resend } from "resend";
import { makeD1AuthRepo } from "./d1-auth-repo";
import { makeEmailSender } from "./email-sender";
import { makeEmailSpy, makeInMemoryRepo } from "./test/auth-helpers";
import { verifyTurnstileToken } from "./turnstile";
import { checkHealth } from "./health";

vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("./d1-auth-repo", () => ({ makeD1AuthRepo: vi.fn() }));
vi.mock("./email-sender", () => ({ makeEmailSender: vi.fn() }));
vi.mock("./health", () => ({ checkHealth: vi.fn() }));
vi.mock("./turnstile", () => ({ verifyTurnstileToken: vi.fn() }));

function makeEnv(
  assetResponse = new Response("ok"),
): Parameters<typeof worker.fetch>[1] {
  return {
    ASSETS: { fetch: vi.fn().mockResolvedValue(assetResponse) },
    DB: {},
    RESEND_API_KEY: "test-key",
    APP_URL: "http://localhost",
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    EMAIL_SECRET: "test-email-secret",
    PIN_SECRET: "test-pin-secret",
  } as unknown as Parameters<typeof worker.fetch>[1];
}

function makeRegisterRequest(url: string) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify({
      email: "delivered@resend.dev",
      turnstileToken: "valid-token",
    }),
    headers: { "Content-Type": "application/json" },
  });
}

function makeLoginRequest(url: string) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify({
      email: "delivered@resend.dev",
      turnstileToken: "valid-token",
    }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.mocked(makeD1AuthRepo).mockReturnValue(makeInMemoryRepo());
  vi.mocked(makeEmailSender).mockReturnValue(makeEmailSpy().sender);
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
});

describe("security headers", () => {
  test("always-on headers are added to asset responses", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/app"),
      makeEnv(),
    );

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  test("CSP and HSTS are added on HTTPS", async () => {
    const response = await worker.fetch(
      new Request("https://pillbug.ianjmacintosh.com/app"),
      makeEnv(),
    );

    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    );
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000",
    );
  });

  test("CSP and HSTS are omitted on HTTP", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/app"),
      makeEnv(),
    );

    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
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
    vi.mocked(makeEmailSender).mockReturnValue(email.sender);
  });

  test("includes Secure, HttpOnly, and SameSite=Lax on HTTPS", async () => {
    const env = makeEnv();
    await worker.fetch(
      makeRegisterRequest("https://pillbug.ianjmacintosh.com/api/v1/register"),
      env,
    );
    const { token, pin } = email.sent[0];

    const response = await worker.fetch(
      new Request("https://pillbug.ianjmacintosh.com/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
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
      makeRegisterRequest("http://localhost/api/v1/register"),
      env,
    );
    const { token, pin } = email.sent[0];

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).not.toContain("Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});

describe("Resend lazy initialization", () => {
  test("Resend is not constructed on POST /api/v1/logout", async () => {
    vi.mocked(Resend).mockClear();

    await worker.fetch(
      new Request("http://localhost/api/v1/logout", { method: "POST" }),
      makeEnv(),
    );

    expect(Resend).not.toHaveBeenCalled();
  });

  test("makeEmailSender is not called on POST /api/v1/logout", async () => {
    vi.mocked(makeEmailSender).mockClear();

    await worker.fetch(
      new Request("http://localhost/api/v1/logout", { method: "POST" }),
      makeEnv(),
    );

    expect(makeEmailSender).not.toHaveBeenCalled();
  });

  test("Resend is not constructed on GET /api/v1/auth/verify", async () => {
    vi.mocked(Resend).mockClear();

    await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify?token=bad"),
      makeEnv(),
    );

    expect(Resend).not.toHaveBeenCalled();
  });

  test("makeEmailSender is not called on GET /api/v1/auth/verify", async () => {
    vi.mocked(makeEmailSender).mockClear();

    await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify?token=bad"),
      makeEnv(),
    );

    expect(makeEmailSender).not.toHaveBeenCalled();
  });
});

describe("unhandled exception handling", () => {
  test("returns status 500 when the handler throws", async () => {
    vi.mocked(makeD1AuthRepo).mockImplementation(() => {
      throw new Error("boom");
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/register", { method: "POST" }),
      makeEnv(),
    );

    expect(response.status).toBe(500);
  });

  test("returns JSON body with internal_error when the handler throws", async () => {
    vi.mocked(makeD1AuthRepo).mockImplementation(() => {
      throw new Error("boom");
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/register", { method: "POST" }),
      makeEnv(),
    );

    expect(await response.json()).toEqual({ error: "internal_error" });
  });

  test("sets Content-Type to application/json when the handler throws", async () => {
    vi.mocked(makeD1AuthRepo).mockImplementation(() => {
      throw new Error("boom");
    });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/register", { method: "POST" }),
      makeEnv(),
    );

    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("POST /api/v1/register email trimming", () => {
  test("strips surrounding whitespace from email before storing", async () => {
    const env = makeEnv();
    const email = makeEmailSpy();
    vi.mocked(makeEmailSender).mockReturnValue(email.sender);

    await worker.fetch(
      new Request("http://localhost/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          email: "delivered@resend.dev ",
          turnstileToken: "valid-token",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(email.sent[0].to).toBe("delivered@resend.dev");
  });
});

describe("POST /api/v1/register Turnstile validation", () => {
  test("returns 200 with token when Turnstile token is valid", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);

    const response = await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; token: string };
    expect(body.ok).toBe(true);
    expect(typeof body.token).toBe("string");
  });

  test("returns 403 when Turnstile token is invalid", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);

    const response = await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      makeEnv(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_turnstile_token" });
  });
});

describe("POST /api/v1/login email trimming", () => {
  test("strips surrounding whitespace so a spaced email finds the existing account", async () => {
    const env = makeEnv();
    const repo = makeInMemoryRepo();
    const email = makeEmailSpy();
    vi.mocked(makeD1AuthRepo).mockReturnValue(repo);
    vi.mocked(makeEmailSender).mockReturnValue(email.sender);

    await worker.fetch(
      new Request("http://localhost/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          email: "delivered@resend.dev",
          turnstileToken: "valid-token",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );
    await worker.fetch(
      new Request("http://localhost/api/v1/login", {
        method: "POST",
        body: JSON.stringify({
          email: "delivered@resend.dev ",
          turnstileToken: "valid-token",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(email.sent[1].type).toBe("login");
    expect(email.sent[1].to).toBe("delivered@resend.dev");
  });
});

describe("POST /api/v1/login Turnstile validation", () => {
  test("returns 200 with token when Turnstile token is valid", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);

    const response = await worker.fetch(
      makeLoginRequest("http://localhost/api/v1/login"),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; token: string };
    expect(body.ok).toBe(true);
    expect(typeof body.token).toBe("string");
  });

  test("returns 403 when Turnstile token is invalid", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);

    const response = await worker.fetch(
      makeLoginRequest("http://localhost/api/v1/login"),
      makeEnv(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_turnstile_token" });
  });
});

describe("GET /api/v1/session", () => {
  let repo: ReturnType<typeof makeInMemoryRepo>;

  beforeEach(() => {
    repo = makeInMemoryRepo();
    vi.mocked(makeD1AuthRepo).mockReturnValue(repo);
  });

  test("returns 401 when no session cookie is present", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/session"),
      makeEnv(),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "not_authenticated" });
  });

  test("returns 401 when session cookie does not match a session", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/session", {
        headers: { Cookie: "session=unknown-session-id" },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "not_authenticated" });
  });

  test("returns 200 with patientId when session is valid", async () => {
    await repo.createPatient(
      "patient-1",
      "delivered@resend.dev",
      new Date().toISOString(),
    );
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await repo.createSession("session-id-1", "patient-1", expiresAt);

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/session", {
        headers: { Cookie: "session=session-id-1" },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      patientId: string;
      registrationDate: string | null;
    };
    expect(body.ok).toBe(true);
    expect(body.patientId).toBe("patient-1");
    expect(body.registrationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("POST /api/v1/auth/verify-pin", () => {
  let repo: ReturnType<typeof makeInMemoryRepo>;
  let email: ReturnType<typeof makeEmailSpy>;

  beforeEach(() => {
    repo = makeInMemoryRepo();
    email = makeEmailSpy();
    vi.mocked(makeD1AuthRepo).mockReturnValue(repo);
    vi.mocked(makeEmailSender).mockReturnValue(email.sender);
  });

  test("returns 200 with ok:true and sets session cookie on correct PIN", async () => {
    const env = makeEnv();
    await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      env,
    );
    const { token, pin } = email.sent[0];

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("Set-Cookie")).toContain("session=");
  });

  test("returns 400 with error:expired for an unknown token", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token: "no-such-token", pin: "1234" }),
        headers: { "Content-Type": "application/json" },
      }),
      makeEnv(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "expired" });
  });

  test("returns 400 with error:expired for an expired token", async () => {
    const env = makeEnv();
    await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      env,
    );
    const { token, pin } = email.sent[0];

    vi.setSystemTime(new Date(Date.now() + 21 * 60 * 1000));
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );
    vi.useRealTimers();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "expired" });
  });

  test("returns 400 with error:used for an already-redeemed token", async () => {
    const env = makeEnv();
    await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      env,
    );
    const { token, pin } = email.sent[0];
    await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "used" });
  });

  test("returns 400 with error:locked after 5 failed attempts", async () => {
    const env = makeEnv();
    await worker.fetch(
      makeRegisterRequest("http://localhost/api/v1/register"),
      env,
    );
    const { token } = email.sent[0];
    for (let i = 0; i < 5; i++) {
      await worker.fetch(
        new Request("http://localhost/api/v1/auth/verify-pin", {
          method: "POST",
          body: JSON.stringify({ token, pin: "0000" }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );
    }

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ token, pin: "0000" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "locked" });
  });
});

describe("GET /api/v1/health", () => {
  test("returns health status", async () => {
    vi.mocked(checkHealth).mockResolvedValue({ db: "ok", email: "ok" });

    const response = await worker.fetch(
      new Request("http://localhost/api/v1/health"),
      makeEnv(),
    );

    expect(await response.json()).toEqual({ db: "ok", email: "ok" });
  });
});

describe("clear session cookie", () => {
  test("includes Secure, HttpOnly, and SameSite=Lax on HTTPS", async () => {
    const response = await worker.fetch(
      new Request("https://pillbug.ianjmacintosh.com/api/v1/logout", {
        method: "POST",
      }),
      makeEnv(),
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).toContain("; Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  test("omits Secure on HTTP", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/v1/logout", { method: "POST" }),
      makeEnv(),
    );

    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).not.toContain("Secure");
    expect(cookie).toContain("; HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});

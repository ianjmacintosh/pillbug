const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
): Promise<boolean> {
  const body = new FormData();
  body.append("secret", secretKey);
  body.append("response", token);

  const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

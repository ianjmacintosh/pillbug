// HTML templates are bundled as strings at build time via Vite's ?raw import.
// https://vite.dev/guide/assets#importing-a-file-as-string
import verificationTemplate from "./emails/verification.html?raw";
import loginTemplate from "./emails/login.html?raw";
import { Resend } from "resend";
import type { EmailSender } from "./auth";
import { t } from "../shared/t";

function renderTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  return Object.entries(tokens).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function makeResendEmailSender(apiKey: string, appUrl: string): EmailSender {
  const resend = new Resend(apiKey);

  async function send(to: string, subject: string, html: string) {
    const { error } = await resend.emails.send({
      from: "Pillbug <noreply@mail.pillbug.ianjmacintosh.com>",
      to,
      subject,
      html,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    async sendVerificationEmail(to, token, pin, language) {
      const fallbackLink = `${appUrl}/enter-code?token=${token}&pin=${pin}`;
      await send(
        to,
        t("email.verificationSubject", language),
        renderTemplate(verificationTemplate, {
          pin,
          fallback_link: fallbackLink,
          login_link: `${appUrl}/login?email=${encodeURIComponent(to)}`,
        }),
      );
    },

    async sendLoginEmail(to, token, pin, language) {
      const fallbackLink = `${appUrl}/enter-code?token=${token}&pin=${pin}`;
      await send(
        to,
        t("email.loginSubject", language),
        renderTemplate(loginTemplate, {
          pin,
          fallback_link: fallbackLink,
          login_link: `${appUrl}/login?email=${encodeURIComponent(to)}`,
        }),
      );
    },
  };
}

export function makeEmailSender(
  emailMock: string | undefined,
  apiKey: string | undefined,
  origin: string,
): EmailSender {
  if (emailMock === "true" || !apiKey) {
    return {
      sendVerificationEmail: async () => {},
      sendLoginEmail: async () => {},
    };
  }
  return makeResendEmailSender(apiKey, origin);
}

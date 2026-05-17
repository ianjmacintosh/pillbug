// HTML templates are bundled as strings at build time via Vite's ?raw import.
// https://vite.dev/guide/assets#importing-a-file-as-string
import verificationTemplate from "./emails/verification.html?raw";
import loginTemplate from "./emails/login.html?raw";
import { Resend } from "resend";
import type { EmailSender } from "./auth";

function renderTemplate(template: string, magicLink: string): string {
  return template.replaceAll("{{magic_link}}", magicLink);
}

export function makeResendEmailSender(
  apiKey: string,
  appUrl: string,
): EmailSender {
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
    async sendVerificationEmail(to, token) {
      const magicLink = `${appUrl}/verify?token=${token}`;
      await send(
        to,
        "Verify your Pillbug account",
        renderTemplate(verificationTemplate, magicLink),
      );
    },

    async sendLoginEmail(to, token) {
      const magicLink = `${appUrl}/verify?token=${token}`;
      await send(
        to,
        "Your Pillbug sign-in link",
        renderTemplate(loginTemplate, magicLink),
      );
    },
  };
}

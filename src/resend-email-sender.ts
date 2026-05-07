import type { EmailSender } from "./auth";

export function makeResendEmailSender(
  apiKey: string,
  appUrl: string,
): EmailSender {
  return {
    async sendMagicLink(to, token) {
      const magicLink = `${appUrl}/api/auth/verify?token=${token}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Pillbug <noreply@mail.pillbug.ianjmacintosh.com>",
          to,
          subject: "Your Pillbug sign-in link",
          html: `<p>Click the link below to sign in to Pillbug. It expires in 20 minutes.</p><p><a href="${magicLink}">${magicLink}</a></p>`,
        }),
      });
    },
  };
}

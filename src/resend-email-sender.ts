import { Resend } from "resend";
import type { EmailSender } from "./auth";

export function makeResendEmailSender(
  apiKey: string,
  appUrl: string,
): EmailSender {
  const resend = new Resend(apiKey);
  return {
    async sendMagicLink(to, token) {
      const magicLink = `${appUrl}/api/auth/verify?token=${token}`;
      const { error } = await resend.emails.send({
        from: "Pillbug <noreply@mail.pillbug.ianjmacintosh.com>",
        to,
        subject: "Your Pillbug sign-in link",
        html: `<p>Click the link below to sign in to Pillbug. It expires in 20 minutes.</p><p><a href="${magicLink}">${magicLink}</a></p>`,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

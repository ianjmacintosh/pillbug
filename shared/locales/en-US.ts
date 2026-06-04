const enUS = {
  "register.heading": "Create your account",
  "register.emailLabel": "Email",
  "register.turnstileError":
    "Security check failed. Please reload the page and try again.",
  "register.iAgreeToThe": "I agree to the",
  "register.termsOfService": "Terms of Service",
  "register.and": "and",
  "register.privacyPolicy": "Privacy Policy",
  "register.termsError": "You must accept the Terms of Service to register.",
  "register.serverError": "Something went wrong. Please try again.",
  "register.submitting": "Sending…",
  "register.submit": "Email me a login link",
  "register.alreadyHaveAccount": "Already have an account?",
  "register.logIn": "Log in",
} as const;

export type LocaleKeys = keyof typeof enUS;

export default enUS;

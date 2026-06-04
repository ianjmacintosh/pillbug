const enUS = {
  "header.brand": "Pillbug",
  "header.nav.home": "Home",
  "header.nav.prescriptions": "Prescriptions",
  "header.nav.fillSession": "Fill Session",
  "header.nav.settings": "Settings",
  "header.nav.logOut": "Log out",
  "footer.termsOfService": "Terms of Service",
  "footer.privacyPolicy": "Privacy Policy",
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

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { applyStoredLanguage } from "../../lib/applyStoredLanguage";
import App from "../App";
import FillSession from "../FillSession";
import Layout from "../Layout";
import Login from "../Login";
import Logout from "../Logout";
import NotFound from "../NotFound";
import Prescriptions from "../Prescriptions";
import Privacy from "../Privacy";
import Register from "../Register";
import CompleteSetup from "../CompleteSetup";
import Settings from "../Settings";
import Terms from "../Terms";
import EnterCode from "../EnterCode";
import PrescriptionDetail from "../PrescriptionDetail";
import {
  EditPrescriptionForm,
  NewPrescriptionForm,
} from "../PrescriptionForm/PrescriptionForm";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: Layout,
});

async function requireAuth() {
  let res: Response;
  try {
    res = await fetch("/api/v1/session");
  } catch {
    return; // offline — let the app load
  }
  if (!res.ok) {
    throw redirect({ to: "/login" });
  }
}

async function requireTimezone() {
  let res: Response;
  try {
    res = await fetch("/api/v1/account");
  } catch {
    return; // offline — let the app load
  }
  if (!res.ok) {
    throw redirect({ to: "/login" });
  }
  const data = (await res.json()) as {
    timezone: string | null;
    language: string | null;
  };
  await applyStoredLanguage(data.language ?? null);
  if (!data.timezone) {
    throw redirect({ to: "/finish-setup" });
  }
}

async function redirectIfAuthenticated() {
  let res: Response;
  try {
    res = await fetch("/api/v1/session");
  } catch {
    return;
  }
  if (res.ok) {
    throw redirect({ to: "/" });
  }
}

const indexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  loader: async () => {
    let res: Response;
    try {
      res = await fetch("/api/v1/account");
    } catch {
      return { registrationDate: null };
    }
    if (!res.ok) {
      throw redirect({ to: "/register" });
    }
    const data = (await res.json()) as {
      registrationDate: string | null;
      timezone: string | null;
      language: string | null;
    };
    await applyStoredLanguage(data.language ?? null);
    if (!data.timezone) {
      throw redirect({ to: "/finish-setup" });
    }
    return { registrationDate: data.registrationDate, timezone: data.timezone };
  },
  component: App,
});

const registerRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/register",
  beforeLoad: redirectIfAuthenticated,
  component: Register,
});

const loginRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/login",
  beforeLoad: redirectIfAuthenticated,
  component: Login,
});

const termsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/terms",
  component: Terms,
});

const privacyRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/privacy",
  component: Privacy,
});

const completeSetupRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/finish-setup",
  beforeLoad: requireAuth,
  component: CompleteSetup,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  beforeLoad: requireAuth,
  loader: async () => {
    const res = await fetch("/api/v1/account");
    if (!res.ok) throw redirect({ to: "/login" });
    const data = (await res.json()) as { timezone: string | null };
    return { timezone: data.timezone };
  },
  component: Settings,
});

const fillSessionRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/fill-session",
  beforeLoad: requireTimezone,
  component: FillSession,
});

const prescriptionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/prescriptions",
  beforeLoad: requireTimezone,
  component: Prescriptions,
});

const prescriptionNewRoute = createRoute({
  getParentRoute: () => prescriptionsRoute,
  path: "new",
  beforeLoad: requireAuth,
  component: NewPrescriptionForm,
});

const prescriptionDetailRoute = createRoute({
  getParentRoute: () => prescriptionsRoute,
  path: "$id",
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const res = await fetch(`/api/v1/prescriptions/${params.id}`);
    if (!res.ok) throw redirect({ to: "/prescriptions" });
    return res.json();
  },
  component: PrescriptionDetail,
});

const prescriptionEditRoute = createRoute({
  getParentRoute: () => prescriptionsRoute,
  path: "$id/edit",
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const res = await fetch(`/api/v1/prescriptions/${params.id}`);
    if (!res.ok) throw redirect({ to: "/prescriptions" });
    return res.json();
  },
  component: EditPrescriptionForm,
});

const logoutRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/logout",
  beforeLoad: requireAuth,
  component: Logout,
});

const enterCodeRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/enter-code",
  component: EnterCode,
});

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    indexRoute,
    registerRoute,
    loginRoute,
    termsRoute,
    privacyRoute,
    completeSetupRoute,
    settingsRoute,
    fillSessionRoute,
    prescriptionsRoute.addChildren([
      prescriptionNewRoute,
      prescriptionDetailRoute,
      prescriptionEditRoute,
    ]),
    logoutRoute,
    enterCodeRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;

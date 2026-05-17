import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import App from "../App";
import CheckYourEmail from "../CheckYourEmail";
import FillSession from "../FillSession";
import Layout from "../Layout";
import Login from "../Login";
import Logout from "../Logout";
import NotFound from "../NotFound";
import Prescriptions from "../Prescriptions";
import Privacy from "../Privacy";
import Register from "../Register";
import Settings from "../Settings";
import Terms from "../Terms";
import Verify from "../Verify";

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

async function requireAuthHome() {
  let res: Response;
  try {
    res = await fetch("/api/v1/session");
  } catch {
    return;
  }
  if (!res.ok) {
    throw redirect({ to: "/register" });
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
  beforeLoad: requireAuthHome,
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

const checkYourEmailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/check-your-email",
  component: CheckYourEmail,
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

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  beforeLoad: requireAuth,
  component: Settings,
});

const fillSessionRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/fill-session",
  beforeLoad: requireAuth,
  component: FillSession,
});

const prescriptionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/prescriptions",
  beforeLoad: requireAuth,
  component: Prescriptions,
});

const logoutRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/logout",
  beforeLoad: requireAuth,
  component: Logout,
});

const verifyRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/verify",
  beforeLoad: redirectIfAuthenticated,
  component: Verify,
});

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    indexRoute,
    registerRoute,
    loginRoute,
    checkYourEmailRoute,
    termsRoute,
    privacyRoute,
    settingsRoute,
    fillSessionRoute,
    prescriptionsRoute,
    logoutRoute,
    verifyRoute,
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

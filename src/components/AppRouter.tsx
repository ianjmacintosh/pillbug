import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import App from "./App";
import CheckYourEmail from "./CheckYourEmail";
import Login from "./Login";
import NotFound from "./NotFound";
import Register from "./Register";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    let res: Response;
    try {
      res = await fetch("/api/session");
    } catch {
      return; // offline — let the app load
    }
    if (!res.ok) {
      throw redirect({ to: "/register" });
    }
  },
  component: App,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: Register,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const checkYourEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/check-your-email",
  component: CheckYourEmail,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  registerRoute,
  loginRoute,
  checkYourEmailRoute,
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

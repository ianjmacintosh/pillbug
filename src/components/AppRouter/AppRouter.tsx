import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import App from "../App";
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
import EnterCode from "../EnterCode";
import PrescriptionDetail, {
  type Prescription as PrescriptionDetailData,
} from "../PrescriptionDetail";

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
      res = await fetch("/api/v1/session");
    } catch {
      return { registrationDate: null };
    }
    if (!res.ok) {
      throw redirect({ to: "/register" });
    }
    const data = (await res.json()) as { registrationDate: string | null };
    return { registrationDate: data.registrationDate };
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

const DEMO_PRESCRIPTIONS: Record<string, PrescriptionDetailData> = {
  // Daily, two dose times, no end date
  daily: {
    id: "daily",
    drugName: "Metformin",
    dosage: "500 mg",
    doseForm: "tablet",
    schedule: {
      days: {
        sunday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        monday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        tuesday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        wednesday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        thursday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        friday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
        saturday: [
          { time: "09:00", quantity: 2 },
          { time: "21:00", quantity: 1 },
        ],
      },
      timezoneMode: "local" as const,
    },
    startDate: "2024-01-15",
    endDate: null,
    prescribingDoctor: "Dr. Smith",
    instructions: "Take with food",
    status: "active",
  },
  // Weekdays vs weekend: two routines with different slots
  split: {
    id: "split",
    drugName: "Lisinopril",
    dosage: "10 mg",
    doseForm: "tablet",
    schedule: {
      days: {
        monday: [{ time: "08:00", quantity: 1 }],
        tuesday: [{ time: "08:00", quantity: 1 }],
        wednesday: [{ time: "08:00", quantity: 1 }],
        thursday: [{ time: "08:00", quantity: 1 }],
        friday: [{ time: "08:00", quantity: 1 }],
        saturday: [{ time: "10:00", quantity: 1 }],
        sunday: [{ time: "10:00", quantity: 1 }],
      },
      timezoneMode: "local" as const,
    },
    startDate: "2023-06-01",
    endDate: "2026-06-01",
    prescribingDoctor: null,
    instructions: null,
    status: "active",
  },
  // Three-times-a-week, single dose time, with end date
  mwf: {
    id: "mwf",
    drugName: "Alendronate",
    dosage: "70 mg",
    doseForm: "tablet",
    schedule: {
      days: {
        monday: [{ time: "07:00", quantity: 1 }],
        wednesday: [{ time: "07:00", quantity: 1 }],
        friday: [{ time: "07:00", quantity: 1 }],
      },
      timezoneMode: "local" as const,
    },
    startDate: "2025-03-10",
    endDate: "2025-09-10",
    prescribingDoctor: "Dr. Patel",
    instructions: "Take on an empty stomach with a full glass of water",
    status: "active",
  },
  // Single day, single slot — minimal schedule
  single: {
    id: "single",
    drugName: "Zolpidem",
    dosage: "5 mg",
    doseForm: "tablet",
    schedule: {
      days: {
        sunday: [{ time: "22:00", quantity: 1 }],
      },
      timezoneMode: "local" as const,
    },
    startDate: "2025-11-01",
    endDate: null,
    prescribingDoctor: "Dr. Lee",
    instructions: null,
    status: "active",
  },
};

const prescriptionDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/prescriptions/$id",
  beforeLoad: requireAuth,
  loader: ({ params }) =>
    DEMO_PRESCRIPTIONS[params.id] ?? DEMO_PRESCRIPTIONS["daily"],
  component: PrescriptionDetail,
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
    settingsRoute,
    fillSessionRoute,
    prescriptionsRoute,
    prescriptionDetailRoute,
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

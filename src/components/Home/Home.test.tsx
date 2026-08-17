import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import Home from "./Home";

function mockFetchJson(routes: Record<string, unknown>) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    for (const [path, body] of Object.entries(routes)) {
      if (url.includes(path)) {
        return Promise.resolve(new Response(JSON.stringify(body)));
      }
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
}

async function renderHome() {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const homeRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/",
    component: Home,
  });
  const fillSessionStepRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/fill-session/$step",
    component: Outlet,
  });
  const prescriptionsRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions",
    component: Outlet,
  });
  const prescriptionsNewRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/new",
    component: Outlet,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      layoutRoute.addChildren([
        homeRoute,
        fillSessionStepRoute,
        prescriptionsRoute,
        prescriptionsNewRoute,
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

describe("Home", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders a Start Fill Session CTA linking to /fill-session/step1 when the patient has prescriptions", async () => {
    mockFetchJson({
      "/api/v1/prescriptions": [{ id: "rx-1" }],
      "/api/v1/account": { timezone: "America/Chicago", lastFilledAt: null },
    });

    await renderHome();

    const cta = await waitFor(() =>
      screen.getByRole("link", { name: /start fill session/i }),
    );
    expect(cta.getAttribute("href")).toBe("/fill-session/step1");
  });

  test("renders a View Prescriptions link to /prescriptions", async () => {
    mockFetchJson({
      "/api/v1/prescriptions": [{ id: "rx-1" }],
      "/api/v1/account": { timezone: "America/Chicago", lastFilledAt: null },
    });

    await renderHome();

    const link = await waitFor(() =>
      screen.getByRole("link", { name: /view prescriptions/i }),
    );
    expect(link.getAttribute("href")).toBe("/prescriptions");
  });

  test("shows the last-filled date when a completed Fill Session exists", async () => {
    mockFetchJson({
      "/api/v1/prescriptions": [{ id: "rx-1" }],
      "/api/v1/account": {
        timezone: "America/Chicago",
        lastFilledAt: "2024-03-08T08:00:00.000Z",
      },
    });

    await renderHome();

    await waitFor(() => screen.getByText(/last filled/i));
    expect(screen.getByText(/march 8, 2024/i)).toBeTruthy();
  });

  test("omits the last-filled date when no Fill Session has been completed", async () => {
    mockFetchJson({
      "/api/v1/prescriptions": [{ id: "rx-1" }],
      "/api/v1/account": { timezone: "America/Chicago", lastFilledAt: null },
    });

    await renderHome();

    await waitFor(() =>
      screen.getByRole("link", { name: /start fill session/i }),
    );
    expect(screen.queryByText(/last filled/i)).toBeNull();
  });

  test("swaps the CTA to Add your first prescription when the patient has zero prescriptions", async () => {
    mockFetchJson({
      "/api/v1/prescriptions": [],
      "/api/v1/account": { timezone: "America/Chicago", lastFilledAt: null },
    });

    await renderHome();

    const cta = await waitFor(() =>
      screen.getByRole("link", { name: /add your first prescription/i }),
    );
    expect(cta.getAttribute("href")).toBe("/prescriptions/new");
    expect(
      screen.queryByRole("link", { name: /start fill session/i }),
    ).toBeNull();
  });
});

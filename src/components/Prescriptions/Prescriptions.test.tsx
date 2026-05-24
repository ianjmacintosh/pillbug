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
import Prescriptions from "./Prescriptions";

const SAMPLE_PRESCRIPTION = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

async function renderList() {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const listRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions",
    component: Prescriptions,
  });
  const detailRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/$id",
    component: Outlet,
  });
  const newRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/new",
    component: Outlet,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      layoutRoute.addChildren([listRoute, newRoute, detailRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/prescriptions"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("Prescriptions", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders a heading", async () => {
    await renderList();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  describe("on mount", () => {
    test("prescriptions load automatically without any button click", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByText("Metformin"));
    });

    test("heading shows prescription count", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
          "(1)",
        ),
      );
    });
  });

  describe("list navigation", () => {
    test("prescription name renders as a link to its detail route", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByText("Metformin"));

      const link = screen.getByRole("link", { name: "Metformin" });
      expect(link.getAttribute("href")).toBe("/prescriptions/rx-1");
    });

    test("no delete button appears in the prescription list", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByText("Metformin"));

      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    test("'+ Add Prescription' is a link to /prescriptions/new", async () => {
      await renderList();
      const link = screen.getByRole("link", { name: /add prescription/i });
      expect(link.getAttribute("href")).toBe("/prescriptions/new");
    });
  });
});

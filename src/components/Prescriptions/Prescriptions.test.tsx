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
import PrescriptionDetail, {
  type Prescription,
} from "../PrescriptionDetail/PrescriptionDetail";
import Prescriptions from "./Prescriptions";

const SAMPLE_PRESCRIPTION = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: { monday: [{ time: "08:00", quantity: 1 }] } },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

const SAMPLE_DETAIL: Prescription = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500 mg",
  doseForm: "tablet",
  schedule: {
    days: { monday: [{ time: "09:00", quantity: 1 }] },
  },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

function buildPrescriptionsRouter(
  initialPath: string,
  rightPanelRoute?: ReturnType<typeof createRoute>,
) {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const prescriptionsRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions",
    component: Prescriptions,
  });
  const newRoute = createRoute({
    getParentRoute: () => prescriptionsRoute,
    path: "new",
    component: Outlet,
  });
  const placeholderDetailRoute = createRoute({
    getParentRoute: () => prescriptionsRoute,
    path: "$id",
    component: Outlet,
  });

  const children = rightPanelRoute
    ? [newRoute, rightPanelRoute]
    : [newRoute, placeholderDetailRoute];

  return createRouter({
    routeTree: rootRoute.addChildren([
      layoutRoute.addChildren([prescriptionsRoute.addChildren(children)]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

async function renderList() {
  const router = buildPrescriptionsRouter("/prescriptions");
  await router.load();
  return render(<RouterProvider router={router} />);
}

async function renderWithDetail(
  prescription: Prescription = SAMPLE_DETAIL,
  initialPath = `/prescriptions/${SAMPLE_DETAIL.id}`,
) {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const prescriptionsRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions",
    component: Prescriptions,
  });
  const detailRoute = createRoute({
    getParentRoute: () => prescriptionsRoute,
    path: "$id",
    loader: () => prescription,
    component: PrescriptionDetail,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      layoutRoute.addChildren([prescriptionsRoute.addChildren([detailRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return { router };
}

describe("Prescriptions", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders a heading", async () => {
    await renderList();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  describe("loading state", () => {
    test("shows a loading indicator while the API fetch is pending", async () => {
      let resolveFetch!: (v: Response) => void;
      vi.spyOn(globalThis, "fetch").mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );
      await renderList();
      expect(screen.getByRole("status")).toBeTruthy();
      resolveFetch(new Response(JSON.stringify([]), { status: 200 }));
    });
  });

  describe("on mount", () => {
    test("prescriptions load automatically without any button click", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
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
      const link = await waitFor(() =>
        screen.getByRole("link", { name: /metformin/i }),
      );
      expect(link.getAttribute("href")).toBe("/prescriptions/rx-1");
    });

    test("no delete button appears when prescriptions exist at /prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));

      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    test("'+ Add Prescription' is a link to /prescriptions/new", async () => {
      await renderList();
      const link = screen.getByRole("link", { name: /add prescription/i });
      expect(link.getAttribute("href")).toBe("/prescriptions/new");
    });
  });

  describe("navigation stability", () => {
    test("stays at /prescriptions when prescriptions exist — no auto-navigate", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      const router = buildPrescriptionsRouter("/prescriptions");
      await router.load();
      render(<RouterProvider router={router} />);
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      expect(router.state.location.pathname).toBe("/prescriptions");
    });

    test("does not auto-navigate when already at a specific prescription", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      const { router } = await renderWithDetail();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      expect(router.state.location.pathname).toBe(
        `/prescriptions/${SAMPLE_PRESCRIPTION.id}`,
      );
    });
  });

  describe("select prompt", () => {
    test("shows a select prompt when prescriptions exist at /prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      expect(screen.getByText(/select a prescription/i)).toBeTruthy();
    });
  });

  describe("empty state", () => {
    test("shows Create Prescription form when no prescriptions at /prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      await renderList();
      await waitFor(() =>
        screen.getByRole("heading", { name: /add prescription/i, level: 2 }),
      );
    });

    test("back button is not shown when at /prescriptions with no prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      await renderList();
      await waitFor(() =>
        screen.getByRole("heading", { name: /add prescription/i, level: 2 }),
      );
      expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
    });

    test("back button is visible when at /prescriptions/:id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderWithDetail();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      expect(screen.getByRole("button", { name: /back/i })).toBeTruthy();
    });
  });

  describe("mobile panel class", () => {
    test("applies prescriptions--mobile-form when no prescriptions at /prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      await renderList();
      await waitFor(() =>
        screen.getByRole("heading", { name: /add prescription/i, level: 2 }),
      );
      expect(screen.getByRole("main").className).toContain(
        "prescriptions--mobile-form",
      );
    });

    test("applies prescriptions--mobile-list when prescriptions exist at /prescriptions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      expect(screen.getByRole("main").className).toContain(
        "prescriptions--mobile-list",
      );
    });
  });

  describe("split panel", () => {
    test("at /prescriptions/$id shows both the list panel and the detail panel", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderWithDetail();
      // Detail panel: h2 heading renders immediately from loader
      expect(
        screen.getByRole("heading", { name: "Metformin", level: 2 }),
      ).toBeTruthy();
      // List panel: link loads after fetch
      await waitFor(() =>
        expect(screen.getByRole("link", { name: /metformin/i })).toBeTruthy(),
      );
    });

    test("selected prescription item has --selected class", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderWithDetail();
      await waitFor(() => screen.getByRole("link", { name: /metformin/i }));
      const item = screen
        .getByRole("link", { name: /metformin/i })
        .closest("li");
      expect(item?.className).toContain("prescription-item--selected");
    });
  });

  describe("prescription list item", () => {
    test("shows schedule summary as a second line inside the link", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByText("Mon: 8:00 AM"));
    });

    test("each list item renders a chevron icon", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      await renderList();
      await waitFor(() => screen.getByText("Mon: 8:00 AM"));
      // ChevronRight renders an svg; the list item should contain one
      const item = screen.getByText("Mon: 8:00 AM").closest("li");
      expect(item?.querySelector("svg")).toBeTruthy();
    });
  });
});

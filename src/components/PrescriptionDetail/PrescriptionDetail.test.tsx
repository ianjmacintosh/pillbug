import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PrescriptionDetail from "./PrescriptionDetail";
import type { Prescription } from "./PrescriptionDetail";

const ALL_DAYS_SLOTS = {
  sunday: [{ time: "09:00", quantity: 2 }],
  monday: [{ time: "09:00", quantity: 2 }],
  tuesday: [{ time: "09:00", quantity: 2 }],
  wednesday: [{ time: "09:00", quantity: 2 }],
  thursday: [{ time: "09:00", quantity: 2 }],
  friday: [{ time: "09:00", quantity: 2 }],
  saturday: [{ time: "09:00", quantity: 2 }],
};

const SAMPLE_PRESCRIPTION: Prescription = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500 mg",
  doseForm: "tablet",
  schedule: {
    days: ALL_DAYS_SLOTS,
    timezoneMode: "local",
  },
  startDate: "2024-01-15",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

async function renderDetail(prescription: Prescription = SAMPLE_PRESCRIPTION) {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const detailRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/$id",
    loader: () => prescription,
    component: PrescriptionDetail,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute.addChildren([detailRoute])]),
    history: createMemoryHistory({
      initialEntries: ["/prescriptions/rx-1"],
    }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("PrescriptionDetail", () => {
  describe("dates", () => {
    test("shows start date formatted as MM/DD/YYYY", async () => {
      await renderDetail();
      expect(screen.getByText("01/15/2024")).toBeTruthy();
    });

    test("shows 'N/A (On-going)' when end date is null", async () => {
      await renderDetail({ ...SAMPLE_PRESCRIPTION, endDate: null });
      expect(screen.getByText("N/A (On-going)")).toBeTruthy();
    });

    test("shows end date formatted as MM/DD/YYYY when present", async () => {
      await renderDetail({ ...SAMPLE_PRESCRIPTION, endDate: "2026-12-31" });
      expect(screen.getByText("12/31/2026")).toBeTruthy();
    });
  });

  describe("schedule routines", () => {
    test("shows 'Daily' heading when all 7 days share the same slots", async () => {
      await renderDetail();
      expect(screen.getByRole("heading", { name: "Daily" })).toBeTruthy();
    });

    test("shows abbreviated day list for subset of days", async () => {
      const rx = {
        ...SAMPLE_PRESCRIPTION,
        schedule: {
          ...SAMPLE_PRESCRIPTION.schedule,
          days: {
            monday: [{ time: "09:00", quantity: 1 }],
            wednesday: [{ time: "09:00", quantity: 1 }],
            friday: [{ time: "09:00", quantity: 1 }],
          },
        },
      };
      await renderDetail(rx);
      expect(
        screen.getByRole("heading", { name: "Mon, Wed, Fri" }),
      ).toBeTruthy();
    });

    test("shows single day abbreviation for one-day schedule", async () => {
      const rx = {
        ...SAMPLE_PRESCRIPTION,
        schedule: {
          ...SAMPLE_PRESCRIPTION.schedule,
          days: {
            monday: [{ time: "09:00", quantity: 1 }],
          },
        },
      };
      await renderDetail(rx);
      expect(screen.getByRole("heading", { name: "Mon" })).toBeTruthy();
    });

    test("shows one heading per routine when days have different slot patterns", async () => {
      const rx = {
        ...SAMPLE_PRESCRIPTION,
        schedule: {
          ...SAMPLE_PRESCRIPTION.schedule,
          days: {
            monday: [{ time: "09:00", quantity: 2 }],
            wednesday: [{ time: "09:00", quantity: 2 }],
            friday: [{ time: "09:00", quantity: 2 }],
            tuesday: [{ time: "21:00", quantity: 1 }],
            thursday: [{ time: "21:00", quantity: 1 }],
          },
        },
      };
      await renderDetail(rx);
      expect(
        screen.getByRole("heading", { name: "Mon, Wed, Fri" }),
      ).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Tue, Thu" })).toBeTruthy();
    });
  });

  describe("dose slots table", () => {
    test("shows time formatted as 12-hour with AM/PM (no leading zero)", async () => {
      await renderDetail();
      expect(screen.getByText("9:00 AM")).toBeTruthy();
    });

    test("shows quantity with form factor", async () => {
      await renderDetail();
      expect(screen.getByText("2 tablets")).toBeTruthy();
    });

    test("shows multiple slots when daily schedule has two dose times", async () => {
      const rx = {
        ...SAMPLE_PRESCRIPTION,
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
      };
      await renderDetail(rx);
      expect(screen.getByText("9:00 AM")).toBeTruthy();
      expect(screen.getByText("9:00 PM")).toBeTruthy();
      expect(screen.getByText("2 tablets")).toBeTruthy();
      expect(screen.getByText("1 tablet")).toBeTruthy();
    });
  });

  describe("drug name and dosage", () => {
    test("shows drug name", async () => {
      await renderDetail();
      expect(screen.getByText("Metformin")).toBeTruthy();
    });

    test("shows dosage strength", async () => {
      await renderDetail();
      expect(screen.getByText("500 mg")).toBeTruthy();
    });
  });
});

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  EditPrescriptionForm,
  NewPrescriptionForm,
  type PrescriptionFormData,
} from "./PrescriptionForm";

const SAMPLE: PrescriptionFormData = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  doseCount: 1,
  doseForm: "tablet",
  schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

async function renderNewForm() {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const newRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/new",
    component: NewPrescriptionForm,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute.addChildren([newRoute])]),
    history: createMemoryHistory({ initialEntries: ["/prescriptions/new"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

async function renderEditForm(prescription = SAMPLE) {
  const rootRoute = createRootRoute({ component: Outlet });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: Outlet,
  });
  const editRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/prescriptions/$id/edit",
    loader: () => prescription,
    component: EditPrescriptionForm,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute.addChildren([editRoute])]),
    history: createMemoryHistory({
      initialEntries: [`/prescriptions/${prescription.id}/edit`],
    }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("NewPrescriptionForm", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders 'Add prescription' heading", async () => {
    await renderNewForm();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(
      /add prescription/i,
    );
  });

  describe("form layout", () => {
    test("start date defaults to today", async () => {
      await renderNewForm();
      const today = new Date().toISOString().slice(0, 10);
      expect(
        (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
      ).toBe(today);
    });

    test("end date field shows 'Leave blank for ongoing prescriptions' hint", async () => {
      await renderNewForm();
      expect(
        screen.getByText(/leave blank for ongoing prescriptions/i),
      ).toBeTruthy();
    });

    test("dose time input defaults to 09:00", async () => {
      await renderNewForm();
      expect((screen.getByLabelText(/time 1/i) as HTMLInputElement).value).toBe(
        "09:00",
      );
    });

    test("drug name field appears before start date field", async () => {
      await renderNewForm();
      const drugName = screen.getByLabelText(/drug name/i);
      const startDate = screen.getByLabelText(/start date/i);
      expect(
        drugName.compareDocumentPosition(startDate) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe("form factor", () => {
    test("form factor dropdown is present and defaults to tablet", async () => {
      await renderNewForm();
      const formFactorSelect = screen.getByRole("combobox", {
        name: /form/i,
      }) as HTMLSelectElement;
      expect(formFactorSelect.value).toBe("tablet");
    });

    test("form factor dropdown has options tablet, capsule, pill, other", async () => {
      await renderNewForm();
      const formFactorSelect = screen.getByRole("combobox", {
        name: /form/i,
      }) as HTMLSelectElement;
      const options = Array.from(formFactorSelect.options).map((o) => o.value);
      expect(options).toEqual(["tablet", "capsule", "pill", "other"]);
    });

    test("create POST sends doseForm", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.doseForm).toBe("tablet");
      expect(body.doseCount).toBeUndefined();
    });
  });

  describe("dose amount", () => {
    test("each dose time slot has a quantity input defaulting to 1", async () => {
      await renderNewForm();
      expect(
        (screen.getByLabelText(/quantity 1/i) as HTMLInputElement).value,
      ).toBe("1");
    });

    test("each dose time slot shows the current form type as its unit label", async () => {
      await renderNewForm();
      const qtyInput = screen.getByLabelText(/quantity 1/i);
      expect(qtyInput.closest(".dose-time-entry")?.textContent).toContain(
        "tablet",
      );

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /form/i }),
        "capsule",
      );
      expect(qtyInput.closest(".dose-time-entry")?.textContent).toContain(
        "capsule",
      );
    });

    test("schedule slots include the slot quantity as quantity", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const qtyInput = screen.getByLabelText(/quantity 1/i);
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, "2");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.monday[0].quantity).toBe(2);
    });
  });

  describe("dosage unit picker", () => {
    test("unit select has (blank), mg, g, mcg options in that order", async () => {
      await renderNewForm();
      const unitSelect = screen.getByRole("combobox", {
        name: /unit/i,
      }) as HTMLSelectElement;
      const allOptions = Array.from(unitSelect.options).map((o) => o.value);
      expect(allOptions).toEqual(["", "mg", "g", "mcg"]);
      const blankOption = Array.from(unitSelect.options).find(
        (o) => o.value === "",
      )!;
      expect(blankOption.text).toBe("(blank)");
      expect(blankOption.disabled).toBe(false);
    });

    test("selecting a unit does not modify the quantity field text", async () => {
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/strength/i), "500");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("500");
    });

    test("on submit with (blank) unit, dosage is just the quantity with no trailing space", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "",
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.dosage).toBe("100");
    });

    test("on submit, quantity and unit are concatenated with a space", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "500");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.dosage).toBe("500 mg");
    });
  });

  describe("mg-duplication warning", () => {
    test("warning appears on blur when quantity ends with the selected unit", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      const dosageInput = screen.getByLabelText(/strength/i);
      await userEvent.type(dosageInput, "20mg");
      await userEvent.tab();

      expect(screen.getByText(/included the unit/i)).toBeTruthy();
    });

    test("warning is not shown when quantity does not end with selected unit", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      const dosageInput = screen.getByLabelText(/strength/i);
      await userEvent.type(dosageInput, "20");
      await userEvent.tab();

      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("warning clears when quantity is changed after it appears", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      const dosageInput = screen.getByLabelText(/strength/i);
      await userEvent.type(dosageInput, "20mg");
      await userEvent.tab();
      expect(screen.getByText(/included the unit/i)).toBeTruthy();

      await userEvent.clear(dosageInput);
      await userEvent.type(dosageInput, "20");

      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("warning appears even when unit is (blank) if quantity contains a known unit suffix", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "",
      );
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20mg");
      await userEvent.tab();

      expect(screen.getByText(/included the unit/i)).toBeTruthy();
    });

    test("warning is not shown when quantity has no known unit suffix", async () => {
      await renderNewForm();
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20");
      await userEvent.tab();

      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("clicking the suggested value auto-fixes the quantity and clears the warning", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20mg");
      await userEvent.tab();
      expect(screen.getByText(/included the unit/i)).toBeTruthy();

      await userEvent.click(screen.getByRole("button", { name: /^20 mg$/i }));

      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("20");
      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("autofix also updates the unit picker when it differs from the detected unit", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "g",
      );
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20mg");
      await userEvent.tab();
      expect(screen.getByText(/included the unit/i)).toBeTruthy();

      await userEvent.click(screen.getByRole("button", { name: /^20 mg$/i }));

      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("20");
      expect(
        (screen.getByRole("combobox", { name: /unit/i }) as HTMLSelectElement)
          .value,
      ).toBe("mg");
      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("autofix updates the unit picker when (blank) was selected", async () => {
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "",
      );
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "500mcg");
      await userEvent.tab();

      await userEvent.click(screen.getByRole("button", { name: /^500 mcg$/i }));

      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("500");
      expect(
        (screen.getByRole("combobox", { name: /unit/i }) as HTMLSelectElement)
          .value,
      ).toBe("mcg");
    });

    test("changing the unit dropdown re-runs the check and shows the warning", async () => {
      await renderNewForm();
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20mg");

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "g",
      );

      expect(screen.getByText(/included the unit/i)).toBeTruthy();
    });

    test("warning does not block form submission", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      const dosageInput = screen.getByLabelText(/strength/i);
      await userEvent.type(dosageInput, "20mg");
      await userEvent.tab();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe("schedule", () => {
    test("create form renders a checkbox for each day of the week", async () => {
      await renderNewForm();
      for (const day of [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ]) {
        expect(screen.getByRole("checkbox", { name: day })).toBeTruthy();
      }
    });

    test("create form shows three-letter day labels (Sun Mon Tue…)", async () => {
      await renderNewForm();
      const abbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const pills = screen
        .getByRole("group", { name: /days/i })
        .querySelectorAll(".day-pill span");
      expect(Array.from(pills).map((el) => el.textContent)).toEqual(abbrs);
    });

    test("create form shows a time input by default", async () => {
      await renderNewForm();
      expect(screen.getByLabelText(/time 1/i)).toBeTruthy();
    });

    test("can add multiple dose time rows without confirming each first", async () => {
      await renderNewForm();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      expect(screen.getByLabelText(/time 1/i)).toBeTruthy();
      expect(screen.getByLabelText(/time 2/i)).toBeTruthy();
      expect(screen.getByLabelText(/time 3/i)).toBeTruthy();
    });

    test("clicking '+ Add new dose time' adds another time input", async () => {
      await renderNewForm();
      expect(screen.queryByLabelText(/time 2/i)).toBeNull();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      expect(screen.getByLabelText(/time 2/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
    });

    test("Remove button is disabled when there is only one dose time", async () => {
      await renderNewForm();
      expect(
        (
          screen.getByRole("button", {
            name: /remove time/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    test("Remove button is enabled when a second dose time is added", async () => {
      await renderNewForm();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      const removeButtons = screen.getAllByRole("button", {
        name: /remove time/i,
      });
      expect(
        removeButtons.every((b) => !(b as HTMLButtonElement).disabled),
      ).toBe(true);
    });

    test("clicking Remove on a dose time removes that entry", async () => {
      await renderNewForm();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      expect(screen.getByLabelText(/time 2/i)).toBeTruthy();
      await userEvent.click(
        screen.getAllByRole("button", { name: /remove time/i })[1],
      );
      expect(screen.queryByLabelText(/time 2/i)).toBeNull();
      expect(screen.getByLabelText(/time 1/i)).toBeTruthy();
    });

    test("submitting with a day checked and a time set sends the correct schedule", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );

      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.monday).toEqual([
        { time: "08:00", quantity: 1 },
      ]);
    });
  });

  describe("validation", () => {
    async function fillMinimumFields() {
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
    }

    test("submitting with no days selected shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("submitting with a blank dose time entry shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("submitting with a second blank dose time entry shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      const timeInput2 = screen.getByLabelText(/time 2/i) as HTMLInputElement;
      await userEvent.clear(timeInput2);

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("Days fieldset is marked aria-invalid when no days are selected on submit", async () => {
      vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(
        screen
          .getByRole("group", { name: /days/i })
          .getAttribute("aria-invalid"),
      ).toBe("true");
    });

    test("Days fieldset aria-invalid clears when a day is selected", async () => {
      vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

      expect(
        screen
          .getByRole("group", { name: /days/i })
          .getAttribute("aria-invalid"),
      ).toBeNull();
    });

    test("Dose times fieldset is marked aria-invalid when time is blank on submit", async () => {
      vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(
        screen
          .getByRole("group", { name: /dose times/i })
          .getAttribute("aria-invalid"),
      ).toBe("true");
    });

    test("Dose times fieldset aria-invalid clears when a dose time is added", async () => {
      vi.spyOn(globalThis, "fetch");
      await renderNewForm();
      await fillMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );

      expect(
        screen
          .getByRole("group", { name: /dose times/i })
          .getAttribute("aria-invalid"),
      ).toBeNull();
    });
  });

  describe("dosing schedules", () => {
    test("'Remove dosing schedule' button is disabled when only one dosing schedule exists", async () => {
      await renderNewForm();
      expect(
        (
          screen.getByRole("button", {
            name: /remove dosing schedule/i,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    test("'+ Add dosing schedule' adds a second dosing schedule block", async () => {
      await renderNewForm();
      expect(screen.getAllByRole("group", { name: /days/i })).toHaveLength(1);
      await userEvent.click(
        screen.getByRole("button", { name: /add dosing schedule/i }),
      );
      expect(screen.getAllByRole("group", { name: /days/i })).toHaveLength(2);
    });

    test("clicking 'Remove dosing schedule' removes that dosing schedule", async () => {
      await renderNewForm();
      await userEvent.click(
        screen.getByRole("button", { name: /add dosing schedule/i }),
      );
      expect(screen.getAllByRole("group", { name: /days/i })).toHaveLength(2);
      const removeButtons = screen.getAllByRole("button", {
        name: /remove dosing schedule/i,
      });
      await userEvent.click(removeButtons[1]);
      expect(screen.getAllByRole("group", { name: /days/i })).toHaveLength(1);
    });

    test("submitting with two dosing schedules sends both days in the correct schedule", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE), { status: 201 }),
        );
      await renderNewForm();

      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );

      // Dosing schedule 1: Monday at default 09:00
      await userEvent.click(
        screen.getAllByRole("checkbox", { name: "Monday" })[0],
      );

      // Add dosing schedule 2
      await userEvent.click(
        screen.getByRole("button", { name: /add dosing schedule/i }),
      );

      // Dosing schedule 2: Friday at 08:00
      await userEvent.click(
        screen.getAllByRole("checkbox", { name: "Friday" })[1],
      );
      const schedule2Time = screen.getAllByLabelText(
        /time 1/i,
      )[1] as HTMLInputElement;
      await userEvent.clear(schedule2Time);
      await userEvent.type(schedule2Time, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.monday).toEqual([
        { time: "09:00", quantity: 1 },
      ]);
      expect(body.schedule.days.friday).toEqual([
        { time: "08:00", quantity: 1 },
      ]);
    });
  });
});

describe("EditPrescriptionForm", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders 'Edit prescription' heading", async () => {
    await renderEditForm();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(
      /edit prescription/i,
    );
  });

  test("pre-populates drug name, dosage, and start date from loader", async () => {
    await renderEditForm();
    expect(
      (screen.getByLabelText(/drug name/i) as HTMLInputElement).value,
    ).toBe("Metformin");
    expect((screen.getByLabelText(/strength/i) as HTMLInputElement).value).toBe(
      "500mg",
    );
    expect(
      (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
    ).toBe("2024-01-01");
  });

  test("pre-populates doseForm from loader", async () => {
    const prescription = { ...SAMPLE, doseForm: "capsule" };
    await renderEditForm(prescription);

    expect(
      (
        screen.getByRole("combobox", {
          name: /form/i,
        }) as HTMLSelectElement
      ).value,
    ).toBe("capsule");
  });

  test("pre-populates slot quantity from doseCount in loader", async () => {
    const prescription = { ...SAMPLE, doseCount: 2 };
    await renderEditForm(prescription);
    expect(
      (screen.getByLabelText(/quantity 1/i) as HTMLInputElement).value,
    ).toBe("2");
  });

  test("pre-populates scheduled days and times from loader", async () => {
    const prescription = {
      ...SAMPLE,
      schedule: {
        days: {
          monday: ["08:00", "20:00"],
          wednesday: ["08:00", "20:00"],
        },
        timezoneMode: "local" as const,
      },
    };
    await renderEditForm(prescription);

    expect(
      (screen.getByRole("checkbox", { name: "Monday" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: "Wednesday" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: "Sunday" }) as HTMLInputElement)
        .checked,
    ).toBe(false);

    expect((screen.getByLabelText(/time 1/i) as HTMLInputElement).value).toBe(
      "08:00",
    );
    expect((screen.getByLabelText(/time 2/i) as HTMLInputElement).value).toBe(
      "20:00",
    );
  });

  test("pre-populates quantity and unit when dosage matches 'quantity unit' format", async () => {
    const prescription = { ...SAMPLE, dosage: "500 mg" };
    await renderEditForm(prescription);

    expect((screen.getByLabelText(/strength/i) as HTMLInputElement).value).toBe(
      "500",
    );
    expect(
      (screen.getByRole("combobox", { name: /unit/i }) as HTMLSelectElement)
        .value,
    ).toBe("mg");
  });

  test("shows plain text input (no unit picker) when dosage cannot be parsed", async () => {
    const prescription = { ...SAMPLE, dosage: "two tablets" };
    await renderEditForm(prescription);

    expect((screen.getByLabelText(/strength/i) as HTMLInputElement).value).toBe(
      "two tablets",
    );
    expect(screen.queryByRole("combobox", { name: /unit/i })).toBeNull();
  });

  test("submitting calls PATCH with correct fields", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE), { status: 200 }),
      );
    await renderEditForm();

    const drugNameInput = screen.getByLabelText(/drug name/i);
    await userEvent.clear(drugNameInput);
    await userEvent.type(drugNameInput, "Metformin XR");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/prescriptions/rx-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    await waitFor(() => {
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.drugName).toBe("Metformin XR");
    });
  });

  test("submitting edit form with unparseable dosage sends the original string unchanged", async () => {
    const prescription = {
      ...SAMPLE,
      dosage: "1 cup",
      schedule: {
        days: { monday: ["08:00"] },
        timezoneMode: "local" as const,
      },
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(prescription), { status: 200 }),
      );
    await renderEditForm(prescription);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.dosage).toBe("1 cup");
  });

  test("edit sends updated schedule in PATCH body", async () => {
    const emptySchedulePrescription = {
      ...SAMPLE,
      schedule: { days: {}, timezoneMode: "local" as const },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...SAMPLE,
          schedule: {
            days: { wednesday: ["20:00"] },
            timezoneMode: "local",
          },
        }),
        { status: 200 },
      ),
    );

    await renderEditForm(emptySchedulePrescription);

    await userEvent.click(screen.getByRole("checkbox", { name: "Wednesday" }));
    await userEvent.click(
      screen.getByRole("button", { name: /new dose time/i }),
    );
    const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
    await userEvent.clear(timeInput);
    await userEvent.type(timeInput, "20:00");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.schedule.days.wednesday).toEqual([
      { time: "20:00", quantity: 1 },
    ]);
    expect(body.schedule.days.monday).toBeUndefined();
  });

  test("submitting with no days selected shows an error and does not call PATCH", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const emptySchedulePrescription = {
      ...SAMPLE,
      schedule: { days: {}, timezoneMode: "local" as const },
    };
    await renderEditForm(emptySchedulePrescription);

    await userEvent.click(
      screen.getByRole("button", { name: /new dose time/i }),
    );
    const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
    await userEvent.clear(timeInput);
    await userEvent.type(timeInput, "08:00");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("submitting with no dose times shows an error and does not call PATCH", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const emptySchedulePrescription = {
      ...SAMPLE,
      schedule: { days: {}, timezoneMode: "local" as const },
    };
    await renderEditForm(emptySchedulePrescription);

    await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("edit PATCH sends doseForm", async () => {
    const prescription = {
      ...SAMPLE,
      doseForm: "tablet",
      schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" as const },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ...prescription, doseForm: "capsule" }), {
        status: 200,
      }),
    );

    await renderEditForm(prescription);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /form/i }),
      "capsule",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.doseForm).toBe("capsule");
    expect(body.doseCount).toBeUndefined();
  });
});

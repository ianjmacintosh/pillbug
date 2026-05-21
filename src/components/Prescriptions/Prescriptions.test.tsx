import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("Prescriptions", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders a heading", () => {
    render(<Prescriptions />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  describe("validation", () => {
    async function openCreateFormWithMinimumFields() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      // start date is pre-filled with today's date
    }

    test("create form: submitting with no days selected shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("create form: submitting with a blank dose time entry shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("create form: submitting with a second blank dose time entry shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
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

    test("edit form: submitting with no days selected shows an error and does not call PATCH", async () => {
      const emptySchedulePrescription = {
        ...SAMPLE_PRESCRIPTION,
        schedule: { days: {}, timezoneMode: "local" as const },
      };
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([emptySchedulePrescription]), {
          status: 200,
        }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      // no days selected, add a valid time
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // only the GET, no PATCH
    });

    test("edit form: submitting with no dose times shows an error and does not call PATCH", async () => {
      const emptySchedulePrescription = {
        ...SAMPLE_PRESCRIPTION,
        schedule: { days: {}, timezoneMode: "local" as const },
      };
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([emptySchedulePrescription]), {
          status: 200,
        }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      // select a day but add no times
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // only the GET, no PATCH
    });

    test("Days fieldset is marked aria-invalid when no days are selected on submit", async () => {
      vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
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
      await openCreateFormWithMinimumFields();
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
      await openCreateFormWithMinimumFields();
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
      await openCreateFormWithMinimumFields();
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

  describe("schedule", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("create form renders a checkbox for each day of the week", async () => {
      await openCreateForm();
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

    test("create form renders a 'Select all' text link", async () => {
      await openCreateForm();
      expect(screen.getByRole("button", { name: /select all/i })).toBeTruthy();
    });

    test("'Select all' link text changes to 'Unselect all' when all days are selected", async () => {
      await openCreateForm();
      await userEvent.click(
        screen.getByRole("button", { name: /select all/i }),
      );
      expect(
        screen.getByRole("button", { name: /unselect all/i }),
      ).toBeTruthy();
    });

    test("create form shows three-letter day labels (Sun Mon Tue…)", async () => {
      await openCreateForm();
      const abbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const pills = screen
        .getByRole("group", { name: /days/i })
        .querySelectorAll(".day-pill span");
      expect(Array.from(pills).map((el) => el.textContent)).toEqual(abbrs);
    });

    test("create form shows a time input by default", async () => {
      await openCreateForm();
      expect(screen.getByLabelText(/time 1/i)).toBeTruthy();
    });

    test("can add multiple dose time rows without confirming each first", async () => {
      await openCreateForm();
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
      await openCreateForm();
      expect(screen.queryByLabelText(/time 2/i)).toBeNull();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      expect(screen.getByLabelText(/time 2/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
    });

    test("Remove button is disabled when there is only one dose time", async () => {
      await openCreateForm();
      expect(
        (screen.getByRole("button", { name: /remove/i }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });

    test("Remove button is enabled when a second dose time is added", async () => {
      await openCreateForm();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(
        removeButtons.every((b) => !(b as HTMLButtonElement).disabled),
      ).toBe(true);
    });

    test("clicking Remove on a dose time removes that entry", async () => {
      await openCreateForm();
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      expect(screen.getByLabelText(/time 2/i)).toBeTruthy();
      await userEvent.click(
        screen.getAllByRole("button", { name: /remove/i })[1],
      );
      expect(screen.queryByLabelText(/time 2/i)).toBeNull();
      expect(screen.getByLabelText(/time 1/i)).toBeTruthy();
    });

    test("submitting with a day checked and a time set sends the correct schedule", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      // start date is pre-filled with today's date

      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "08:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.monday).toEqual(["08:00"]);
    });
  });

  describe("edit", () => {
    async function revealAndClickEdit(prescription = SAMPLE_PRESCRIPTION) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([prescription]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText(prescription.drugName));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    }

    test("edit button opens form pre-populated with prescription data", async () => {
      await revealAndClickEdit();
      expect(
        (screen.getByLabelText(/drug name/i) as HTMLInputElement).value,
      ).toBe("Metformin");
      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("500mg");
      expect(
        (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
      ).toBe("2024-01-01");
    });

    test("edit form pre-populates scheduled days and times from prescription", async () => {
      const withSchedule = {
        ...SAMPLE_PRESCRIPTION,
        schedule: {
          days: { monday: ["08:00"], friday: ["08:00", "20:00"] },
          timezoneMode: "local" as const,
        },
      };
      await revealAndClickEdit(withSchedule);

      expect(
        (screen.getByRole("checkbox", { name: "Monday" }) as HTMLInputElement)
          .checked,
      ).toBe(true);
      expect(
        (screen.getByRole("checkbox", { name: "Friday" }) as HTMLInputElement)
          .checked,
      ).toBe(true);
      expect(
        (screen.getByRole("checkbox", { name: "Sunday" }) as HTMLInputElement)
          .checked,
      ).toBe(false);

      const timeInput1 = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      const timeInput2 = screen.getByLabelText(/time 2/i) as HTMLInputElement;
      const timeValues = [timeInput1.value, timeInput2.value].sort();
      expect(timeValues).toContain("08:00");
      expect(timeValues).toContain("20:00");
    });

    test("edit form sends updated schedule in PATCH body", async () => {
      const emptySchedulePrescription = {
        ...SAMPLE_PRESCRIPTION,
        schedule: { days: {}, timezoneMode: "local" as const },
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify([emptySchedulePrescription]), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ...SAMPLE_PRESCRIPTION,
              schedule: {
                days: { wednesday: ["20:00"] },
                timezoneMode: "local",
              },
            }),
            { status: 200 },
          ),
        );

      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Wednesday" }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      const timeInput = screen.getByLabelText(/time 1/i) as HTMLInputElement;
      await userEvent.clear(timeInput);
      await userEvent.type(timeInput, "20:00");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.wednesday).toContain("20:00");
      expect(body.schedule.days.monday).toBeUndefined();
    });

    test("submitting edit form calls PATCH and closes the form", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ...SAMPLE_PRESCRIPTION, dosage: "1000mg" }),
            { status: 200 },
          ),
        );

      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      const dosageInput = screen.getByLabelText(/strength/i);
      await userEvent.clear(dosageInput);
      await userEvent.type(dosageInput, "1000mg");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/prescriptions/rx-1",
        expect.objectContaining({ method: "PATCH" }),
      );
      await waitFor(() =>
        expect(screen.queryByLabelText(/drug name/i)).toBeNull(),
      );
    });

    test("edit form pre-populates doseCount and doseForm from prescription", async () => {
      const prescription = {
        ...SAMPLE_PRESCRIPTION,
        doseCount: 2,
        doseForm: "capsule",
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([prescription]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      expect((screen.getByLabelText(/count/i) as HTMLInputElement).value).toBe(
        "2",
      );
      expect(
        (
          screen.getByRole("combobox", {
            name: /form/i,
          }) as HTMLSelectElement
        ).value,
      ).toBe("capsule");
    });

    test("edit PATCH sends doseCount and doseForm", async () => {
      const prescription = {
        ...SAMPLE_PRESCRIPTION,
        doseCount: 1,
        doseForm: "tablet",
        schedule: {
          days: { monday: ["08:00"] },
          timezoneMode: "local" as const,
        },
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify([prescription]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ...prescription,
              doseCount: 2,
              doseForm: "capsule",
            }),
            {
              status: 200,
            },
          ),
        );

      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      const countInput = screen.getByLabelText(/count/i);
      await userEvent.clear(countInput);
      await userEvent.type(countInput, "2");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /form/i }),
        "capsule",
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
      );
      expect(body.doseCount).toBe(2);
      expect(body.doseForm).toBe("capsule");
    });

    test("cancel closes the edit form without changes", async () => {
      await revealAndClickEdit();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByLabelText(/drug name/i)).toBeNull();
      expect(screen.getByText("Metformin")).toBeTruthy();
    });
  });

  describe("form layout", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("create form start date defaults to today", async () => {
      await openCreateForm();
      const today = new Date().toISOString().slice(0, 10);
      expect(
        (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
      ).toBe(today);
    });

    test("end date field shows 'Leave blank for ongoing prescriptions' hint", async () => {
      await openCreateForm();
      expect(
        screen.getByText(/leave blank for ongoing prescriptions/i),
      ).toBeTruthy();
    });

    test("dose time input defaults to 09:00", async () => {
      await openCreateForm();
      expect((screen.getByLabelText(/time 1/i) as HTMLInputElement).value).toBe(
        "09:00",
      );
    });

    test("start date field appears before drug name field in the form", async () => {
      await openCreateForm();
      const startDate = screen.getByLabelText(/start date/i);
      const drugName = screen.getByLabelText(/drug name/i);
      expect(
        startDate.compareDocumentPosition(drugName) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe("mg-duplication warning", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("warning appears on blur when quantity ends with the selected unit", async () => {
      await openCreateForm();
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
      await openCreateForm();
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
      await openCreateForm();
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
      await openCreateForm();
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
      await openCreateForm();
      const strengthInput = screen.getByLabelText(/strength/i);
      await userEvent.type(strengthInput, "20");
      await userEvent.tab();

      expect(screen.queryByText(/included the unit/i)).toBeNull();
    });

    test("clicking the suggested value auto-fixes the quantity and clears the warning", async () => {
      await openCreateForm();
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
      await openCreateForm();
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
      await openCreateForm();
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
      await openCreateForm();
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
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
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

  describe("dose count and form factor", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("count field is present and defaults to 1", async () => {
      await openCreateForm();
      const countInput = screen.getByLabelText(/count/i) as HTMLInputElement;
      expect(countInput).toBeTruthy();
      expect(countInput.value).toBe("1");
    });

    test("form factor dropdown is present and defaults to tablet", async () => {
      await openCreateForm();
      const formFactorSelect = screen.getByRole("combobox", {
        name: /form/i,
      }) as HTMLSelectElement;
      expect(formFactorSelect.value).toBe("tablet");
    });

    test("form factor dropdown has options tablet, capsule, pill, other", async () => {
      await openCreateForm();
      const formFactorSelect = screen.getByRole("combobox", {
        name: /form/i,
      }) as HTMLSelectElement;
      const options = Array.from(formFactorSelect.options).map((o) => o.value);
      expect(options).toEqual(["tablet", "capsule", "pill", "other"]);
    });

    test("count field appears before drug name field in the form", async () => {
      await openCreateForm();
      const countInput = screen.getByLabelText(/count/i);
      const drugName = screen.getByLabelText(/drug name/i);
      expect(
        countInput.compareDocumentPosition(drugName) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    test("create POST sends doseCount and doseForm", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
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
      expect(body.doseCount).toBe(1);
      expect(body.doseForm).toBe("tablet");
    });

    test("count accepts decimal input and sends it as a number", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "100");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      const countInput = screen.getByLabelText(/count/i);
      await userEvent.clear(countInput);
      await userEvent.type(countInput, "0.5");

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.doseCount).toBe(0.5);
    });
  });

  describe("dosage unit picker", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("unit select has (blank), mg, g, mcg options in that order", async () => {
      await openCreateForm();
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
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/strength/i), "500");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("500");
    });

    test("on submit with (blank) unit, dosage is just the quantity with no trailing space or unit", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
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
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/strength/i), "500");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      // start date is pre-filled with today's date
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

    test("edit form pre-populates quantity and unit when dosage matches 'quantity unit' format", async () => {
      const prescription = { ...SAMPLE_PRESCRIPTION, dosage: "500 mg" };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([prescription]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("500");
      expect(
        (screen.getByRole("combobox", { name: /unit/i }) as HTMLSelectElement)
          .value,
      ).toBe("mg");
    });

    test("edit form shows plain text input (no unit picker) when dosage cannot be parsed", async () => {
      const prescription = { ...SAMPLE_PRESCRIPTION, dosage: "two tablets" };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([prescription]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      expect(
        (screen.getByLabelText(/strength/i) as HTMLInputElement).value,
      ).toBe("two tablets");
      expect(screen.queryByRole("combobox", { name: /unit/i })).toBeNull();
    });

    test("submitting edit form with unparseable dosage sends the original string unchanged", async () => {
      const prescription = {
        ...SAMPLE_PRESCRIPTION,
        dosage: "1 cup",
        schedule: {
          days: { monday: ["08:00"] },
          timezoneMode: "local" as const,
        },
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify([prescription]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(prescription), { status: 200 }),
        );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /edit/i }));

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
      );
      expect(body.dosage).toBe("1 cup");
    });
  });

  describe("delete", () => {
    async function revealAndClickDelete() {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    }

    test("delete button shows confirmation with permanence warning", async () => {
      await revealAndClickDelete();
      expect(screen.getByText(/permanent/i)).toBeTruthy();
      expect(screen.getByText(/dose history/i)).toBeTruthy();
    });

    test("confirming delete calls DELETE and removes prescription from list", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
      await userEvent.click(screen.getByRole("button", { name: /delete/i }));
      await userEvent.click(
        screen.getByRole("button", { name: /yes, delete/i }),
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/prescriptions/rx-1",
        expect.objectContaining({ method: "DELETE" }),
      );
      await waitFor(() => expect(screen.queryByText("Metformin")).toBeNull());
    });

    test("cancelling delete closes confirmation without deletion", async () => {
      await revealAndClickDelete();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByText(/permanent/i)).toBeNull();
      expect(screen.getByText("Metformin")).toBeTruthy();
    });
  });
});

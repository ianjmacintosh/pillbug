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
      await userEvent.type(screen.getByLabelText(/dosage/i), "100mg");
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

    test("create form: submitting with no dose times shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("create form: submitting with a blank dose time entry shows an error and does not call fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      await userEvent.click(
        screen.getByRole("button", { name: /new dose time/i }),
      );
      // leave the time input blank

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

    test("Dose times fieldset is marked aria-invalid when no times are added on submit", async () => {
      vi.spyOn(globalThis, "fetch");
      await openCreateFormWithMinimumFields();
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

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
      await userEvent.type(screen.getByLabelText(/dosage/i), "100mg");
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
      expect((screen.getByLabelText(/dosage/i) as HTMLInputElement).value).toBe(
        "500mg",
      );
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

      const dosageInput = screen.getByLabelText(/dosage/i);
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

  describe("dosage unit picker", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("renders a unit picker select next to the dosage input", async () => {
      await openCreateForm();
      const unitPicker = screen.getByRole("combobox", { name: /unit/i });
      expect(unitPicker).toBeTruthy();
    });

    test("unit picker has options: (none), mg, mcg, g, ml", async () => {
      await openCreateForm();
      const unitPicker = screen.getByRole("combobox", {
        name: /unit/i,
      }) as HTMLSelectElement;
      const options = Array.from(unitPicker.options).map((o) => o.value);
      expect(options).toEqual(["", "mg", "mcg", "g", "ml"]);
    });

    test("selecting a unit appends it to the dosage string", async () => {
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/dosage/i), "500");
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: /unit/i }),
        "mg",
      );
      expect((screen.getByLabelText(/dosage/i) as HTMLInputElement).value).toBe(
        "500mg",
      );
    });

    test("dosage is submitted as a single string including unit", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_PRESCRIPTION), { status: 201 }),
        );
      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/dosage/i), "500");
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
      expect(body.dosage).toBe("500mg");
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

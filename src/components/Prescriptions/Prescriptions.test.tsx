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

  describe("schedule grid", () => {
    async function openCreateForm() {
      render(<Prescriptions />);
      await userEvent.click(
        screen.getByRole("button", { name: /add prescription/i }),
      );
    }

    test("create form renders AM and PM rows for each day column", async () => {
      await openCreateForm();
      const grid = screen.getByRole("table");
      expect(grid).toBeTruthy();
      for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        expect(screen.getByRole("columnheader", { name: day })).toBeTruthy();
      }
      expect(screen.getByRole("columnheader", { name: /all/i })).toBeTruthy();
      const amCheckboxes = screen
        .getAllByRole("checkbox")
        .filter((el) => el.closest("tr")?.textContent?.startsWith("AM"));
      expect(amCheckboxes).toHaveLength(8); // Toggle All + 7 days
      const pmCheckboxes = screen
        .getAllByRole("checkbox")
        .filter((el) => el.closest("tr")?.textContent?.startsWith("PM"));
      expect(pmCheckboxes).toHaveLength(8);
    });

    test("checking Monday AM and submitting sends 08:00 for monday", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...SAMPLE_PRESCRIPTION,
            schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
          }),
          { status: 201 },
        ),
      );

      await openCreateForm();
      await userEvent.type(screen.getByLabelText(/drug name/i), "Aspirin");
      await userEvent.type(screen.getByLabelText(/dosage/i), "100mg");
      await userEvent.type(screen.getByLabelText(/start date/i), "2024-06-01");

      const monCol = (
        screen.getByRole("columnheader", {
          name: "Mon",
        }) as HTMLTableCellElement
      ).cellIndex;
      const amRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.startsWith("AM"))!;
      const amCells = amRow.querySelectorAll("td");
      const monAmCheckbox = amCells[monCol - 1]?.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      await userEvent.click(monAmCheckbox);

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.schedule.days.monday).toContain("08:00");
    });

    test("Toggle All AM checks all 7 days AM", async () => {
      await openCreateForm();
      const amRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.startsWith("AM"))!;
      const toggleAllAm = amRow.querySelectorAll(
        'input[type="checkbox"]',
      )[0] as HTMLInputElement;
      await userEvent.click(toggleAllAm);

      const amCheckboxes = Array.from(
        amRow.querySelectorAll('input[type="checkbox"]'),
      ) as HTMLInputElement[];
      expect(amCheckboxes.every((cb) => cb.checked)).toBe(true);
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

    test("edit form pre-populates AM checkbox for days in schedule", async () => {
      const withSchedule = {
        ...SAMPLE_PRESCRIPTION,
        schedule: {
          days: { monday: ["08:00"], friday: ["08:00", "20:00"] },
          timezoneMode: "local" as const,
        },
      };
      await revealAndClickEdit(withSchedule);

      const amRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.startsWith("AM"))!;
      const amCheckboxes = Array.from(
        amRow.querySelectorAll('input[type="checkbox"]'),
      ) as HTMLInputElement[];
      // index 0 = toggle all, 1 = Sun, 2 = Mon, 3 = Tue, 4 = Wed, 5 = Thu, 6 = Fri, 7 = Sat
      expect(amCheckboxes[2].checked).toBe(true); // Mon
      expect(amCheckboxes[6].checked).toBe(true); // Fri
      expect(amCheckboxes[1].checked).toBe(false); // Sun

      const pmRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.startsWith("PM"))!;
      const pmCheckboxes = Array.from(
        pmRow.querySelectorAll('input[type="checkbox"]'),
      ) as HTMLInputElement[];
      expect(pmCheckboxes[6].checked).toBe(true); // Fri PM
      expect(pmCheckboxes[2].checked).toBe(false); // Mon PM
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

      const pmRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.startsWith("PM"))!;
      const wedCol = (
        screen.getByRole("columnheader", {
          name: "Wed",
        }) as HTMLTableCellElement
      ).cellIndex;
      const pmCells = pmRow.querySelectorAll("td");
      const wedPmCheckbox = pmCells[wedCol - 1]?.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      await userEvent.click(wedPmCheckbox);

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

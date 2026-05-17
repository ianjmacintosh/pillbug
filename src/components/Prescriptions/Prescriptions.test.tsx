import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import Prescriptions from "./Prescriptions";

const SAMPLE_PRESCRIPTION = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: "daily", times: [], timezoneMode: "local" },
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

  describe("edit", () => {
    async function revealAndClickEdit() {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([SAMPLE_PRESCRIPTION]), { status: 200 }),
      );
      render(<Prescriptions />);
      await userEvent.click(screen.getByRole("button", { name: /show all/i }));
      await waitFor(() => screen.getByText("Metformin"));
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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";

// Wednesday — Monday of the week is 2024-03-11, Sunday is 2024-03-17
const TODAY = "2024-03-13";

const MONDAY_DOSE = {
  prescriptionId: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  scheduledAt: "2024-03-11T08:00:00Z",
  actionable: true,
  resolvedDose: null,
};

const MONDAY_DOSE_RESOLVED = {
  ...MONDAY_DOSE,
  resolvedDose: { id: "dose-1", status: "taken" },
};

const FRIDAY_DOSE = {
  prescriptionId: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  scheduledAt: "2024-03-15T08:00:00Z",
  actionable: false,
  resolvedDose: null,
};

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  test("shows nothing by default except a reveal button", () => {
    render(<App today={TODAY} />);
    expect(screen.getByRole("button", { name: /show doses/i })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("fetches scheduled doses for the current week on reveal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByText("Monday"));

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string];
    expect(url).toContain("start=2024-03-11");
    expect(url).toContain("end=2024-03-17");
  });

  test("shows all seven day headings after reveal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      for (const day of [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]) {
        expect(screen.getByText(day)).toBeTruthy();
      }
    });
  });

  test("marks today's heading with aria-current", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      const todayHeading = screen.getByText("Wednesday");
      expect(todayHeading.closest("[aria-current='date']")).toBeTruthy();
    });
  });

  test("shows empty state when no scheduled doses exist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      expect(screen.getByText(/no doses scheduled/i)).toBeTruthy();
    });
  });

  test("disables the checkbox for non-actionable future doses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE, FRIDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      const disabled = checkboxes.filter(
        (cb) => (cb as HTMLInputElement).disabled,
      );
      expect(disabled).toHaveLength(1);
    });
  });

  test("checks the checkbox for a resolved taken dose", async () => {
    const resolvedDose = { ...MONDAY_DOSE, resolvedDose: { status: "taken" } };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([resolvedDose]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { checked: true })).toBeTruthy();
    });
  });

  test("clicking an unresolved actionable dose reveals Taken and Missed buttons", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("checkbox"));

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    expect(screen.getByRole("button", { name: /taken/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /missed/i })).toBeTruthy();
  });

  test("tapping Taken posts a dose and shows the item as resolved", async () => {
    const createdDose = {
      id: "dose-1",
      patientId: "patient-1",
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "taken",
      loggedAt: "2024-03-13T09:00:00.000Z",
      createdAt: "2024-03-13T09:00:00.000Z",
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createdDose), { status: 201 }),
      );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /taken/i }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { checked: true })).toBeTruthy();
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const postCall = calls.find(([url, init]) => {
      const method = (init as RequestInit | undefined)?.method;
      return (
        typeof url === "string" &&
        url.includes("/api/v1/doses") &&
        method === "POST"
      );
    });
    expect(postCall).toBeTruthy();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.prescriptionId).toBe("rx-1");
    expect(body.scheduledAt).toBe("2024-03-11T08:00:00Z");
    expect(body.status).toBe("taken");
  });

  test("tapping Missed posts a dose and shows the item as resolved", async () => {
    const createdDose = {
      id: "dose-2",
      patientId: "patient-1",
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "missed",
      loggedAt: "2024-03-13T09:00:00.000Z",
      createdAt: "2024-03-13T09:00:00.000Z",
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createdDose), { status: 201 }),
      );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /missed/i }));

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  test("Cancel button dismisses inline options without posting", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /taken/i })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("button", { name: /taken/i })).toBeNull();
    expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(1);
  });

  test("future non-actionable doses do not reveal inline options when clicked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([FRIDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.queryByRole("button", { name: /taken/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /missed/i })).toBeNull();
  });

  test("resolved doses show a persistent Edit button", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE_RESOLVED]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
    });
  });

  test("clicking Edit on a resolved dose reveals Taken and Missed buttons", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE_RESOLVED]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("button", { name: /edit/i }));

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("button", { name: /taken/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /missed/i })).toBeTruthy();
  });

  test("choosing a new status from Edit sends PATCH and updates the item", async () => {
    const updatedDose = {
      id: "dose-1",
      patientId: "patient-1",
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "missed",
      loggedAt: "2024-03-13T09:00:00.000Z",
      createdAt: "2024-03-11T08:05:00.000Z",
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE_RESOLVED]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(updatedDose), { status: 200 }),
      );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("button", { name: /edit/i }));

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /missed/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /edit/i })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /taken/i })).toBeNull();
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const patchCall = calls.find(([url, init]) => {
      const method = (init as RequestInit | undefined)?.method;
      return (
        typeof url === "string" &&
        url.includes("/api/v1/doses/dose-1") &&
        method === "PATCH"
      );
    });
    expect(patchCall).toBeTruthy();
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body.status).toBe("missed");
  });

  test("hides the list and shows reveal button again on clicking Hide", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: /show doses/i }));
    await waitFor(() => screen.getByRole("button", { name: /hide/i }));
    await userEvent.click(screen.getByRole("button", { name: /hide/i }));
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("button", { name: /show doses/i })).toBeTruthy();
  });
});

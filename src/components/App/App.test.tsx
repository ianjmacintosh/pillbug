import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18next from "../../utils/i18n";
import App from "./App";

// Wednesday — Monday of the week is 2024-03-11, Sunday is 2024-03-17
const TODAY = "2024-03-13";
// Registration on 2024-03-06 (Wednesday) → floor Monday is 2024-03-04
const REGISTRATION_DATE = "2024-03-06";

let mockRegistrationDate: string | null = null;
let mockTimezone: string | null = null;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({
        registrationDate: mockRegistrationDate,
        timezone: mockTimezone,
      }),
    }),
    Link: ({
      to,
      params,
      children,
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
    }) => {
      const href = params
        ? Object.entries(params).reduce(
            (acc, [k, v]) => acc.replace(`$${k}`, v),
            to,
          )
        : to;
      return <a href={href}>{children}</a>;
    },
  };
});

const MONDAY_DOSE = {
  prescriptionId: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  quantity: 1,
  doseForm: "tablet",
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
  quantity: 1,
  doseForm: "tablet",
  scheduledAt: "2024-03-15T08:00:00Z",
  actionable: false,
  resolvedDose: null,
};

beforeEach(() => {
  mockRegistrationDate = null;
  mockTimezone = null;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("App", () => {
  test("renders dose label as 'N doseForm × drugName dosage'", async () => {
    const dose = {
      prescriptionId: "rx-1",
      drugName: "Metformin",
      dosage: "500 mg",
      quantity: 2,
      doseForm: "tablet",
      scheduledAt: "2024-03-11T08:00:00Z",
      actionable: true,
      resolvedDose: null,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([dose]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getByText(/2 tablet ×/)).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Metformin 500 mg" }),
      ).toBeTruthy();
    });
  });

  test("drug name and dosage render as a link to the prescription detail route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /metformin 500mg/i });
      expect(link.getAttribute("href")).toBe("/prescriptions/rx-1");
    });
  });

  test("time groups within a day are sorted chronologically", async () => {
    const morningDose = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T09:00:00Z",
    };
    const nightDose = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      scheduledAt: "2024-03-11T21:00:00Z",
    };
    const eveningDose = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-3",
      scheduledAt: "2024-03-11T20:00:00Z",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      // Intentionally out of order: 9am, 9pm, 8pm
      new Response(JSON.stringify([morningDose, nightDose, eveningDose]), {
        status: 200,
      }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      const times = screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent);
      expect(times).toEqual(["9:00 AM", "8:00 PM", "9:00 PM"]);
    });
  });

  test("two doses at different times each get their own time header", async () => {
    const morningDose = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
    };
    const eveningDose = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      scheduledAt: "2024-03-11T20:00:00Z",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([morningDose, eveningDose]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getByText("8:00 AM")).toBeTruthy();
      expect(screen.getByText("8:00 PM")).toBeTruthy();
    });
  });

  test("checking one dose in a shared time slot does not check the other", async () => {
    const dose1 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      drugName: "Metformin",
    };
    const dose2 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      drugName: "Lisinopril",
      doseForm: "capsule",
    };
    const createdDose = {
      id: "dose-new",
      patientId: "patient-1",
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00Z",
      status: "taken",
      loggedAt: "2024-03-11T09:00:00.000Z",
      createdAt: "2024-03-11T09:00:00.000Z",
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([dose1, dose2]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createdDose), { status: 201 }),
      );
    render(<App today={TODAY} />);
    await waitFor(() => screen.getAllByRole("checkbox"));

    const [firstCheckbox] = screen.getAllByRole(
      "checkbox",
    ) as HTMLInputElement[];
    await userEvent.click(firstCheckbox);

    await waitFor(() => {
      const [cb1, cb2] = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(cb1.checked).toBe(true);
      expect(cb2.checked).toBe(false);
    });
  });

  test("two doses at the same time each get their own checkbox", async () => {
    const dose1 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      drugName: "Metformin",
    };
    const dose2 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      drugName: "Lisinopril",
      doseForm: "capsule",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([dose1, dose2]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    });
  });

  test("both drug labels appear under a shared time header", async () => {
    const dose1 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      drugName: "Metformin",
    };
    const dose2 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      drugName: "Lisinopril",
      doseForm: "capsule",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([dose1, dose2]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getByText(/Metformin/)).toBeTruthy();
      expect(screen.getByText(/Lisinopril/)).toBeTruthy();
    });
  });

  test("when two doses share the same scheduled time, the time appears once", async () => {
    const dose1 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-1",
      drugName: "Metformin",
    };
    const dose2 = {
      ...MONDAY_DOSE,
      prescriptionId: "rx-2",
      drugName: "Lisinopril",
      doseForm: "capsule",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([dose1, dose2]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getAllByText("8:00 AM")).toHaveLength(1);
    });
  });

  test("fetches scheduled doses for the current week on mount", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => screen.getByRole("link", { name: /metformin 500mg/i }));

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string];
    expect(url).toContain("start=2024-03-11");
    expect(url).toContain("end=2024-03-17");
  });

  test("shows all seven day headings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
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

  test("marks today's heading with aria-current", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    const todayHeading = screen.getByText("Wednesday");
    expect(todayHeading.closest("[aria-current='date']")).toBeTruthy();
  });

  test("shows empty state when no scheduled doses exist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getByText(/no doses scheduled/i)).toBeTruthy();
    });
  });

  test("disables the checkbox for non-actionable future doses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE, FRIDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      const disabled = checkboxes.filter(
        (cb) => (cb as HTMLInputElement).disabled,
      );
      expect(disabled).toHaveLength(1);
    });
  });

  test("checks the checkbox for a resolved taken dose", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([MONDAY_DOSE_RESOLVED]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { checked: true })).toBeTruthy();
    });
  });

  test("clicking an unresolved actionable checkbox posts a taken dose and checks it", async () => {
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
    await waitFor(() => screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("checkbox"));

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

  test("clicking a resolved checkbox sends DELETE and unchecks the item", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE_RESOLVED]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    render(<App today={TODAY} />);
    await waitFor(() => screen.getByRole("checkbox", { checked: true }));

    await userEvent.click(screen.getByRole("checkbox", { checked: true }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { checked: false })).toBeTruthy();
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const deleteCall = calls.find(([url, init]) => {
      const method = (init as RequestInit | undefined)?.method;
      return (
        typeof url === "string" &&
        url.includes("/api/v1/doses/dose-1") &&
        method === "DELETE"
      );
    });
    expect(deleteCall).toBeTruthy();
  });

  test("future non-actionable checkboxes are disabled", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([FRIDAY_DOSE]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    await waitFor(() => {
      const cb = screen.getByRole("checkbox") as HTMLInputElement;
      expect(cb.disabled).toBe(true);
    });
  });

  test("Previous week button is always visible", async () => {
    mockRegistrationDate = REGISTRATION_DATE;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    expect(screen.getByRole("button", { name: /previous week/i })).toBeTruthy();
  });

  test("clicking Previous week fetches doses for the prior week", async () => {
    mockRegistrationDate = REGISTRATION_DATE;
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<App today={TODAY} />);
    await waitFor(() =>
      expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(1),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /previous week/i }),
    );

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const lastCall = calls[calls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("start=2024-03-04");
      expect(url).toContain("end=2024-03-10");
    });
  });

  test("Previous week button is disabled when at the registration floor week", async () => {
    // TODAY is 2024-03-13, register on 2024-03-11 (Monday) → floor is 2024-03-11 (current week)
    mockRegistrationDate = "2024-03-11";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    const btn = screen.getByRole("button", {
      name: /previous week/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test("Next week button is disabled when viewing the current week", async () => {
    mockRegistrationDate = REGISTRATION_DATE;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App today={TODAY} />);
    const btn = screen.getByRole("button", {
      name: /next week/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test("clicking Next week fetches the following week's doses", async () => {
    mockRegistrationDate = REGISTRATION_DATE;
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<App today={TODAY} />);
    await waitFor(() =>
      expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(1),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /previous week/i }),
    );
    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      expect(calls[calls.length - 1][0] as string).toContain(
        "start=2024-03-04",
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /next week/i }));
    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const url = calls[calls.length - 1][0] as string;
      expect(url).toContain("start=2024-03-11");
      expect(url).toContain("end=2024-03-17");
    });
  });

  describe("locale-aware date formatting", () => {
    afterEach(async () => {
      await i18next.changeLanguage("en-US");
    });

    test("formatDate uses pt-BR locale when language is pt-BR", async () => {
      await i18next.changeLanguage("pt-BR");
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
      );
      render(<App today={TODAY} />);
      // Monday 2024-03-11 in pt-BR long format: "11 de março de 2024"
      await waitFor(() => {
        expect(screen.getByText("11 de março de 2024")).toBeTruthy();
      });
    });

    test("formatShortDate uses pt-BR locale in the week range heading", async () => {
      await i18next.changeLanguage("pt-BR");
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      render(<App today={TODAY} />);
      // Week 2024-03-11 to 2024-03-17 in pt-BR: "11/03/2024–17/03/2024"
      await waitFor(() => {
        expect(screen.getByText("11/03/2024–17/03/2024")).toBeTruthy();
      });
    });

    test("formatTime passes the active language as locale to toLocaleTimeString", async () => {
      await i18next.changeLanguage("pt-BR");
      const spy = vi.spyOn(Date.prototype, "toLocaleTimeString");
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([MONDAY_DOSE]), { status: 200 }),
      );
      render(<App today={TODAY} />);
      await waitFor(() => screen.getAllByRole("heading", { level: 3 }));
      expect(spy.mock.calls.some(([locale]) => locale === "pt-BR")).toBe(true);
    });
  });

  test("derives today from patient timezone when no today prop is given", async () => {
    // 2024-03-12T01:00:00Z = UTC Tuesday, but America/New_York (UTC-4, DST) = Monday 2024-03-11 at 9 PM
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-12T01:00:00Z"));
    mockTimezone = "America/New_York";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<App />);
    // Local NY date is Monday 2024-03-11 — Monday heading should carry aria-current
    const mondayHeading = screen.getByText("Monday");
    expect(mondayHeading.closest("[aria-current='date']")).toBeTruthy();
    const tuesdayHeading = screen.getByText("Tuesday");
    expect(tuesdayHeading.closest("[aria-current='date']")).toBeFalsy();
  });
});

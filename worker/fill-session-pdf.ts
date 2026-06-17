import puppeteer from "@cloudflare/puppeteer";
import {
  groupByMedicine,
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  type Compartment,
  type MedicineCard,
} from "../shared/fill-session";
import { nearestSunday, sessionDates } from "../shared/week-boundaries";

const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_ABBR: Record<string, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

function resolveCompartments(organizerParam: string | null): Compartment[] {
  switch (organizerParam) {
    case "2":
      return TWO_COMPARTMENTS;
    case "3":
      return THREE_COMPARTMENTS;
    case "4":
      return FOUR_COMPARTMENTS;
    default:
      return ONE_COMPARTMENT;
  }
}

function formatFilenameDate(iso: string): string {
  return iso.replace(/-/g, "_");
}

function formatMonthDay(iso: string, locale: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(
  cards: MedicineCard[],
  compartments: Compartment[],
  startDate: string,
  sessionDatesMap: Record<string, { date: string; wrapped: boolean }>,
  locale: string,
): string {
  const endDate = addDays(startDate, 6);
  const startFmt = formatMonthDay(startDate, locale);
  const endFmt = formatMonthDay(endDate, locale);

  const cardRows = cards
    .map((card) => {
      const slotRows = card.slots
        .map((slot) => {
          const cells = WEEK_DAYS.map((day) => {
            const qty = slot.quantities[day] ?? 0;
            return `<td class="cell${qty === 0 ? " cell-empty" : ""}">${qty > 0 ? qty : ""}</td>`;
          }).join("");
          return `<tr><td class="slot-label">${slot.compartmentLabel}<br><span class="slot-time">${compartments.find((c) => c.label === slot.compartmentLabel)?.startTime ?? ""}–${compartments.find((c) => c.label === slot.compartmentLabel)?.endTime ?? ""}</span></td>${cells}</tr>`;
        })
        .join("");

      const dayHeaders = WEEK_DAYS.map((day) => {
        const { date, wrapped } = sessionDatesMap[day];
        const wrappedClass = wrapped ? " day-header--wrapped" : "";
        return `<th class="day-header${wrappedClass}">${DAY_ABBR[day]}<br><span class="day-date">${formatMonthDay(date, locale)}</span></th>`;
      }).join("");

      return `
        <div class="card">
          <div class="card-header">
            <span class="drug-name">${escapeHtml(card.drugName)}</span>
            <span class="drug-dosage">${escapeHtml(card.dosage)}</span>
            <span class="weekly-total">${card.weeklyTotal} pills/week</span>
          </div>
          <table class="grid">
            <thead><tr><th></th>${dayHeaders}</tr></thead>
            <tbody>${slotRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .date-range { font-size: 14px; color: #555; margin-bottom: 20px; }
  .card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 16px; break-inside: avoid; }
  .card-header { display: flex; align-items: baseline; gap: 8px; padding: 8px 12px; background: #fef9e7; }
  .drug-name { font-weight: 700; font-size: 13px; }
  .drug-dosage { font-size: 11px; color: #888; }
  .weekly-total { font-weight: 700; margin-left: auto; }
  .grid { width: 100%; border-collapse: collapse; }
  .grid th, .grid td { border: none; padding: 4px 6px; text-align: center; }
  .day-header { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
  .day-header--wrapped { color: #b45309; }
  .day-date { font-size: 9px; font-weight: 400; text-transform: none; letter-spacing: 0; display: block; }
  .slot-label { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #555; width: 60px; }
  .slot-time { font-size: 9px; font-weight: 400; text-transform: none; letter-spacing: 0; color: #aaa; }
  .cell { border: 1.5px solid #aaa; border-radius: 4px; width: 28px; height: 28px; font-size: 13px; font-weight: 700; }
  .cell-empty { border-style: dashed; border-color: #ddd; }
</style>
</head>
<body>
  <h1>Fill Session Worksheet</h1>
  <p class="date-range">${startFmt} – ${endFmt}</p>
  ${cardRows}
</body>
</html>`;
}

interface PdfEnv {
  BROWSER: unknown;
}

export async function handleFillSessionPdf(
  request: Request,
  env: PdfEnv,
  prescriptions: Array<{
    drugName: string;
    dosage: string;
    schedule: {
      days: Record<string, Array<{ time: string; quantity: number }>>;
    };
  }>,
  patientTimezone: string | null,
  patientLanguage: string | null,
): Promise<Response> {
  const locale = patientLanguage ?? "en-US";
  const url = new URL(request.url);
  const organizerParam = url.searchParams.get("organizer");
  const compartments = resolveCompartments(organizerParam);

  const tz = patientTimezone ?? "UTC";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
    new Date(),
  );
  const startDateParam = url.searchParams.get("startDate");
  const startDate =
    startDateParam && /^\d{4}-\d{2}-\d{2}$/.test(startDateParam)
      ? startDateParam
      : nearestSunday(today);
  const sessionDatesMap = sessionDates(startDate);
  const endDate = addDays(startDate, 6);

  const cards = groupByMedicine(prescriptions, compartments);
  const html = buildHtml(
    cards,
    compartments,
    startDate,
    sessionDatesMap,
    locale,
  );

  const browser = await puppeteer.launch(
    env.BROWSER as Parameters<typeof puppeteer.launch>[0],
  );
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await page.close();
  await browser.close();

  const startDate_ = formatFilenameDate(startDate);
  const endDate_ = formatFilenameDate(endDate);
  const filename = `Pillbug_Worksheet-${startDate_}-${endDate_}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

# Server-side PDF generation for the Fill Session Worksheet

The Fill Session page has a "Save as PDF" button that downloads a worksheet the Patient can share via WhatsApp or email with a print shop. PDF is generated server-side: the Worker fetches the Patient's active Prescriptions from D1, builds a self-contained HTML string with inline CSS mirroring the print styles, and passes it to Cloudflare Browser Rendering (headless Chromium) to produce a vector PDF binary returned as a file download.

## Considered options

**`window.print()` with "Save as PDF"** (already exists as "Print Worksheet"): Requires the Patient to navigate the browser print dialog and choose "Save as PDF" — a non-obvious step for the target user (elderly patients unfamiliar with the print dialog). Not suitable as a one-tap download.

**Client-side `html2canvas` + `jsPDF`**: No server infrastructure needed, but output is rasterized — the PDF is a screenshot of the page. Print shops receive an image-based file; text is not selectable, resolution is fixed, and file size is large. Ruled out on quality grounds.

**Headless browser renders the live React app**: Avoids a separate HTML template, but the headless browser must be authenticated. This requires generating a short-lived one-time token, threading it through the request, and cleaning it up — significant complexity for no quality gain over a self-contained template.

**Self-contained HTML template rendered server-side** (chosen): The Worker generates a minimal HTML string with all data inlined and CSS embedded. No auth token plumbing. The data-computation logic (`groupByMedicine`, compartment definitions) lives in `shared/fill-session.ts` and is imported by both the Worker and the frontend, so the grid values are computed identically. Only the visual template needs to stay in sync with the React component manually.

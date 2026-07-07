import { writeFileSync } from "node:fs";
import prettier from "prettier";

const filePath = "src/data/drug-names.json";

// Prescribable RxTerms ingredient list: a curated subset of RxNorm scoped to
// ingredients of currently marketed drug products, rather than the full
// RxNorm `tty=IN` concept set (which includes excipients, vaccine antigens,
// and other non-prescribed chemical entries). See
// https://clinicaltables.nlm.nih.gov/apidoc/drug_ingredients/v3/doc.html
const PAGE_SIZE = 500;
const BASE_URL =
  "https://clinicaltables.nlm.nih.gov/api/drug_ingredients/v3/search";

const allNames = [];
let offset = 0;
while (true) {
  const url = `${BASE_URL}?terms=&count=${PAGE_SIZE}&offset=${offset}&df=name`;
  const res = await fetch(url);
  const [total, , , display] = await res.json();
  allNames.push(...display.map(([name]) => name));
  offset += PAGE_SIZE;
  if (offset >= total) break;
}

const names = [...new Set(allNames.map((name) => name.toLowerCase()))].sort();
const config = await prettier.resolveConfig(filePath);
const formatted = await prettier.format(JSON.stringify(names), {
  ...config,
  filepath: filePath,
});
writeFileSync(filePath, formatted);
console.log(`Wrote ${names.length} names to ${filePath}`);

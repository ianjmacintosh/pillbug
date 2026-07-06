import { writeFileSync } from "node:fs";
import prettier from "prettier";

const filePath = "src/data/drug-names.json";

const res = await fetch(
  "https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty=IN",
);
const {
  minConceptGroup: { minConcept },
} = await res.json();
const names = [...new Set(minConcept.map((c) => c.name.toLowerCase()))].sort();
const config = await prettier.resolveConfig(filePath);
const formatted = await prettier.format(JSON.stringify(names), {
  ...config,
  filepath: filePath,
});
writeFileSync(filePath, formatted);
console.log(`Wrote ${names.length} names to ${filePath}`);

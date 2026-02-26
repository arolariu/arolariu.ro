import fs from "fs";
const bak = JSON.parse(fs.readFileSync("messages/en.json.bak", "utf-8"));
console.log("=== Domains.services (top-level keys besides invoices) ===");
const services = bak.Domains?.services ?? {};
console.log(Object.keys(services));
for (const [k,v] of Object.entries(services)) {
  if (k !== "invoices") console.log(`  ${k}:`, JSON.stringify(v)?.slice(0,200));
}
console.log("\n=== Domains.services.invoices.card ===");
console.log(JSON.stringify(bak.Domains?.services?.invoices?.card, null, 2));
console.log("\n=== Domains.services.invoices top-level (non service/ui) ===");
const inv = bak.Domains?.services?.invoices ?? {};
for (const [k,v] of Object.entries(inv)) {
  if (k !== "service" && k !== "ui") console.log(`  ${k}:`, JSON.stringify(v)?.slice(0,300));
}

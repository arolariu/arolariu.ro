import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf-8"));
const enBak = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json.bak"), "utf-8"));

// Check what Domains.services.invoices top-level keys existed
const invSrc = enBak.Domains?.services?.invoices ?? {};
console.log("=== Old Domains.services.invoices top-level keys ===");
console.log(Object.keys(invSrc));

// Check what's in the new Domains.services
console.log("\n=== New Domains.services ===");
console.log(JSON.stringify(en.Domains?.services, null, 2)?.slice(0, 500));

// Check new Invoices structure (just top-level keys)
console.log("\n=== New Invoices top-level keys ===");
console.log(Object.keys(en.Invoices));

// Check if Invoices.Homepage has content
console.log("\n=== Invoices.Homepage keys ===");
console.log(Object.keys(en.Invoices?.Homepage ?? {}));

// Check Common
console.log("\n=== Common ===");
console.log(JSON.stringify(en.Common, null, 2));

// Check Errors
console.log("\n=== Errors keys ===");
console.log(Object.keys(en.Errors));

// Check Auth (was Authentication)
console.log("\n=== Auth keys ===");
console.log(Object.keys(en.Auth));

// Check Profile (was MyProfile)
console.log("\n=== Profile keys ===");
console.log(Object.keys(en.Profile));

// Check Legal
console.log("\n=== Legal keys ===");
console.log(Object.keys(en.Legal));
console.log("Legal.PrivacyPolicy keys:", Object.keys(en.Legal?.PrivacyPolicy ?? {}));

// Verify __metadata__ is gone everywhere
function findKey(obj, keyName, path = "") {
  const found = [];
  if (!obj || typeof obj !== "object") return found;
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (k === keyName) found.push(p);
    if (typeof v === "object" && v !== null) found.push(...findKey(v, keyName, p));
  }
  return found;
}
console.log("\n=== Remaining __metadata__ keys ===");
console.log(findKey(en, "__metadata__"));
console.log("\n=== Remaining 'meta' keys (should only be in content, not as metadata convention) ===");
const metaKeys = findKey(en, "meta");
console.log(metaKeys.length > 0 ? metaKeys : "None");

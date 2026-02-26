/**
 * Fix PR #459 review issues in all 3 locale files:
 * 1. tableView.aria.selectInvoice: {id} → {name}
 * 2. importDialog.buttons: add importWithCount ICU message
 * 3. receiptScanCard: add titleWithIndex and dialogTitleWithIndex ICU messages
 * 4. imageCard: add titleWithIndex and dialogTitleWithIndex ICU messages
 */
import fs from "fs";

const locales = ["en", "ro", "fr"];

for (const locale of locales) {
  const filePath = `messages/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Fix 1: tableView.aria.selectInvoice — rename {id} to {name}
  const selectInvoice = data.Invoices?.ViewInvoices?.tableView?.aria?.selectInvoice;
  if (selectInvoice) {
    data.Invoices.ViewInvoices.tableView.aria.selectInvoice = selectInvoice.replace("{id}", "{name}");
  }

  // Fix 2: importDialog.buttons — add importWithCount ICU message
  if (data.Invoices?.ViewInvoices?.importDialog?.buttons) {
    const buttons = data.Invoices.ViewInvoices.importDialog.buttons;
    if (!buttons.importWithCount) {
      // Use ICU number format — the import label with file count
      const importLabel = buttons.import; // "Import" / "Importă" / "Importer"
      buttons.importWithCount = `${importLabel} ({count})`;
    }
  }

  // Fix 3: receiptScanCard — add titleWithIndex and dialogTitleWithIndex
  const rsc = data.Invoices?.ViewInvoice?.receiptScanCard;
  if (rsc) {
    if (!rsc.titleWithIndex) {
      rsc.titleWithIndex = `${rsc.title} ({current}/{total})`;
    }
    if (!rsc.dialogTitleWithIndex) {
      rsc.dialogTitleWithIndex = `${rsc.dialogTitle} ({current}/{total})`;
    }
  }

  // Fix 4: imageCard — add titleWithIndex and dialogTitleWithIndex
  const ic = data.Invoices?.EditInvoice?.imageCard;
  if (ic) {
    if (!ic.titleWithIndex) {
      ic.titleWithIndex = `${ic.title} ({current}/{total})`;
    }
    if (!ic.dialogTitleWithIndex) {
      ic.dialogTitleWithIndex = `${ic.dialogTitle} ({current}/{total})`;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Fixed ${locale}.json`);
}

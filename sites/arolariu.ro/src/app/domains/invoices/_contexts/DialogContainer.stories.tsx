import type {Meta, StoryObj} from "@storybook/react";
import {
  TbAlertTriangle,
  TbAnalyze,
  TbFileInvoice,
  TbMessage,
  TbPhoto,
  TbReceipt,
  TbShare,
  TbShoppingCart,
  TbToolsKitchen3,
  TbTrash,
} from "react-icons/tb";

/**
 * Static visual preview of the DialogContainer component.
 *
 * @remarks Static preview — DialogContainer imports child dialog components that transitively
 * import "use server" actions from domain-level modules: DeleteInvoiceDialog → `deleteInvoice` from `_actions/invoices`,
 * ShareInvoiceDialog → `patchInvoice` from `_actions/invoices`, AddScanDialog → `attachScanToInvoice`
 * and `createScan` from `_actions/scans`, AnalyzeDialog → `analyzeInvoice` from `_actions/invoices`,
 * RemoveScanDialog → `detachScanFromInvoice` from `_actions/scans`, and CreateInvoiceDialog → `createInvoiceFromScans`
 * from `view-scans/_actions/createInvoiceFromScans`. Storybook's Vite bundler cannot process server-only modules.
 * This story renders a schematic subset of common dialog registrations rather than an exhaustive registry dump.
 */
const meta = {
  title: "Invoices/Dialogs/DialogContainer",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "**Static Preview:** Manages visibility of invoice-related dialogs via `useDialogs` context. Conditionally renders the active dialog " +
          "based on current dialog type from context state. Returns `null` when no dialog is open. " +
          "**Blocker:** Real component imports child dialogs (DeleteInvoiceDialog, ShareInvoiceDialog, AddScanDialog, AnalyzeDialog, RemoveScanDialog, CreateInvoiceDialog) " +
          "that transitively import 'use server' actions (`deleteInvoice`, `patchInvoice`, `attachScanToInvoice`, `createScan`, `analyzeInvoice`, " +
          "`detachScanFromInvoice`, `createInvoiceFromScans`) from domain-level action modules (`_actions/invoices`, `_actions/scans`, `view-scans/_actions/createInvoiceFromScans`). " +
          "Storybook's Vite bundler cannot process server-only modules. This static schematic documents representative dialog registrations; individual dialog stories cover concrete mounted dialog content.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const dialogTypes = [
  {
    icon: <TbAnalyze style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__ANALYSIS",
    label: "Analyze Invoice",
    color: "#a855f7",
  },
  {
    icon: <TbShoppingCart style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__ITEMS",
    label: "Edit Items",
    color: "#3b82f6",
  },
  {icon: <TbMessage style={{height: "1.25rem", width: "1.25rem"}} />, type: "EDIT_INVOICE__FEEDBACK", label: "Feedback", color: "#22c55e"},
  {
    icon: <TbReceipt style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__MERCHANT",
    label: "Merchant Details",
    color: "#f97316",
  },
  {
    icon: <TbReceipt style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__MERCHANT_INVOICES",
    label: "Merchant Receipts",
    color: "#f59e0b",
  },
  {
    icon: <TbFileInvoice style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__METADATA",
    label: "Metadata",
    color: "#06b6d4",
  },
  {icon: <TbPhoto style={{height: "1.25rem", width: "1.25rem"}} />, type: "EDIT_INVOICE__IMAGE", label: "Image View", color: "#6366f1"},
  {icon: <TbPhoto style={{height: "1.25rem", width: "1.25rem"}} />, type: "EDIT_INVOICE__ADD_SCAN", label: "Add Scan", color: "#14b8a6"},
  {
    icon: <TbPhoto style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__REMOVE_SCAN",
    label: "Remove Scan",
    color: "#14b8a6",
  },
  {
    icon: <TbToolsKitchen3 style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__RECIPE_ADD",
    label: "Add Recipe",
    color: "#f43f5e",
  },
  {
    icon: <TbToolsKitchen3 style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__RECIPE_UPDATE",
    label: "Update Recipe",
    color: "#f43f5e",
  },
  {
    icon: <TbToolsKitchen3 style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__RECIPE_DELETE",
    label: "Delete Recipe",
    color: "#f43f5e",
  },
  {
    icon: <TbToolsKitchen3 style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__RECIPE_PREVIEW",
    label: "Preview Recipe",
    color: "#f43f5e",
  },
  {
    icon: <TbToolsKitchen3 style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "EDIT_INVOICE__RECIPE_SHARE",
    label: "Share Recipe",
    color: "#f43f5e",
  },
  {
    icon: <TbShare style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "VIEW_INVOICE__SHARE_ANALYTICS",
    label: "Share Analytics",
    color: "#8b5cf6",
  },
  {
    icon: <TbFileInvoice style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "VIEW_SCANS__CREATE_INVOICE",
    label: "Create Invoice",
    color: "#d946ef",
  },
  {
    icon: <TbTrash style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "SHARED__INVOICE_DELETE",
    label: "Delete Invoice",
    color: "#ef4444",
  },
  {
    icon: <TbShare style={{height: "1.25rem", width: "1.25rem"}} />,
    type: "SHARED__INVOICE_SHARE",
    label: "Share Invoice",
    color: "#10b981",
  },
];

/** Overview of representative dialog types managed by the container. */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Displays a schematic grid showing representative dialog types from the container, organized by category (analysis, items, merchant, metadata, scans, recipes, sharing, deletion). This is intentionally not an exhaustive registry.",
      },
    },
  },
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: "600"}}>Dialog Container</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
          Shows representative invoice dialog registrations via{" "}
          <code
            style={{
              borderRadius: "0.25rem",
              backgroundColor: "#f3f4f6",
              paddingLeft: "0.25rem",
              paddingRight: "0.25rem",
              fontSize: "0.75rem",
            }}>
            useDialogs
          </code>{" "}
          context. Renders the active dialog based on the current dialog type.
        </p>
      </div>

      <div style={{padding: "1.5rem"}}>
        <p
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.75rem",
            fontWeight: "500",
            letterSpacing: "0.05em",
            color: "#6b7280",
            textTransform: "uppercase",
          }}>
          Registered Dialog Types
        </p>
        <div style={{display: "grid", gap: "0.5rem"}}>
          {dialogTypes.map((d) => (
            <div
              key={d.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                padding: "0.75rem",
              }}>
              <div style={{color: d.color}}>{d.icon}</div>
              <div style={{flex: "1"}}>
                <p style={{fontSize: "0.875rem", fontWeight: "500"}}>{d.label}</p>
                <code style={{fontSize: "0.75rem", color: "#9ca3af"}}>{d.type}</code>
              </div>
              <div style={{height: "0.5rem", width: "0.5rem", borderRadius: "9999px", backgroundColor: "#d1d5db"}} />
            </div>
          ))}
        </div>

        <div
          style={{marginTop: "1rem", borderRadius: "0.5rem", border: "1px solid #fcd34d", backgroundColor: "#fffbeb", padding: "0.75rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbAlertTriangle style={{height: "1rem", width: "1rem", color: "#d97706"}} />
            <p style={{fontSize: "0.75rem", color: "#92400e"}}>
              Only one dialog is rendered at a time. The container returns <code style={{fontFamily: "monospace"}}>null</code> when no
              dialog is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

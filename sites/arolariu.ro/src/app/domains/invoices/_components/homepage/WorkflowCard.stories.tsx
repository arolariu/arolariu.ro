import type {Meta, StoryObj} from "@storybook/react";
import {TbEye, TbFileInvoice, TbUpload} from "react-icons/tb";
import WorkflowCard from "./WorkflowCard";

/**
 * A single workflow step card displaying a step number badge, icon, title,
 * description, and CTA button. Used in the WorkflowSection to show
 * the 3-step invoice management process.
 * This is a pure presentational component with no translations.
 */
const meta = {
  title: "Invoices/Homepage/WorkflowCard",
  component: WorkflowCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof WorkflowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1 — Upload your receipt scans. */
export const UploadStep: Story = {
  args: {
    step: 1,
    title: "Upload Scans",
    description: "Take a photo of your receipt or upload an existing image. Our system supports all major formats.",
    icon: TbUpload,
    href: "/domains/invoices/upload-scans",
    buttonText: "Start Uploading",
    delay: 0,
  },
};

/** Step 2 — Review extracted data. */
export const ReviewStep: Story = {
  args: {
    step: 2,
    title: "Review Data",
    description: "Our AI extracts merchant, items, and totals. Review and confirm the extracted information.",
    icon: TbEye,
    href: "/domains/invoices/view-scans",
    buttonText: "View Scans",
    delay: 0,
  },
};

/** Step 3 — Manage your invoices. */
export const ManageStep: Story = {
  args: {
    step: 3,
    title: "Manage Invoices",
    description: "Browse, search, and analyze your invoices. Share them or export data for accounting.",
    icon: TbFileInvoice,
    href: "/domains/invoices/view-invoices",
    buttonText: "View Invoices",
    delay: 0,
  },
};

/** Upload step — dark mode. */
export const UploadStepDark: Story = {
  args: {...UploadStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Review step — dark mode. */
export const ReviewStepDark: Story = {
  args: {...ReviewStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Manage step — dark mode. */
export const ManageStepDark: Story = {
  args: {...ManageStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

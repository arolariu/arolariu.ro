import type {Meta, StoryObj} from "@storybook/react";
import {TbBrain, TbChartBar, TbLock, TbPhoto} from "react-icons/tb";
import FeatureItem from "./FeatureItem";

/**
 * A single feature item displaying an icon, title, and description.
 * Used in the FeaturesSection to list individual capabilities.
 * This is a pure presentational component with no translations.
 */
const meta = {
  title: "Invoices/Homepage/FeatureItem",
  component: FeatureItem,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FeatureItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** OCR scanning feature item. */
export const OcrScanning: Story = {
  args: {
    icon: TbPhoto,
    title: "Smart OCR Scanning",
    description: "Automatically extract text and data from receipt photos using advanced optical character recognition.",
  },
};

/** Analytics feature item. */
export const Analytics: Story = {
  args: {
    icon: TbChartBar,
    title: "Spending Analytics",
    description: "Track and visualize your spending patterns with interactive charts and category breakdowns.",
  },
};

/** AI-powered feature item. */
export const AiPowered: Story = {
  args: {
    icon: TbBrain,
    title: "AI-Powered Insights",
    description: "Get intelligent recommendations and anomaly detection powered by machine learning.",
  },
};

/** Security feature item. */
export const Security: Story = {
  args: {
    icon: TbLock,
    title: "Bank-Grade Security",
    description: "Your data is encrypted at rest and in transit with enterprise-grade security standards.",
  },
};

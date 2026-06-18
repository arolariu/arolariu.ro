import type {Meta, StoryObj} from "@storybook/react";
import {TbBrain, TbChartBar, TbLock, TbPhoto} from "react-icons/tb";
import FeatureItem from "./FeatureItem";

/**
 * A single feature item displaying an icon, title, and description.
 * Used in the FeaturesSection to list individual capabilities.
 * This is a pure presentational component with no translations.
 */
const meta = {
  title: "arolariu.ro/IMS/Sections/FeatureItem",
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

/** OCR scanning — dark mode. */
export const OcrScanningDark: Story = {
  args: {...OcrScanning.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Analytics — dark mode. */
export const AnalyticsDark: Story = {
  args: {...Analytics.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** AI-powered — dark mode. */
export const AiPoweredDark: Story = {
  args: {...AiPowered.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Security — dark mode. */
export const SecurityDark: Story = {
  args: {...Security.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Feature item with very long title and description text. */
export const LongText: Story = {
  args: {
    icon: TbBrain,
    title: "Advanced Artificial Intelligence-Powered Machine Learning Analytics and Predictive Insights Platform",
    description:
      "Leveraging cutting-edge neural network architectures and natural language processing techniques, our system provides comprehensive real-time analysis of your financial data with unprecedented accuracy. This feature automatically detects spending patterns, identifies anomalies, and generates actionable insights to help you optimize your budget allocation and improve your financial health over time.",
  },
};

/** Feature item with minimal description. */
export const MinimalDescription: Story = {
  args: {
    icon: TbPhoto,
    title: "Quick Scan",
    description: "Scan receipts instantly.",
  },
};

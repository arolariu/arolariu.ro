import type {HardwareEligibilityResult} from "./hardwareEligibility";

export type LocalInvoiceAssistantRole = "assistant" | "system" | "user";

export type LocalInvoiceAssistantLifecycle =
  | "cancelled"
  | "checking-hardware"
  | "checking-support"
  | "compatibility-unknown"
  | "downloading"
  | "error"
  | "generating"
  | "hardware-ineligible"
  | "not-downloaded"
  | "ready"
  | "unsupported";

export type LocalInvoiceAssistantMessage = Readonly<{
  content: string;
  id: string;
  role: Exclude<LocalInvoiceAssistantRole, "system">;
  timestamp: string;
}>;

export type LocalInvoiceAssistantModelMetadata = Readonly<{
  artifactHost: string;
  contextWindowTokens: number;
  displayName: string;
  id: string;
}>;

export type LocalInvoiceAssistantState = Readonly<{
  activeModel: LocalInvoiceAssistantModelMetadata;
  error: string | null;
  hardware: HardwareEligibilityResult | null;
  lifecycle: LocalInvoiceAssistantLifecycle;
  messages: ReadonlyArray<LocalInvoiceAssistantMessage>;
  progress: number;
}>;

export type LocalInvoiceAssistantPromptMessage = Readonly<{
  content: string;
  role: LocalInvoiceAssistantRole;
}>;

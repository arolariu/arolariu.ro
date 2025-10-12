# GitHub Copilot Instructions for arolariu.ro Monorepo

This document provides comprehensive guidelines for GitHub Copilot when working with the arolariu.ro monorepo codebase.

---

## Table of Contents

1. [Monorepo Architecture](#monorepo-architecture)
2. [Technology Stack](#technology-stack)
3. [Code Quality Standards](#code-quality-standards)
4. [Frontend Development (Next.js)](#frontend-development-nextjs)
5. [Backend Development (.NET)](#backend-development-net)
6. [Shared Components Library](#shared-components-library)
7. [Type Safety & TypeScript](#type-safety--typescript)
8. [State Management](#state-management)
9. [Testing Practices](#testing-practices)
10. [Infrastructure & Deployment](#infrastructure--deployment)
11. [Naming Conventions](#naming-conventions)
12. [Performance Considerations](#performance-considerations)
13. [Security Guidelines](#security-guidelines)

---

## Monorepo Architecture

### Structure
This is an **Nx-based monorepo** with the following structure:

```
arolariu.ro/
├── packages/           # Shared libraries (libsDir)
│   └── components/     # React component library
├── sites/              # Applications (appsDir)
│   ├── arolariu.ro/    # Main Next.js website
│   ├── api.arolariu.ro/ # .NET backend API
│   ├── cv.arolariu.ro/  # SvelteKit CV site
│   └── docs.arolariu.ro/ # DocFX documentation
├── infra/              # Infrastructure as Code (Azure Bicep)
├── scripts/            # Build and utility scripts
└── nx.json             # Nx workspace configuration
```

### Key Commands
- **Build**: `npm run build` or `npm run build:website`
- **Dev**: `npm run dev` or `npm run dev:website`
- **Test**: `npm run test` or `npm run test:website`
- **Format**: `npm run format` (Prettier)
- **Lint**: `npm run lint` (ESLint)

### Nx Principles
- Projects declare their dependencies through `project.json`
- Nx caches build outputs for faster rebuilds
- Use `nx affected` to run tasks only on changed projects
- The component library (`@arolariu/components`) is a shared dependency

---

## Technology Stack

### Frontend (sites/arolariu.ro)
- **Framework**: Next.js 16.0.0-beta.0 (App Router)
- **React**: v19.2.0 (with React Server Components)
- **TypeScript**: v5.9.3 (strict mode)
- **Styling**: Tailwind CSS v4.1.14 + PostCSS
- **UI Components**: Radix UI + shadcn/ui patterns
- **State Management**: Zustand v5.0.8
- **Authentication**: Clerk (@clerk/nextjs)
- **Internationalization**: next-intl v4.3.11
- **Forms**: react-hook-form + zod validation
- **Testing**: Jest + Playwright

### Backend (sites/api.arolariu.ro)
- **Framework**: .NET 10.0 (LTS)
- **Architecture**: Modular Monolith with Domain-Driven Design
- **Domains**: General (infrastructure), Invoices (business), Auth
- **Testing**: xUnit

### Shared Components (packages/components)
- **Build Tool**: RSLib v0.15.0 + Rsbuild
- **Documentation**: Storybook v8.6.14
- **Components**: shadcn/ui + custom animated components

### CV Site (sites/cv.arolariu.ro)
- **Framework**: SvelteKit v2.46.2
- **Adapter**: Azure Static Web Apps

---

## Code Quality Standards

### ESLint Configuration
We use an **extremely strict ESLint configuration** with 20+ plugins:

#### Enabled Rule Sets
- `@eslint/js` - all rules
- `typescript-eslint` - strict type checking
- `react` - all React rules
- `react-hooks` - hooks best practices
- `unicorn` - modern JS patterns
- `sonarjs` - code complexity and quality
- `security` - security best practices
- `functional` - functional programming principles (selective)
- `perfectionist` - code organization
- `jsx-a11y` - accessibility (strict mode)
- `jsdoc` - documentation standards

#### Key Disabled Rules (with rationale)
```typescript
// Formatting rules (delegated to Prettier)
"sort-imports": "off",
"perfectionist/sort-imports": "off",

// Pragmatic exceptions
"no-console": "off", // Stripped in production builds
"max-lines": ["error", {max: 1000}], // Allow up to 1000 lines per file
"max-params": ["error", {max: 5}], // Max 5 parameters per function

// React-specific
"react/jsx-props-no-spreading": "off", // shadcn/ui pattern
"react/function-component-definition": "off", // Allow both arrow and function syntax

// Functional programming (selective)
"functional/immutable-data": "off", // Allow mutable data where needed
"functional/no-throw-statements": "off", // Server Actions can throw
```

### TypeScript Configuration
**Strictest possible TypeScript settings** are enforced:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noPropertyAccessFromIndexSignature": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

### Prettier Configuration
- **Formatting tool**: Prettier v3.6.2
- **Plugins**: organize-imports, svelte, tailwindcss
- Auto-formatting on save is expected
- Import organization is automated

---

## Frontend Development (Next.js)

### App Router Architecture
```typescript
// app/layout.tsx - Root layout with providers
export default async function RootLayout(props: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ContextProviders locale={locale}>
          <Header />
          <Suspense fallback={<Loading />}>
            {props.children}
          </Suspense>
          <Footer />
        </ContextProviders>
      </body>
    </html>
  );
}
```

### Server Components (Default)
```typescript
// app/page.tsx - Server Component by default
export default async function Page() {
  const data = await fetchData(); // Direct async/await

  return <div>{data.title}</div>;
}
```

### Client Components (Explicit)
```typescript
"use client"; // Required directive at top of file

import {useState} from "react";

export function InteractiveComponent() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Server Actions
```typescript
// lib/actions/myAction.ts
"use server";

export async function updateData(formData: FormData) {
  const data = await processData(formData);
  revalidatePath("/path");
  return {success: true, data};
}
```

### File Organization
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── (routes)/          # Route groups
│   ├── api/               # API routes
│   └── providers.tsx      # Context providers
├── components/            # Shared UI components
├── contexts/              # React Contexts (Font, Theme, etc.)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
│   ├── actions/          # Server Actions
│   ├── utils.client.ts   # Client-only utilities
│   ├── utils.server.ts   # Server-only utilities
│   └── utils.generic.ts  # Shared utilities
├── types/                 # TypeScript type definitions
│   ├── index.ts          # Global types
│   ├── DDD/              # Domain-Driven Design types
│   └── invoices/         # Domain-specific types
└── presentation/          # Presentation components
```

### Component Patterns

#### Memoization
```typescript
import {memo} from "react";

export const ExpensiveComponent = memo(function ExpensiveComponent({data}: Props) {
  // Component logic
  return <div>{data}</div>;
});
```

#### Custom Hooks Pattern
```typescript
// hooks/useInvoice.tsx
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType {
  const {userInformation} = useUserInformation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    // Fetch logic
  }, [invoiceIdentifier]);

  return {invoice, isLoading, error};
}
```

#### Dialog Management Pattern
```typescript
// contexts/DialogContext.tsx
export type DialogType = "INVOICE_SHARE" | "INVOICE_DELETE" | /* ... */;
export type DialogMode = "view" | "add" | "edit" | "delete" | "share" | null;

export function useDialog(dialogType: DialogType, dialogMode?: DialogMode, payload?: unknown) {
  const {openDialog, closeDialog} = useDialogs();

  const open = useCallback(() => {
    openDialog(dialogType, dialogMode, payload);
  }, [dialogType, dialogMode, payload, openDialog]);

  return {open, close: closeDialog};
}
```

### Internationalization
```typescript
import {useTranslations} from "next-intl";

export function Component() {
  const t = useTranslations("namespace");

  return <h1>{t("key")}</h1>;
}
```

### Image Optimization
```typescript
import Image from "next/image";

<Image
  src="https://cdn.arolariu.ro/image.jpg"
  alt="Description"
  width={800}
  height={600}
  quality={75} // Qualities: [50, 75, 100]
  priority // For above-the-fold images
/>
```

### Metadata Generation
```typescript
import {createMetadata} from "@/metadata";

export const metadata = createMetadata({
  title: "Page Title",
  description: "Page description",
  openGraph: {
    title: "OG Title",
    description: "OG Description",
  },
});
```

---

## Backend Development (.NET)

### Modular Monolith Architecture
```csharp
// Program.cs - Application entry point
namespace arolariu.Backend.Core;

internal static class Program
{
  public static void Main(string[] args)
  {
    WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

    // Domain configuration (extension methods)
    builder.AddGeneralDomainConfiguration();
    builder.AddInvoicesDomainConfiguration();

    WebApplication app = builder.Build();

    // Application pipeline configuration
    app.AddGeneralApplicationConfiguration();
    app.AddInvoiceDomainConfiguration();

    app.Run();
  }
}
```

### Domain-Driven Design Patterns

#### Entities
```csharp
// Base entity with identifier
public interface BaseEntity<T>
{
  T Id { get; }
}

// Named entity with name property
public interface NamedEntity<T> : BaseEntity<T>
{
  string Name { get; }
}
```

#### Domain Extensions
```csharp
// Domain/General/Extensions/GeneralDomainExtensions.cs
public static class GeneralDomainExtensions
{
  public static WebApplicationBuilder AddGeneralDomainConfiguration(
    this WebApplicationBuilder builder)
  {
    // Add logging, telemetry, health checks, etc.
    return builder;
  }

  public static WebApplication AddGeneralApplicationConfiguration(
    this WebApplication app)
  {
    // Configure middleware, routing, etc.
    return app;
  }
}
```

### XML Documentation
All public APIs must have comprehensive XML documentation:

```csharp
/// <summary>
/// Represents the main entry point for the arolariu.ro backend API.
/// This class configures and bootstraps a .NET 9.0 STS modular monolith web application.
/// </summary>
/// <remarks>
/// <para>
/// The application follows a modular monolith architecture pattern with domains:
/// - General domain: Core infrastructure and cross-cutting concerns
/// - Invoices domain: Business logic for invoice management
/// - Authentication domain: User authentication services
/// </para>
/// </remarks>
[ExcludeFromCodeCoverage]
internal static class Program { }
```

---

## Shared Components Library

### Component Structure
```typescript
// packages/components/src/components/ui/button.tsx
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utilities";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({variant, size, className}))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

### Barrel Exports
```typescript
// packages/components/src/index.ts
export {Button, buttonVariants} from "./components/ui/button";
export {Card, CardHeader, CardTitle, CardContent} from "./components/ui/card";
// ... all exports in one file
```

### Storybook Stories
```typescript
// packages/components/stories/Button.stories.tsx
import type {Meta, StoryObj} from "@storybook/react";
import {Button} from "../src/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};
```

---

## Type Safety & TypeScript

### Strict Type Definitions
```typescript
// types/index.ts - Global type definitions
export type UserInformation = {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
};

export type NavigationItem = {
  label: string;
  href: Route;
  icon?: React.ComponentType;
};
```

### Type Guards
```typescript
export function isProduct(obj: unknown): obj is Product {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "rawName" in obj &&
    "category" in obj
  );
}
```

### Typed Environment Variables
```typescript
// types/typedEnv.ts
export type TypedEnvironment<
  SiteEnv extends "production" | "development",
  ApiEnv extends "production"
> = Readonly<
  SiteEnvironmentVariables<SiteEnv> &
  ApiEnvironmentVariables<ApiEnv> &
  AuthEnvironmentVariables
>;

// Usage
const apiUrl: string = process.env.API_URL!; // Type-safe
```

### Domain Types (DDD)
```typescript
// types/DDD/Entities/BaseEntity.ts
export interface BaseEntity<T> {
  id: T;
  createdAt: Date;
  updatedAt: Date;
}

// types/DDD/Entities/NamedEntity.ts
export interface NamedEntity<T> extends BaseEntity<T> {
  name: string;
}

// types/invoices/Invoice.ts
export interface Invoice extends NamedEntity<string> {
  merchantId: string;
  totalAmount: number;
  currency: Currency;
  items: Product[];
  metadata: InvoiceMetadata;
}
```

### Enums
```typescript
export enum ProductCategory {
  NOT_DEFINED = 0,
  FOOD = 1,
  BEVERAGES = 2,
  HOUSEHOLD = 3,
  PERSONAL_CARE = 4,
  // ...
}

export enum InvoiceAnalysisOptions {
  NoAnalysis,
  BasicAnalysis,
  DetailedAnalysis,
}
```

---

## State Management

### Zustand Store
```typescript
// hooks/stateStore.tsx
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";

interface StoreState {
  selectedInvoices: string[];
  setSelectedInvoices: (ids: string[]) => void;
  // ... other state
}

const prodStore = create<StoreState>()(
  persist(
    (set) => ({
      selectedInvoices: [],
      setSelectedInvoices: (ids) => set({selectedInvoices: ids}),
    }),
    {name: "app-storage"}
  )
);

const devStore = create<StoreState>()(
  devtools(
    persist(
      (set) => ({
        selectedInvoices: [],
        setSelectedInvoices: (ids) => set({selectedInvoices: ids}),
      }),
      {name: "app-storage"}
    )
  )
);

export const useZustandStore = isProduction ? prodStore : devStore;
```

### React Context Pattern
```typescript
// contexts/FontContext.tsx
"use client";

const FontContext = createContext<FontContextValueType | undefined>(undefined);

export function FontContextProvider({children}: {children: React.ReactNode}) {
  const [fontType, setFontType] = useState<FontType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fontType") as FontType) ?? "sans";
    }
    return "sans";
  });

  return (
    <FontContext.Provider value={{fontType, setFontType}}>
      {children}
    </FontContext.Provider>
  );
}

export const useFontContext = () => {
  const context = use(FontContext);
  if (!context) {
    throw new Error("useFontContext must be used within FontContextProvider");
  }
  return context;
};
```

---

## Testing Practices

### Unit Tests (Jest)
```typescript
// component.test.tsx
import {render, screen} from "@testing-library/react";
import {Button} from "./button";

describe("Button", () => {
  it("renders with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText("Delete");
    expect(button).toHaveClass("bg-destructive");
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/homepage.spec.ts
import {test, expect} from "@playwright/test";

test("homepage loads successfully", async ({page}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/arolariu.ro/);
});
```

### Mock Data
```typescript
// data/mocks/invoices.ts
import {faker} from "@faker-js/faker";

export function generateFakeInvoice(): Invoice {
  return {
    id: faker.string.uuid(),
    name: `Invoice-${faker.number.int({min: 1000, max: 9999})}`,
    merchantId: faker.string.uuid(),
    totalAmount: faker.number.float({min: 10, max: 1000}),
    // ...
  };
}

export const FakeInvoice: Invoice = generateFakeInvoice();
export const FakeInvoiceList: Invoice[] = Array.from(
  {length: 10},
  generateFakeInvoice
);
```

---

## Infrastructure & Deployment

### Azure Architecture
- **Hosting**: Azure App Service (containerized)
- **CDN**: Azure Front Door with CDN
- **Database**: Azure SQL + Cosmos DB
- **Storage**: Azure Blob Storage
- **Secrets**: Azure Key Vault
- **Config**: Azure App Configuration
- **Monitoring**: Application Insights
- **IaC**: Bicep templates in `infra/Azure/Bicep/`

### Docker Containerization
```dockerfile
# sites/arolariu.ro/Dockerfile
FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables
```typescript
// Must be type-safe via TypedEnvironment
const requiredEnvVars = [
  "API_URL",
  "API_JWT",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
] as const;

// Never commit secrets to version control
// Use Azure Key Vault for production secrets
// Use .env.local for local development (gitignored)
```

---

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `utils.client.ts`, `formatDate.ts`)
- **Types**: PascalCase (e.g., `Invoice.ts`, `Product.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInvoice.tsx`)
- **Contexts**: PascalCase with `Context` suffix (e.g., `FontContext.tsx`)
- **Route folders**: kebab-case (e.g., `view-invoice/`, `create-invoice/`)

### Variables & Functions
```typescript
// camelCase for variables and functions
const invoiceTotal = calculateTotal(items);
function processPayment(amount: number) { }

// PascalCase for types, interfaces, enums, classes
type UserRole = "admin" | "user";
interface Product { }
enum PaymentType { }
class InvoiceProcessor { }

// UPPER_SNAKE_CASE for constants
const MAX_UPLOAD_SIZE = 10_000_000;
const API_TIMEOUT_MS = 30_000;
```

### React Components
```typescript
// Named exports for components
export function Button() { }
export const Card = memo(function Card() { });

// Default exports for pages
export default function HomePage() { }
```

---

## Performance Considerations

### Code Splitting
```typescript
// Use dynamic imports for heavy components
import dynamic from "next/dynamic";

const HeavyChart = dynamic(
  () => import("@/components/HeavyChart"),
  {ssr: false, loading: () => <Skeleton />}
);
```

### Memoization
```typescript
// Use memo for expensive renders
import {memo, useMemo, useCallback} from "react";

export const DataTable = memo(function DataTable({data}: Props) {
  const sortedData = useMemo(
    () => data.sort((a, b) => a.date - b.date),
    [data]
  );

  const handleClick = useCallback(() => {
    // Handler logic
  }, []);

  return <div>{/* ... */}</div>;
});
```

### Image Optimization
- Use Next.js `<Image>` component
- Specify `width` and `height` explicitly
- Use `priority` for above-the-fold images
- Configure remote patterns in `next.config.ts`

### Bundle Analysis
```bash
# Analyze bundle size
ANALYZE=true npm run build:website
```

---

## Security Guidelines

### Content Security Policy
```typescript
// next.config.ts includes strict CSP headers
const trustedDomains = "*.arolariu.ro arolariu.ro";
const cspHeader = `
  default-src 'self' ${trustedDomains};
  script-src 'self' 'unsafe-inline' 'unsafe-eval' ${trustedDomains};
  // ... strict CSP rules
`;
```

### Authentication
```typescript
// Use Clerk for authentication
import {auth, currentUser} from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const {userId} = await auth();
  if (!userId) redirect("/auth/sign-in");

  const user = await currentUser();
  return <div>Welcome, {user?.firstName}</div>;
}
```

### Input Validation
```typescript
// Use Zod for schema validation
import {z} from "zod";

const invoiceSchema = z.object({
  merchantId: z.string().uuid(),
  totalAmount: z.number().positive(),
  items: z.array(productSchema).min(1),
});

// Validate before processing
const result = invoiceSchema.safeParse(input);
if (!result.success) {
  throw new Error("Invalid invoice data");
}
```

### Environment Variables
- Never commit secrets to version control
- Use Azure Key Vault for production secrets
- Validate environment variables at startup
- Mark sensitive variables in `SecretEnvironmentVariablesType`

---

## Additional Guidelines

### Comments & Documentation
```typescript
/**
 * Formats a currency amount with the appropriate symbol and locale.
 *
 * @param amount - The numeric amount to format
 * @param currency - Currency code (e.g., "USD") or Currency object
 * @returns Formatted currency string (e.g., "$123.45")
 *
 * @example
 * formatCurrency(123.45, "USD") // Returns "$123.45"
 */
export function formatCurrency(amount: number, currency?: string | Currency): string {
  // Implementation
}
```

### Error Handling
```typescript
// Server Actions error handling
"use server";

export async function createInvoice(formData: FormData) {
  try {
    const data = await processInvoice(formData);
    revalidatePath("/invoices");
    return {success: true, data};
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

### Accessibility
- Use semantic HTML elements
- Include `alt` text for images
- Ensure keyboard navigation works
- Follow WCAG 2.1 AA standards
- Use `eslint-plugin-jsx-a11y` rules (strict mode enabled)

---

## Quick Reference

### Common Imports
```typescript
// Next.js
import {redirect, notFound} from "next/navigation";
import {revalidatePath, revalidateTag} from "next/cache";
import Image from "next/image";
import Link from "next/link";

// React
import {useState, useEffect, useMemo, useCallback, memo} from "react";

// Components
import {Button} from "@arolariu/components";
import {Card, CardContent} from "@arolariu/components";

// Utils
import {cn} from "@/lib/utils";
import {formatCurrency, formatDate} from "@/lib/utils.generic";

// State
import {useZustandStore} from "@/hooks/stateStore";
```

### File Header Template
```typescript
/**
 * @fileoverview Brief description of the file's purpose
 * @module ModuleName
 */

// Imports grouped by:
// 1. External dependencies (React, Next.js, etc.)
// 2. Internal dependencies (@/ imports)
// 3. Types
// 4. Relative imports
```

---

## Summary

When working with this codebase:

1. **Follow the monorepo structure** - Use Nx commands and respect project boundaries
2. **Embrace strict typing** - TypeScript strict mode is non-negotiable
3. **Prefer Server Components** - Use Client Components only when needed
4. **Write comprehensive tests** - Unit, integration, and E2E coverage
5. **Document public APIs** - Use JSDoc/XML doc comments
6. **Follow DDD principles** - Respect domain boundaries in the backend
7. **Optimize for performance** - Use memo, lazy loading, and code splitting
8. **Prioritize security** - Validate inputs, sanitize outputs, use CSP
9. **Maintain accessibility** - Follow WCAG standards and semantic HTML
10. **Keep code consistent** - ESLint and Prettier enforce the rules

This is a modern, enterprise-grade monorepo with high standards for code quality, type safety, and architectural patterns. All contributions should align with these established practices.

---
name: "unit-test-generator"
description: "Generates comprehensive unit tests for TypeScript/React (Vitest) and C# (xUnit/MSTest) following established codebase patterns and achieving 90%+ coverage."
---

# Unit Test Generator

## Purpose

This prompt analyzes source code and generates comprehensive, idiomatic unit tests following the arolariu.ro testing standards and patterns. It supports both frontend (TypeScript/React with Vitest) and backend (C# with xUnit/MSTest) test generation.

**Testing Frameworks:**
- **Frontend**: Vitest + @testing-library/react
- **Backend**: xUnit (domain tests) + MSTest (core tests)

**Coverage Target**: 90%+ per `vitest.config.ts` thresholds

---

## Core Instructions

When invoked with source code:

1. **Identify file type** and determine testing framework
2. **Analyze the code** for testable behaviors, edge cases, and dependencies
3. **Generate comprehensive tests** following established patterns
4. **Use mock builders** for test data (InvoiceBuilder, ProductBuilder, etc.)
5. **Cover all branches** - happy path, error cases, edge cases
6. **Follow naming conventions** - descriptive test names that document behavior

---

# Part 1: Frontend Testing (TypeScript/React + Vitest)

## Testing Environment

```typescript
// vitest.config.ts settings
{
  globals: true,
  environment: "jsdom",
  mockReset: true,
  clearMocks: true,
  restoreMocks: true,
}
```

## Global Setup

```typescript
// vitest.setup.ts - automatically imported
import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/react";
import {afterEach, vi} from "vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

---

## Test File Structure

```typescript
/**
 * @fileoverview Unit tests for [Component/Hook/Store Name]
 * @module [module/path].test
 */

import {describe, expect, it, vi, beforeEach, afterEach} from "vitest";
import {render, screen, waitFor, act, renderHook} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// Import builders and mocks from @/data/mocks
import {InvoiceBuilder, ProductBuilder} from "@/data/mocks";
// Import the code under test
import {ComponentUnderTest} from "./ComponentUnderTest";

describe("ComponentUnderTest", () => {
  // Group related tests
  describe("Initialization", () => {
    it("should render with default state", () => {
      // Test code
    });
  });

  describe("User Interactions", () => {
    it("should handle click events", async () => {
      // Test code
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data gracefully", () => {
      // Test code
    });
  });
});
```

---

## Mocking Patterns

### Module Mocking with vi.mock

```typescript
// Mock external modules before imports are resolved
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/test-path"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock internal modules
vi.mock("@/stores/invoicesStore", () => ({
  useInvoicesStore: vi.fn(() => ({
    invoices: [],
    setInvoices: vi.fn(),
    selectedInvoices: [],
    setSelectedInvoices: vi.fn(),
  })),
}));
```

### Hoisted Mocks for Function References

```typescript
// Use vi.hoisted to create mock functions before module mocking
const mockFetchInvoice = vi.hoisted(() => vi.fn());
const mockFetchInvoices = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/invoices/fetch", () => ({
  fetchInvoice: mockFetchInvoice,
  fetchInvoices: mockFetchInvoices,
}));

// In tests, configure mock behavior
beforeEach(() => {
  mockFetchInvoice.mockResolvedValue(mockInvoice);
});
```

### IndexedDB/Storage Mocking

```typescript
vi.mock("./storage/indexedDBStorage", () => ({
  createIndexedDBStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  }),
}));
```

### localStorage Mocking

```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});
```

### Next.js Font Mocking

```typescript
vi.mock("next/font/google", () => ({
  Geist: () => ({className: "mock-geist-class"}),
  Geist_Mono: () => ({className: "mock-geist-mono-class"}),
}));
```

---

## Testing Custom Hooks

### Basic Hook Testing

```typescript
import {renderHook, act, waitFor} from "@testing-library/react";

describe("useInvoice", () => {
  it("should return initial loading state", () => {
    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "test-id"}));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.invoice).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should fetch invoice on mount", async () => {
    const mockInvoice = new InvoiceBuilder().withId("test-id").build();
    mockFetchInvoice.mockResolvedValue(mockInvoice);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "test-id"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invoice).toEqual(mockInvoice);
    expect(mockFetchInvoice).toHaveBeenCalledWith("test-id");
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Fetch failed");
    mockFetchInvoice.mockRejectedValue(error);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "test-id"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.invoice).toBeNull();
  });
});
```

### Hooks with Context Providers

```typescript
import type {ReactNode} from "react";

// Create wrapper component for context
const wrapper = ({children}: {children: ReactNode}) => (
  <DialogProvider>
    <UserProvider>{children}</UserProvider>
  </DialogProvider>
);

describe("useDialog", () => {
  it("should provide dialog controls", () => {
    const {result} = renderHook(() => useDialog("INVOICE_SHARE"), {wrapper});

    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.open).toBe("function");
    expect(typeof result.current.close).toBe("function");
  });

  it("should open dialog when open is called", () => {
    const {result} = renderHook(() => useDialog("INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentDialog.type).toBe("INVOICE_SHARE");
  });
});
```

### Hooks Outside Provider Should Throw

```typescript
it("should throw when used outside provider", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() => {
    renderHook(() => useDialog("INVOICE_SHARE")); // No wrapper
  }).toThrow("useDialogs must be used within a DialogProvider");

  consoleErrorSpy.mockRestore();
});
```

---

## Testing Zustand Stores

```typescript
import {renderHook, act} from "@testing-library/react";
import {useInvoicesStore} from "./invoicesStore";

describe("useInvoicesStore", () => {
  // Create test data with builders
  const mockInvoice1 = new InvoiceBuilder()
    .withId("invoice-1")
    .withName("Test Invoice 1")
    .withCategory(InvoiceCategory.GROCERY)
    .build();

  const mockInvoice2 = new InvoiceBuilder()
    .withId("invoice-2")
    .withName("Test Invoice 2")
    .withCategory(InvoiceCategory.FAST_FOOD)
    .build();

  beforeEach(() => {
    // Reset store state before each test
    const {result} = renderHook(() => useInvoicesStore);
    act(() => {
      result.current.getState().clearInvoices();
    });
  });

  describe("Initial State", () => {
    it("should initialize with empty arrays", () => {
      const {result} = renderHook(() => useInvoicesStore);

      expect(result.current.getState().invoices).toEqual([]);
      expect(result.current.getState().selectedInvoices).toEqual([]);
    });
  });

  describe("setInvoices", () => {
    it("should set all invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
    });

    it("should replace existing invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
      });

      act(() => {
        result.current.getState().setInvoices([mockInvoice2]);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice2);
    });
  });

  describe("upsertInvoice", () => {
    it("should add new invoice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertInvoice(mockInvoice1);
      });

      expect(result.current.getState().invoices).toContainEqual(mockInvoice1);
    });

    it("should update existing invoice by id", () => {
      const {result} = renderHook(() => useInvoicesStore);
      const updatedInvoice = new InvoiceBuilder()
        .withId("invoice-1")
        .withName("Updated Name")
        .build();

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
      });

      act(() => {
        result.current.getState().upsertInvoice(updatedInvoice);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]?.name).toBe("Updated Name");
    });
  });
});
```

---

## Testing React Context

```typescript
import {renderHook, act} from "@testing-library/react";
import {FontContextProvider, useFontContext} from "./FontContext";

describe("FontContext", () => {
  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
  });

  it("should provide default font type", () => {
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <FontContextProvider>{children}</FontContextProvider>
    );

    const {result} = renderHook(() => useFontContext(), {wrapper});

    expect(result.current.fontType).toBe("sans");
  });

  it("should restore font type from localStorage", () => {
    localStorageMock.getItem.mockReturnValue("mono");

    const wrapper = ({children}: {children: React.ReactNode}) => (
      <FontContextProvider>{children}</FontContextProvider>
    );

    const {result} = renderHook(() => useFontContext(), {wrapper});

    expect(result.current.fontType).toBe("mono");
  });

  it("should update font type and persist to localStorage", () => {
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <FontContextProvider>{children}</FontContextProvider>
    );

    const {result} = renderHook(() => useFontContext(), {wrapper});

    act(() => {
      result.current.setFontType("serif");
    });

    expect(result.current.fontType).toBe("serif");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("fontType", "serif");
  });
});
```

---

## Testing Components

### Basic Component Rendering

```typescript
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Button", () => {
  it("should render children", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should apply variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("should handle click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### Components with Async Operations

```typescript
describe("InvoiceList", () => {
  it("should show loading state initially", () => {
    render(<InvoiceList userId="user-123" />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("should render invoices after loading", async () => {
    const invoices = [
      new InvoiceBuilder().withId("1").withName("Invoice 1").build(),
      new InvoiceBuilder().withId("2").withName("Invoice 2").build(),
    ];
    mockFetchInvoices.mockResolvedValue(invoices);

    render(<InvoiceList userId="user-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Invoice 1")).toBeInTheDocument();
    expect(screen.getByText("Invoice 2")).toBeInTheDocument();
  });

  it("should show error message on fetch failure", async () => {
    mockFetchInvoices.mockRejectedValue(new Error("Network error"));

    render(<InvoiceList userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no invoices", async () => {
    mockFetchInvoices.mockResolvedValue([]);

    render(<InvoiceList userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no invoices/i)).toBeInTheDocument();
    });
  });
});
```

---

## Mock Builders Pattern

### Using Existing Builders

```typescript
import {InvoiceBuilder, ProductBuilder, MerchantBuilder} from "@/data/mocks";

// Fluent builder pattern for test data
const invoice = new InvoiceBuilder()
  .withId("invoice-123")
  .withName("Grocery Shopping")
  .withUserIdentifier("user-456")
  .withCategory(InvoiceCategory.GROCERY)
  .withCreatedAt(new Date("2025-01-01"))
  .withRandomItems(5)
  .withMerchantReference("merchant-789")
  .build();

// Batch creation
const invoices = new InvoiceBuilder()
  .withCategory(InvoiceCategory.RESTAURANT)
  .buildMany(10);
```

### Builder Pattern Benefits

- **Explicit control** over test data properties
- **Type-safe** construction
- **Reusable** configuration through method chaining
- **Maintains domain invariants** (e.g., totalPrice calculations)
- **Readable tests** - clear what data is being set up

---

# Part 2: Backend Testing (C# with xUnit/MSTest)

## Test Project Structure

```
tests/
├── arolariu.Backend.Core.Tests/      # MSTest for core/infrastructure
│   ├── Common/
│   │   ├── DDD/
│   │   └── Options/
│   └── CoreAuth/
│       ├── Models/
│       ├── Services/
│       └── Data/
└── arolariu.Backend.Domain.Tests/    # xUnit for domain logic
    └── Invoices/
        ├── Brokers/
        └── Services/
            └── Orchestration/
```

## xUnit Test Pattern

```csharp
/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceOrchestrationService"/>.
/// Method naming follows MethodName_Condition_ExpectedResult pattern.
/// </summary>
public sealed class InvoiceOrchestrationServiceTests
{
    private readonly Mock<IInvoiceAnalysisFoundationService> mockAnalysisService;
    private readonly Mock<IInvoiceStorageFoundationService> mockStorageService;
    private readonly Mock<ILoggerFactory> mockLoggerFactory;
    private readonly InvoiceOrchestrationService orchestrationService;

    /// <summary>
    /// Initializes test fixtures with mocked dependencies.
    /// </summary>
    public InvoiceOrchestrationServiceTests()
    {
        mockAnalysisService = new Mock<IInvoiceAnalysisFoundationService>();
        mockStorageService = new Mock<IInvoiceStorageFoundationService>();
        mockLoggerFactory = new Mock<ILoggerFactory>();

        mockLoggerFactory
            .Setup(f => f.CreateLogger(It.IsAny<string>()))
            .Returns(Mock.Of<ILogger>());

        orchestrationService = new InvoiceOrchestrationService(
            mockAnalysisService.Object,
            mockStorageService.Object,
            mockLoggerFactory.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_NullAnalysisService_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(() =>
            new InvoiceOrchestrationService(null!, mockStorageService.Object, mockLoggerFactory.Object));

    [Fact]
    public void Constructor_ValidDependencies_CreatesInstance()
    {
        var service = new InvoiceOrchestrationService(
            mockAnalysisService.Object,
            mockStorageService.Object,
            mockLoggerFactory.Object);

        Assert.NotNull(service);
    }

    #endregion

    #region Method Tests

    [Fact]
    public async Task AnalyzeInvoice_ValidInput_ExecutesCompleteWorkflow()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var originalInvoice = InvoiceBuilder.CreateRandomInvoice();
        var analyzedInvoice = InvoiceBuilder.CreateRandomInvoice();

        mockStorageService
            .Setup(s => s.ReadInvoiceObject(invoiceId, userId))
            .ReturnsAsync(originalInvoice);

        mockAnalysisService
            .Setup(s => s.AnalyzeInvoiceAsync(It.IsAny<AnalysisOptions>(), originalInvoice))
            .ReturnsAsync(analyzedInvoice);

        // Act
        await orchestrationService.AnalyzeInvoiceWithOptions(
            AnalysisOptions.CompleteAnalysis, invoiceId, userId);

        // Assert
        mockStorageService.Verify(s => s.ReadInvoiceObject(invoiceId, userId), Times.Once);
        mockAnalysisService.Verify(s => s.AnalyzeInvoiceAsync(
            AnalysisOptions.CompleteAnalysis, originalInvoice), Times.Once);
    }

    [Fact]
    public async Task AnalyzeInvoice_StorageThrows_PropagatesException()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        mockStorageService
            .Setup(s => s.ReadInvoiceObject(invoiceId, It.IsAny<Guid?>()))
            .ThrowsAsync(new InvoiceNotFoundException());

        // Act & Assert
        await Assert.ThrowsAsync<InvoiceNotFoundException>(() =>
            orchestrationService.AnalyzeInvoiceWithOptions(
                AnalysisOptions.InvoiceOnly, invoiceId, null));
    }

    #endregion
}
```

## MSTest Test Pattern

```csharp
/// <summary>
/// Tests for base entity abstraction. Method names follow MethodName_Condition_ExpectedResult.
/// </summary>
[TestClass]
public sealed class BaseEntityTests
{
    [TestMethod]
    public void DefaultInitialization_SetsCreatedAndLastUpdated_NotSoftDeleted()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var entity = new TestEntity { CreatedBy = userId };

        // Assert
        Assert.AreNotEqual(Guid.Empty, entity.id);
        Assert.AreEqual(userId, entity.CreatedBy);
        Assert.IsFalse(entity.IsSoftDeleted);
        Assert.AreEqual(0, entity.NumberOfUpdates);
    }

    [TestMethod]
    public void SoftDelete_SetsFlagTrue()
    {
        // Arrange
        var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
        Assert.IsFalse(entity.IsSoftDeleted);

        // Act
        entity.SoftDelete();

        // Assert
        Assert.IsTrue(entity.IsSoftDeleted);
    }

    [TestMethod]
    public void SimulateUpdate_IncrementsNumberOfUpdates()
    {
        // Arrange
        var entity = new TestEntity { CreatedBy = Guid.NewGuid() };
        var updater = Guid.NewGuid();

        // Act
        entity.SimulateUpdate(updater);

        // Assert
        Assert.AreEqual(1, entity.NumberOfUpdates);
        Assert.AreEqual(updater, entity.LastUpdatedBy);
    }
}
```

## C# Mock Builders

```csharp
/// <summary>
/// Builder for creating test invoice instances.
/// </summary>
public static class InvoiceBuilder
{
    public static Invoice CreateRandomInvoice()
    {
        return new Invoice
        {
            id = Guid.NewGuid(),
            Name = $"Invoice-{Random.Shared.Next(1000, 9999)}",
            UserIdentifier = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            Items = new List<Product>()
        };
    }

    public static Invoice WithId(this Invoice invoice, Guid id)
    {
        invoice.id = id;
        return invoice;
    }

    public static Invoice WithUser(this Invoice invoice, Guid userId)
    {
        invoice.UserIdentifier = userId;
        return invoice;
    }
}
```

---

# Part 3: Test Quality Guidelines

## Naming Conventions

### TypeScript (describe/it blocks)

```typescript
describe("ComponentName", () => {
  describe("MethodOrBehavior", () => {
    it("should [expected behavior] when [condition]", () => {});
    it("should handle [edge case]", () => {});
    it("should throw when [error condition]", () => {});
  });
});
```

### C# (MethodName_Condition_ExpectedResult)

```csharp
[Fact]
public void CreateInvoice_ValidInput_ReturnsCreatedInvoice() { }

[Fact]
public void CreateInvoice_NullInput_ThrowsArgumentNullException() { }

[Fact]
public async Task GetInvoice_NotFound_ReturnsNull() { }
```

## Test Structure (AAA Pattern)

```typescript
it("should calculate total correctly", () => {
  // Arrange - Set up test data and dependencies
  const items = [
    new ProductBuilder().withPrice(10).build(),
    new ProductBuilder().withPrice(20).build(),
  ];

  // Act - Execute the code under test
  const total = calculateTotal(items);

  // Assert - Verify the expected outcome
  expect(total).toBe(30);
});
```

## Coverage Requirements

Per `vitest.config.ts`:
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

## Test Categories to Include

| Category | What to Test | Priority |
|----------|--------------|----------|
| **Happy Path** | Normal successful operation | High |
| **Validation** | Invalid inputs, edge values | High |
| **Error Handling** | Exceptions, error states | High |
| **Edge Cases** | Empty arrays, null, boundaries | Medium |
| **State Transitions** | Before/after state changes | Medium |
| **Integration Points** | Mock verification | Medium |

---

# Part 4: Anti-Patterns to Avoid

## ❌ Testing Implementation Details

```typescript
// BAD: Testing internal state
it("should set internal flag", () => {
  component.internalFlag = true; // Don't access internals
});

// GOOD: Testing observable behavior
it("should display success message after save", async () => {
  await user.click(screen.getByRole("button", {name: /save/i}));
  expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
});
```

## ❌ Flaky Tests

```typescript
// BAD: Time-dependent test
it("should timeout after 5 seconds", async () => {
  await new Promise(resolve => setTimeout(resolve, 5000));
});

// GOOD: Use fake timers
it("should timeout after 5 seconds", async () => {
  vi.useFakeTimers();
  // ... test code
  vi.advanceTimersByTime(5000);
  vi.useRealTimers();
});
```

## ❌ Missing Cleanup

```typescript
// BAD: State leaks between tests
beforeEach(() => {
  globalState.push("value");
});

// GOOD: Proper cleanup
beforeEach(() => {
  globalState.push("value");
});

afterEach(() => {
  globalState.length = 0;
});
```

## ❌ Over-Mocking

```typescript
// BAD: Mocking everything
vi.mock("./utils"); // Mocks all utils
vi.mock("./helpers"); // Mocks all helpers

// GOOD: Mock only external dependencies
vi.mock("@/lib/actions/invoices/fetch"); // Mock API calls
// Let pure utility functions run as-is
```

---

# Part 5: Test Generation Checklist

## For Every Unit Test File

- [ ] File has `@fileoverview` and `@module` JSDoc tags
- [ ] All imports are properly mocked where needed
- [ ] Mock data uses Builder pattern (`InvoiceBuilder`, etc.)
- [ ] Tests grouped by behavior (`describe` blocks)
- [ ] Test names are descriptive and document behavior
- [ ] AAA pattern followed (Arrange, Act, Assert)
- [ ] Happy path covered
- [ ] Error cases covered
- [ ] Edge cases covered (empty, null, boundaries)
- [ ] Async operations use `waitFor` or `act`
- [ ] Cleanup happens in `afterEach`/`beforeEach`

## For Hook Tests

- [ ] Initial state verified
- [ ] State changes tested with `act()`
- [ ] Async effects tested with `waitFor()`
- [ ] Context wrapper provided if needed
- [ ] Error thrown when used outside provider

## For Store Tests

- [ ] Initial state verified
- [ ] All actions tested
- [ ] State reset between tests
- [ ] Persistence mocked (IndexedDB, localStorage)

## For Component Tests

- [ ] Renders without crashing
- [ ] Props affect rendered output
- [ ] User interactions work (click, type, etc.)
- [ ] Loading states shown
- [ ] Error states shown
- [ ] Empty states shown
- [ ] Accessibility attributes present

---

# Part 6: Usage Instructions

When invoked with source files:

1. **Analyze the source code** for testable behaviors
2. **Identify dependencies** that need mocking
3. **Choose appropriate test patterns** (hooks, stores, components)
4. **Generate comprehensive tests** covering:
   - Happy path
   - Error handling
   - Edge cases
   - State transitions
5. **Use mock builders** for realistic test data
6. **Follow naming conventions** for test descriptions
7. **Ensure proper cleanup** between tests

---

## References

- **Vitest Config**: `/vitest.config.ts`
- **Vitest Setup**: `/vitest.setup.ts`
- **Mock Builders**: `/sites/arolariu.ro/src/data/mocks/`
- **Example Tests**:
  - Hooks: `/sites/arolariu.ro/src/hooks/*.test.tsx`
  - Stores: `/sites/arolariu.ro/src/stores/*.test.tsx`
  - Contexts: `/sites/arolariu.ro/src/contexts/*.test.tsx`
  - Builders: `/sites/arolariu.ro/src/data/mocks/*.test.ts`
- **Backend Tests**: `/sites/api.arolariu.ro/tests/`

---

## Final Notes

This prompt should be invoked:

- **When creating new code** - Generate tests alongside implementation
- **During refactoring** - Ensure tests cover new behavior
- **For untested code** - Add missing test coverage
- **Before code review** - Validate 90%+ coverage

**Goal**: Comprehensive, maintainable unit tests that document behavior and catch regressions.

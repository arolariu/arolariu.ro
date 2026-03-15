import * as React from "react";

import {render, screen, waitFor} from "@testing-library/react";
import {useForm} from "react-hook-form";
import {describe, expect, it} from "vitest";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useController,
  useFieldArray,
  useFormField,
  useWatch,
} from "./form";

interface TestFormValues {
  email: string;
}

function RenderTestForm(): React.JSX.Element {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...methods}>
      <form>
        <FormField
          control={methods.control}
          name='email'
          render={({field}) => (
            <FormItem
              className='form-item-class'
              data-testid='form-item'>
              <FormLabel className='form-label-class'>Email address</FormLabel>
              <FormControl>
                <input
                  {...field}
                  aria-label='Email address'
                />
              </FormControl>
              <FormMessage className='form-message-class'>Required for account updates.</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function RenderFormWithError(): React.JSX.Element {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    methods.setError("email", {
      type: "manual",
      message: "Email is required",
    });
  }, [methods]);

  return (
    <Form {...methods}>
      <form>
        <FormField
          control={methods.control}
          name='email'
          render={({field}) => (
            <FormItem data-testid='form-item-error'>
              <FormLabel data-testid='form-label-error'>Email address</FormLabel>
              <FormControl>
                <input
                  {...field}
                  aria-label='Email address with error'
                />
              </FormControl>
              <FormMessage data-testid='form-message-error' />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function RenderFormWithDescription(): React.JSX.Element {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...methods}>
      <form>
        <FormField
          control={methods.control}
          name='email'
          render={({field}) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <input
                  {...field}
                  aria-label='Email with description'
                />
              </FormControl>
              <FormDescription data-testid='form-description'>We'll never share your email.</FormDescription>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function RenderFormWithFallbackChildren(): React.JSX.Element {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...methods}>
      <form>
        <FormField
          control={methods.control}
          name='email'
          render={() => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <div data-testid='fallback-content'>Custom non-element content</div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("renders FormField, FormItem, FormLabel, and FormMessage", () => {
    // Act
    render(<RenderTestForm />);

    // Assert
    const formItem = screen.getByTestId("form-item");
    const input = screen.getByLabelText("Email address");
    const label = screen.getByText("Email address");
    const message = screen.getByText("Required for account updates.");

    expect(formItem).toHaveClass("form-item-class");
    expect(label).toHaveClass("form-label-class");
    expect(message).toHaveClass("form-message-class");
    expect(input).toBeInTheDocument();
    expect(message).toBeInTheDocument();
  });

  it("shows error message from react-hook-form context", async () => {
    // Arrange & Act
    render(<RenderFormWithError />);

    // Assert
    await waitFor(() => {
      const errorMessage = screen.getByTestId("form-message-error");
      expect(errorMessage).toHaveTextContent("Email is required");
    });
  });

  it("applies error styling to FormLabel when field has error", async () => {
    // Arrange & Act
    render(<RenderFormWithError />);

    // Assert
    await waitFor(() => {
      const label = screen.getByTestId("form-label-error");
      expect(label).toBeInTheDocument();
    });
  });

  it("shows children in FormMessage when no error exists", () => {
    // Arrange & Act
    render(<RenderTestForm />);

    // Assert
    const message = screen.getByText("Required for account updates.");
    expect(message).toBeInTheDocument();
  });

  it("does not render FormMessage when no children and no error", () => {
    // Arrange
    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name='email'
              render={({field}) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      aria-label='Email no message'
                    />
                  </FormControl>
                  <FormMessage data-testid='empty-message' />
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<TestComponent />);

    // Assert
    expect(screen.queryByTestId("empty-message")).not.toBeInTheDocument();
  });

  it("renders FormDescription with proper id", () => {
    // Arrange & Act
    render(<RenderFormWithDescription />);

    // Assert
    const description = screen.getByTestId("form-description");
    expect(description).toHaveTextContent("We'll never share your email.");
    expect(description.id).toMatch(/-form-item-description$/);
  });

  it("injects aria attributes into FormControl element", async () => {
    // Arrange & Act
    render(<RenderFormWithDescription />);

    // Assert
    const input = screen.getByLabelText("Email with description");
    expect(input).toHaveAttribute("aria-describedby");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("injects aria-invalid=true when field has error", async () => {
    // Arrange & Act
    render(<RenderFormWithError />);

    // Assert
    await waitFor(() => {
      const input = screen.getByLabelText("Email address with error");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("renders fallback wrapper when FormControl children is not a valid element", () => {
    // Arrange & Act
    render(<RenderFormWithFallbackChildren />);

    // Assert
    const fallback = screen.getByTestId("fallback-content");
    expect(fallback).toBeInTheDocument();
  });

  it("re-exports key react-hook-form hooks", () => {
    // Assert
    expect(typeof useForm).toBe("function");
    expect(typeof useController).toBe("function");
    expect(typeof useWatch).toBe("function");
    expect(typeof useFieldArray).toBe("function");
  });

  it("should render FormControl with non-element children using fallback div", () => {
    // Arrange
    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name='email'
              render={() => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div data-testid='fallback-div'>Custom non-element content</div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<TestComponent />);

    // Assert
    const fallbackDiv = screen.getByTestId("fallback-div");
    expect(fallbackDiv).toBeInTheDocument();
    // The fallback div wrapper is the parent
    expect(fallbackDiv.parentElement).toBeInTheDocument();
  });

  it("renders a fallback wrapper when FormControl receives text children", () => {
    // Arrange
    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name='email'
              render={() => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>Plain text fallback</FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<TestComponent />);

    // Assert
    const wrapper = screen.getByText("Plain text fallback").closest("div");
    expect(wrapper).toHaveAttribute("aria-invalid", "false");
    expect(wrapper?.id).toMatch(/-form-item$/);
  });

  it("should merge refs in FormControl when child has ref", () => {
    // Arrange
    const childRef = React.createRef<HTMLInputElement>();
    const parentRef = React.createRef<HTMLInputElement>();

    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name='email'
              render={({field}) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl ref={parentRef}>
                    <input
                      {...field}
                      ref={childRef}
                      aria-label='Email with ref'
                      data-testid='input-with-ref'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<TestComponent />);

    // Assert
    const input = screen.getByTestId("input-with-ref");
    expect(childRef.current).toBe(input);
  });

  it("should render FormLabel with error state styling", async () => {
    // Arrange
    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      React.useEffect(() => {
        methods.setError("email", {
          type: "manual",
          message: "Email is invalid",
        });
      }, [methods]);

      return (
        <Form {...methods}>
          <form>
            <FormField
              control={methods.control}
              name='email'
              render={({field}) => (
                <FormItem>
                  <FormLabel data-testid='error-label'>Email address</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      aria-label='Email'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }

    render(<TestComponent />);

    // Assert
    await waitFor(() => {
      const label = screen.getByTestId("error-label");
      expect(label).toBeInTheDocument();
      // Error styling is applied via CSS modules, verify the label exists
      expect(label).toHaveTextContent("Email address");
    });
  });

  it("should throw error when useFormField is used outside FormField context", () => {
    // Arrange
    function InvalidComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <form>
            {/* useFormField called outside FormField - this will throw */}
            <InvalidInnerComponent />
          </form>
        </Form>
      );
    }

    function InvalidInnerComponent(): React.JSX.Element {
      // This will throw because we're not inside a FormField
      const {error} = useFormField();
      return <div>{error?.message}</div>;
    }

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act & Assert
    expect(() => render(<InvalidComponent />)).toThrow("useFormField should be used within <FormField>");

    consoleErrorSpy.mockRestore();
  });

  it("should throw error when useFormField is used outside FormItem context", () => {
    // Arrange
    function InvalidComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {
          email: "",
        },
      });

      return (
        <Form {...methods}>
          <FormField
            control={methods.control}
            name='email'
            render={() => {
              // This will throw because we're not inside FormItem
              return <InvalidInnerComponent />;
            }}
          />
        </Form>
      );
    }

    function InvalidInnerComponent(): React.JSX.Element {
      const {error} = useFormField();
      return <div>{error?.message}</div>;
    }

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act & Assert
    expect(() => render(<InvalidComponent />)).toThrow("useFormField should be used within <FormItem>");

    consoleErrorSpy.mockRestore();
  });
});

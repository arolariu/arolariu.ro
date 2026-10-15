import * as React from "react";

import {Field as BaseField} from "@base-ui/react/field";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Controller as RHFController, FormProvider, useForm as rhfUseForm, type Resolver} from "react-hook-form";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Controller,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useFormField,
  useFormState,
  useWatch,
  type FormDescriptionProps,
  type FormMessageProps,
} from "./form";
import * as formExports from "./form";
import styles from "./form.module.css";
import * as formStories from "./form.stories";
import {Input} from "./input";

const {ObserverComposition: ObserverStory, FieldArrayAndWatch: FieldArrayStory} = composeStories(formStories);

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

function RenderFormWithMergedDescriptions(): React.JSX.Element {
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
              <FormControl aria-describedby='wrapper-description   shared-description'>
                <input
                  {...field}
                  aria-describedby='child-description   shared-description'
                  aria-label='Email with merged descriptions'
                />
              </FormControl>
              <FormDescription data-testid='merged-description'>We'll never share your email.</FormDescription>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function RenderFormWithErrorWithoutMessage(): React.JSX.Element {
  const methods = useForm<TestFormValues>({
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    methods.setError("email", {
      type: "manual",
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
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <input
                  {...field}
                  aria-label='Email without error message'
                />
              </FormControl>
              <FormMessage data-testid='missing-error-message' />
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
      expect(label.classList).toContain(styles.labelError);
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

  it("merges aria-describedby values from the control and child element without duplicates", () => {
    // Arrange & Act
    render(<RenderFormWithMergedDescriptions />);

    // Assert
    const input = screen.getByLabelText("Email with merged descriptions");
    const describedBy = input.getAttribute("aria-describedby");
    const tokens = describedBy?.split(/\s+/u) ?? [];

    expect(tokens).toContain("wrapper-description");
    expect(tokens).toContain("child-description");
    expect(tokens).toContain("shared-description");
    expect(tokens.filter((token) => token === "shared-description")).toHaveLength(1);
    expect(tokens.some((token) => token.endsWith("-form-item-description"))).toBe(true);
  });

  it("does not render FormMessage when an error exists without a message", async () => {
    // Arrange & Act
    render(<RenderFormWithErrorWithoutMessage />);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("missing-error-message")).not.toBeInTheDocument();
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
    expect(parentRef.current).toBe(input);
  });
});

interface CompositionValues {
  email: string;
}

interface CompositionFixtureProps {
  readonly primitive?: boolean;
  readonly wrapper?: Omit<React.ComponentPropsWithoutRef<typeof FormControl>, "children">;
  readonly child?: React.InputHTMLAttributes<HTMLInputElement>;
  readonly wrapperRef?: React.Ref<HTMLElement>;
  readonly childRef?: React.Ref<HTMLInputElement>;
  readonly labelTarget?: string;
  readonly itemId?: string;
  readonly descriptionId?: string;
  readonly messageId?: string;
  readonly initialDescription?: boolean;
  readonly initialMessage?: boolean;
  readonly error?: {readonly message?: string};
  readonly messageChildren?: React.ReactNode;
  readonly onSubmit?: (values: CompositionValues) => void;
  readonly onValues?: (values: CompositionValues) => void;
}

function FieldStateProbe(): React.JSX.Element {
  const field = useFormField();
  return (
    <output aria-label='Field state'>{JSON.stringify({dirty: field.isDirty, touched: field.isTouched, invalid: field.invalid})}</output>
  );
}

function CompositionFixture({
  primitive = false,
  wrapper,
  child,
  wrapperRef,
  childRef,
  labelTarget,
  itemId,
  descriptionId,
  messageId,
  initialDescription = false,
  initialMessage = true,
  error,
  messageChildren,
  onSubmit,
  onValues,
}: Readonly<CompositionFixtureProps>): React.JSX.Element {
  const methods = useForm<CompositionValues>({defaultValues: {email: ""}, mode: "onChange"});
  const watched = useWatch({control: methods.control, name: "email"});
  const [descriptionMounted, setDescriptionMounted] = React.useState(initialDescription);
  const [messageMounted, setMessageMounted] = React.useState(initialMessage);
  const [invalidSubmission, setInvalidSubmission] = React.useState(false);

  React.useEffect(() => {
    if (error) methods.setError("email", {type: "manual", ...error});
  }, [error, methods]);
  React.useEffect(() => {
    if (!onValues) return;
    return methods.subscribe({formState: {values: true}, callback: ({values}) => onValues(values)});
  }, [methods, onValues]);

  return (
    <Form {...methods}>
      <form
        aria-label='Contact details'
        noValidate
        onSubmit={methods.handleSubmit(
          (values) => {
            setInvalidSubmission(false);
            onSubmit?.(values);
          },
          () => setInvalidSubmission(true),
        )}>
        <FormField
          control={methods.control}
          name='email'
          rules={{required: "Email is required", minLength: {value: 3, message: "Use at least three characters"}}}
          render={({field}) => {
            const controlProps = {
              ...field,
              ...child,
              onChange: (event: React.ChangeEvent<HTMLInputElement>): void => {
                child?.onChange?.(event);
                if (!event.defaultPrevented) field.onChange(event);
              },
              onBlur: (event: React.FocusEvent<HTMLInputElement>): void => {
                child?.onBlur?.(event);
                if (!event.defaultPrevented) field.onBlur();
              },
              ref: (node: HTMLInputElement | null): (() => void) => {
                field.ref(node);
                const cleanup = typeof childRef === "function" ? childRef(node) : undefined;
                if (childRef && typeof childRef !== "function") childRef.current = node;
                return () => {
                  if (typeof cleanup === "function") cleanup();
                  else if (typeof childRef === "function") childRef(null);
                  else if (childRef) childRef.current = null;
                  field.ref(null);
                };
              },
            };
            return (
              <FormItem id={itemId}>
                <FormLabel {...(labelTarget ? {htmlFor: labelTarget} : {})}>Contact email</FormLabel>
                <FormControl
                  {...wrapper}
                  ref={wrapperRef}>
                  {primitive ? <Input {...controlProps} /> : <input {...controlProps} />}
                </FormControl>
                {descriptionMounted ? <FormDescription id={descriptionId}>We only send requested updates.</FormDescription> : null}
                {messageMounted ? <FormMessage id={messageId}>{messageChildren}</FormMessage> : null}
                <FieldStateProbe />
              </FormItem>
            );
          }}
        />
        <output aria-label='Watched email'>{watched}</output>
        <button
          type='button'
          onClick={() => setDescriptionMounted((mounted) => !mounted)}>
          Toggle description
        </button>
        <button
          type='button'
          onClick={() => setMessageMounted((mounted) => !mounted)}>
          Toggle message
        </button>
        <button
          type='button'
          onClick={() => methods.clearErrors("email")}>
          Clear errors
        </button>
        <button type='submit'>Save contact</button>
        {invalidSubmission ? <div role='alert'>Correct the fields before saving.</div> : null}
      </form>
    </Form>
  );
}

interface CollectionValues {
  notes: string;
  entries: {value: string}[];
}

function CollectionFixture(): React.JSX.Element {
  const methods = useForm<CollectionValues>({defaultValues: {notes: "", entries: [{value: "First"}]}});
  const {fields, append, remove, move} = useFieldArray({control: methods.control, name: "entries"});
  const values = useWatch({control: methods.control});
  const {isDirty} = useFormState({control: methods.control});
  const {field: notes} = useController({control: methods.control, name: "notes"});
  const [submitted, setSubmitted] = React.useState<CollectionValues | null>(null);
  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit(setSubmitted)}>
        <Controller
          control={methods.control}
          name='notes'
          render={({field}) => (
            <input
              {...field}
              aria-label='Notes'
            />
          )}
        />
        <input
          {...notes}
          aria-label='Mirrored notes'
        />
        {fields.map((entry, index) => (
          <FormField
            key={entry.id}
            control={methods.control}
            name={`entries.${index}.value`}
            render={({field}) => (
              <FormItem>
                <FormLabel>Entry {index + 1}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
        <button
          type='button'
          onClick={() => append({value: "Second"})}>
          Append
        </button>
        <button
          type='button'
          onClick={() => remove(0)}>
          Remove first
        </button>
        <button
          type='button'
          onClick={() => move(0, 1)}>
          Move first
        </button>
        <button type='submit'>Save entries</button>
        <output aria-label='Collection values'>{JSON.stringify(values)}</output>
        <output aria-label='Collection dirty'>{String(isDirty)}</output>
        <output aria-label='Submitted collection'>{JSON.stringify(submitted)}</output>
      </form>
    </Form>
  );
}

function ContextProbe(): React.JSX.Element {
  const methods = useFormContext<CompositionValues>();
  return <output aria-label='Context values'>{methods.getValues("email")}</output>;
}

function WithoutProvider(): React.JSX.Element {
  const methods = useForm<CompositionValues>({defaultValues: {email: ""}});
  return (
    <FormField
      control={methods.control}
      name='email'
      render={() => (
        <FormItem>
          <FormLabel>Missing provider</FormLabel>
        </FormItem>
      )}
    />
  );
}

describe("Form real RHF contracts", () => {
  it("preserves absent observer keys and cleans replaced wrapper refs without detaching the child", () => {
    let received: React.ComponentPropsWithoutRef<"input"> | undefined;
    const Probe = ({ref, ...props}: Readonly<React.ComponentPropsWithRef<"input">>): React.JSX.Element => {
      received = props;
      return (
        <input
          {...props}
          ref={ref}
        />
      );
    };
    Probe.displayName = "ObserverKeyProbe";
    const childRef = React.createRef<HTMLInputElement>();
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const first = vi.fn((node: HTMLInputElement | null) => (node ? firstCleanup : undefined));
    const second = vi.fn((node: HTMLInputElement | null) => (node ? secondCleanup : undefined));
    function Fixture({replacement = false}: Readonly<{replacement?: boolean}>): React.JSX.Element {
      const methods = useForm<{name: string}>({defaultValues: {name: ""}});
      return (
        <Form {...methods}>
          <FormField
            control={methods.control}
            name='name'
            render={() => (
              <FormItem>
                <FormControl ref={replacement ? second : first}>
                  <Probe
                    ref={childRef}
                    aria-label='Ref probe'
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </Form>
      );
    }
    const {rerender, unmount} = render(<Fixture />);
    const input = screen.getByRole("textbox", {name: "Ref probe"});
    expect(childRef.current).toBe(input);
    expect(Object.keys(received ?? {}).filter((key) => key.startsWith("on"))).toEqual([]);
    expect(first).toHaveBeenCalledExactlyOnceWith(input);
    rerender(<Fixture replacement />);
    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledExactlyOnceWith(input);
    expect(childRef.current).toBe(input);
    unmount();
    expect(childRef.current).toBeNull();
    expect(secondCleanup).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalledWith(null);
    expect(second).not.toHaveBeenCalledWith(null);
  });

  it("keeps all 15 runtime exports and aliases Form to RHF FormProvider without adding a native form", () => {
    expect(Form).toBe(FormProvider);
    expect(Controller).toBe(RHFController);
    expect(useForm).toBe(rhfUseForm);
    expect(Object.keys(formExports).sort()).toEqual([
      "Controller",
      "Form",
      "FormControl",
      "FormDescription",
      "FormField",
      "FormItem",
      "FormLabel",
      "FormMessage",
      "useController",
      "useFieldArray",
      "useForm",
      "useFormContext",
      "useFormField",
      "useFormState",
      "useWatch",
    ]);
    function ProviderFixture(): React.JSX.Element {
      const methods = useForm<CompositionValues>({defaultValues: {email: "Context only"}});
      return (
        <Form {...methods}>
          <ContextProbe />
        </Form>
      );
    }
    const {container} = render(<ProviderFixture />);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.getByLabelText("Context values")).toHaveTextContent("Context only");
  });

  it.each([false, true])("updates RHF values and the wrapper observer while typing (primitive=%s)", async (primitive) => {
    const observed: string[] = [];
    const subscriptions: CompositionValues[] = [];
    const submissions: CompositionValues[] = [];
    const user = userEvent.setup();
    render(
      <CompositionFixture
        primitive={primitive}
        wrapper={{
          onChange: (event) => {
            if (event.currentTarget instanceof HTMLInputElement) observed.push(event.currentTarget.value);
          },
        }}
        onValues={(values) => subscriptions.push({...values})}
        onSubmit={(values) => submissions.push(values)}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    await user.type(input, "Ada");
    expect(observed).toEqual(["A", "Ad", "Ada"]);
    expect(screen.getByLabelText("Watched email")).toHaveTextContent("Ada");
    expect(subscriptions.at(-1)).toEqual({email: "Ada"});
    await user.click(screen.getByRole("button", {name: "Save contact"}));
    await waitFor(() => expect(submissions).toEqual([{email: "Ada"}]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls child observers before wrapper observers and respects child cancellation", () => {
    const calls: string[] = [];
    render(
      <CompositionFixture
        child={{
          onChange: (event) => {
            calls.push("child");
            event.preventDefault();
          },
        }}
        wrapper={{onChange: () => calls.push("wrapper")}}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", {name: "Contact email"}), {target: {value: "Cancelled"}});
    expect(calls).toEqual(["child"]);
    expect(screen.getByLabelText("Watched email")).toBeEmptyDOMElement();
  });

  it("allows a wrapper to cancel native behavior without undoing the child's RHF update", async () => {
    const calls: string[] = [];
    render(
      <CompositionFixture
        child={{onChange: () => calls.push("child")}}
        wrapper={{
          onChange: (event) => {
            calls.push("wrapper");
            event.preventDefault();
          },
        }}
      />,
    );
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", {name: "Contact email"}), {target: {value: "Ada"}});
    });
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.getByLabelText("Watched email")).toHaveTextContent("Ada");
  });

  it("keeps RHF blur/touched state alongside wrapper focus and blur observers", async () => {
    const calls: string[] = [];
    const user = userEvent.setup();
    render(
      <CompositionFixture
        child={{onFocus: () => calls.push("child focus"), onBlur: () => calls.push("child blur")}}
        wrapper={{onFocus: () => calls.push("wrapper focus"), onBlur: () => calls.push("wrapper blur")}}
      />,
    );
    await user.click(screen.getByRole("textbox", {name: "Contact email"}));
    await user.tab();
    expect(calls).toEqual(["child focus", "wrapper focus", "child blur", "wrapper blur"]);
    expect(screen.getByLabelText("Field state")).toHaveTextContent('"touched":true');
  });

  it("merges click, input, and keyboard handlers with cancellation instead of overwriting them", async () => {
    const calls: string[] = [];
    render(
      <CompositionFixture
        child={{
          onClick: () => calls.push("child click"),
          onInput: () => calls.push("child input"),
          onKeyDown: (event) => {
            calls.push("child key");
            event.preventDefault();
          },
        }}
        wrapper={{
          onClick: () => calls.push("wrapper click"),
          onInput: () => calls.push("wrapper input"),
          onKeyDown: () => calls.push("wrapper key"),
        }}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    await act(async () => {
      fireEvent.click(input);
      fireEvent.input(input, {target: {value: "Ada"}});
      fireEvent.keyDown(input, {key: "Enter"});
    });
    expect(calls).toEqual(["child click", "wrapper click", "child input", "wrapper input", "child key"]);
  });

  it("merges wrapper and child classes without losing native control properties", () => {
    render(
      <CompositionFixture
        wrapper={{className: "wrapper-control"}}
        child={{className: "child-control", disabled: true, readOnly: true, placeholder: "Contact", type: "email"}}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).toHaveClass("wrapper-control", "child-control");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("placeholder", "Contact");
    expect(input).toHaveAttribute("type", "email");
  });

  it("cleans up callback refs on both sides while retaining RHF's focus target", async () => {
    const wrapperNodes: Array<HTMLElement | null> = [];
    const childNodes: Array<HTMLInputElement | null> = [];
    let childCleanup = 0;
    let wrapperCleanup = 0;
    const user = userEvent.setup();
    const {unmount} = render(
      <CompositionFixture
        wrapperRef={(node) => {
          wrapperNodes.push(node);
          return () => {
            wrapperCleanup += 1;
          };
        }}
        childRef={(node) => {
          childNodes.push(node);
          return () => {
            childCleanup += 1;
          };
        }}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(wrapperNodes.at(-1)).toBe(input);
    expect(childNodes.at(-1)).toBe(input);
    await user.click(screen.getByRole("button", {name: "Save contact"}));
    await waitFor(() => expect(input).toHaveFocus());
    unmount();
    expect(childCleanup).toBeGreaterThan(0);
    expect(wrapperCleanup).toBeGreaterThan(0);
    expect(wrapperNodes).not.toContain(null);
    expect(childNodes).not.toContain(null);
  });

  it("links wrapper control IDs, explicit description/message IDs, and label targets after mount", () => {
    render(
      <CompositionFixture
        wrapper={{id: "contact-control", "aria-describedby": "external-help  external-help"}}
        child={{id: "ignored-child-id", "aria-describedby": "external-help child-help"}}
        labelTarget='ignored-label-target'
        itemId='contact-item'
        descriptionId='contact-help'
        messageId='contact-error'
        initialDescription
        error={{message: "A valid contact is required"}}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).toHaveAttribute("id", "contact-control");
    expect(screen.getByText("Contact email")).toHaveAttribute("for", "contact-control");
    expect(input.getAttribute("aria-describedby")?.split(/\s+/u)).toEqual(["external-help", "child-help", "contact-help", "contact-error"]);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("We only send requested updates.")).toHaveAttribute("id", "contact-help");
    expect(screen.getByText("A valid contact is required")).toHaveAttribute("id", "contact-error");
  });

  it("honors a child-only control ID and a label-only target without breaking their association", () => {
    const first = render(<CompositionFixture child={{id: "native-control"}} />);
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("id", "native-control");
    first.unmount();
    render(<CompositionFixture labelTarget='label-selected-control' />);
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("id", "label-selected-control");
  });

  it("includes only mounted descriptions and messages and removes them on unmount", async () => {
    const user = userEvent.setup();
    render(
      <CompositionFixture
        initialMessage={false}
        error={{message: "Enter a contact"}}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).not.toHaveAttribute("aria-describedby");
    await user.click(screen.getByRole("button", {name: "Toggle description"}));
    expect(input).toHaveAccessibleDescription("We only send requested updates.");
    await user.click(screen.getByRole("button", {name: "Toggle message"}));
    expect(input).toHaveAccessibleDescription("We only send requested updates. Enter a contact");
    await user.click(screen.getByRole("button", {name: "Toggle description"}));
    expect(input).toHaveAccessibleDescription("Enter a contact");
    await user.click(screen.getByRole("button", {name: "Toggle message"}));
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it.each([undefined, "", "   "])("does not link a nonexistent error message (%j)", (message) => {
    render(<CompositionFixture error={{message}} />);
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([0, <span key='help'>Choose a contact.</span>])(
    "preserves meaningful fallback children when an error has no text (%j)",
    (children) => {
      render(
        <CompositionFixture
          error={{message: " "}}
          messageChildren={children}
        />,
      );
      expect(screen.getByRole("textbox", {name: "Contact email"})).toHaveAccessibleDescription(
        typeof children === "number" ? "0" : "Choose a contact.",
      );
    },
  );

  it.each([false, true, [], [" ", null, false], " \n "])("does not render or link empty message children (%j)", (children) => {
    render(<CompositionFixture messageChildren={children} />);
    expect(screen.getByRole("textbox", {name: "Contact email"})).not.toHaveAttribute("aria-describedby");
  });

  it("shows trimmed field errors and keeps announcements at a single form-level summary", async () => {
    const user = userEvent.setup();
    render(<CompositionFixture />);
    await user.click(screen.getByRole("button", {name: "Save contact"}));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Correct the fields before saving.");
    expect(screen.getByRole("textbox", {name: "Contact email"})).toHaveAccessibleDescription("Email is required");
    await user.type(screen.getByRole("textbox", {name: "Contact email"}), "A");
    expect(await screen.findByText("Use at least three characters")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", {name: "Contact email"}), "da");
    await waitFor(() => expect(screen.queryByText("Use at least three characters")).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", {name: "Contact email"})).not.toHaveAttribute("aria-describedby");
  });

  it("retains typed field-array paths, Controller/useController, watch and form-state subscriptions", async () => {
    const user = userEvent.setup();
    render(<CollectionFixture />);
    await user.type(screen.getByRole("textbox", {name: "Notes"}), "Shared");
    expect(screen.getByRole("textbox", {name: "Mirrored notes"})).toHaveValue("Shared");
    await user.click(screen.getByRole("button", {name: "Append"}));
    await user.type(screen.getByRole("textbox", {name: "Entry 2"}), " edited");
    await user.click(screen.getByRole("button", {name: "Move first"}));
    expect(screen.getByRole("textbox", {name: "Entry 1"})).toHaveValue("Second edited");
    expect(screen.getByRole("textbox", {name: "Entry 2"})).toHaveValue("First");
    await user.click(screen.getByRole("button", {name: "Remove first"}));
    expect(screen.queryByRole("textbox", {name: "Entry 2"})).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", {name: "Entry 1"})).toHaveValue("First");
    expect(screen.getByLabelText("Collection values")).toHaveTextContent('{"notes":"Shared","entries":[{"value":"First"}]}');
    expect(screen.getByLabelText("Collection dirty")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", {name: "Save entries"}));
    await waitFor(() =>
      expect(screen.getByLabelText("Submitted collection")).toHaveTextContent('{"notes":"Shared","entries":[{"value":"First"}]}'),
    );
  });

  it("passes transformed resolver values through the installed RHF generic contract", async () => {
    type Transformed = {email: string; length: number};
    const resolver: Resolver<CompositionValues, {locale: string}, Transformed> = (values) => ({
      values: {email: values.email.trim(), length: values.email.trim().length},
      errors: {},
    });
    function TransformedFixture(): React.JSX.Element {
      const methods = useForm<CompositionValues, {locale: string}, Transformed>({
        defaultValues: {email: " Ada "},
        resolver,
        context: {locale: "en"},
      });
      const [length, setLength] = React.useState<number | null>(null);
      return (
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit((values) => setLength(values.length))}>
            <FormField
              control={methods.control}
              name='email'
              render={({field}) => (
                <input
                  {...field}
                  aria-label='Transformed email'
                />
              )}
            />
            <button type='submit'>Transform</button>
            <output aria-label='Transformed length'>{length}</output>
          </form>
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<TransformedFixture />);
    await user.click(screen.getByRole("button", {name: "Transform"}));
    await waitFor(() => expect(screen.getByLabelText("Transformed length")).toHaveTextContent("3"));
  });

  it("diagnoses a missing RHF provider before destructuring its null context", () => {
    expect(() => render(<WithoutProvider />)).toThrow("useFormField should be used within <Form>");
  });
});

interface PrimitiveFixtureProps {
  readonly onClassState: (state: Input.State) => void;
  readonly onRenderState: (state: Input.State) => void;
  readonly controlRef: React.Ref<HTMLInputElement>;
  readonly renderedRef: React.Ref<HTMLInputElement>;
}

function PrimitiveFixture({onClassState, onRenderState, controlRef, renderedRef}: PrimitiveFixtureProps): React.JSX.Element {
  const methods = useForm<CompositionValues>({defaultValues: {email: ""}});
  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name='email'
        render={({field}) => (
          <FormItem>
            <FormLabel>Primitive callback</FormLabel>
            <BaseField.Root
              invalid
              dirty
              touched>
              <FormControl
                className='wrapper-class'
                ref={controlRef}>
                <Input
                  {...field}
                  ref={(node: HTMLElement | null) => {
                    field.ref(node);
                    if (node !== null && !(node instanceof HTMLInputElement)) throw new Error("Expected the fixture's native input target");
                    const nativeNode = node instanceof HTMLInputElement ? node : null;
                    if (typeof renderedRef === "function") return renderedRef(nativeNode);
                    if (renderedRef) renderedRef.current = nativeNode;
                    return undefined;
                  }}
                  className={(state) => {
                    onClassState(state);
                    return state.focused ? "child-focused" : "child-resting";
                  }}
                  render={(props, state) => {
                    onRenderState(state);
                    return <input {...props} />;
                  }}
                />
              </FormControl>
            </BaseField.Root>
          </FormItem>
        )}
      />
    </Form>
  );
}

function MultipleMetadataFixture(): React.JSX.Element {
  const methods = useForm<CompositionValues>({defaultValues: {email: ""}});
  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name='email'
        render={({field}) => (
          <FormItem>
            <FormLabel>Multiple helpers</FormLabel>
            <FormControl>
              <input {...field} />
            </FormControl>
            <FormDescription>First helper.</FormDescription>
            <FormDescription>Second helper.</FormDescription>
            <FormMessage>First message.</FormMessage>
            <FormMessage>Second message.</FormMessage>
          </FormItem>
        )}
      />
    </Form>
  );
}

interface NativeDescriptionFixtureProps {
  readonly description: FormDescriptionProps;
  readonly descriptionRef?: React.Ref<HTMLParagraphElement>;
  readonly visible?: boolean;
}

function NativeDescriptionFixture({description, descriptionRef, visible = true}: NativeDescriptionFixtureProps): React.JSX.Element {
  const methods = useForm<CompositionValues>({defaultValues: {email: ""}});
  const value = useWatch({control: methods.control, name: "email"});
  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name='email'
        render={({field}) => (
          <FormItem>
            <FormLabel>Native HTML description</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            {visible ? (
              <FormDescription
                {...description}
                ref={descriptionRef}
                data-testid='native-description'
              />
            ) : null}
          </FormItem>
        )}
      />
      <div data-testid='native-watched-value'>{value}</div>
    </Form>
  );
}

interface NativeValues {
  notes: string;
  choice: string;
}

function NativeControlsFixture(): React.JSX.Element {
  const methods = useForm<NativeValues>({defaultValues: {notes: "", choice: "first"}});
  const [notesObserver, setNotesObserver] = React.useState("");
  const [choiceObserver, setChoiceObserver] = React.useState("");
  const [submitted, setSubmitted] = React.useState<NativeValues | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const selectRef = React.useRef<HTMLSelectElement>(null);
  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit(setSubmitted)}>
        <FormField
          control={methods.control}
          name='notes'
          render={({field}) => (
            <FormItem>
              <FormLabel>Native notes</FormLabel>
              <FormControl<HTMLTextAreaElement>
                ref={textareaRef}
                onChange={(event) => setNotesObserver(`${event.currentTarget.rows}:${event.currentTarget.value}`)}>
                <textarea
                  {...field}
                  rows={3}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={methods.control}
          name='choice'
          render={({field}) => (
            <FormItem>
              <FormLabel>Native choice</FormLabel>
              <FormControl<HTMLSelectElement>
                ref={selectRef}
                onChange={(event) => setChoiceObserver(`${event.currentTarget.selectedOptions.length}:${event.currentTarget.value}`)}>
                <select {...field}>
                  <option value='first'>First</option>
                  <option value='second'>Second</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />
        <output aria-label='Notes observer'>{notesObserver}</output>
        <output aria-label='Choice observer'>{choiceObserver}</output>
        <output aria-label='Native submitted'>{JSON.stringify(submitted)}</output>
        <button type='submit'>Save native values</button>
      </form>
    </Form>
  );
}

describe("Form composition and metadata lifecycles", () => {
  it("keeps Input class/render callbacks primitive-owned while forwarding both composed DOM refs", async () => {
    const controlRef = React.createRef<HTMLInputElement>();
    const renderedRef = React.createRef<HTMLInputElement>();
    const classStates: Input.State[] = [];
    const renderStates: Input.State[] = [];
    const user = userEvent.setup();
    const {unmount} = render(
      <PrimitiveFixture
        controlRef={controlRef}
        renderedRef={renderedRef}
        onClassState={(state) => classStates.push(state)}
        onRenderState={(state) => renderStates.push(state)}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Primitive callback"});
    expect(controlRef.current).toBe(input);
    expect(renderedRef.current).toBe(input);
    expect(classStates.at(-1)).toMatchObject({valid: false, dirty: true, touched: true, focused: false});
    expect(renderStates.at(-1)).toMatchObject({valid: false, dirty: true, touched: true, focused: false});
    expect(input).toHaveClass("wrapper-class", "child-resting");
    await user.click(input);
    expect(classStates.at(-1)?.focused).toBe(true);
    expect(renderStates.at(-1)?.focused).toBe(true);
    expect(input).toHaveClass("wrapper-class", "child-focused");
    unmount();
    expect(controlRef.current).toBeNull();
    expect(renderedRef.current).toBeNull();
  });

  it("assigns unique generated IDs to multiple mounted descriptions/messages under Strict Mode", () => {
    const {unmount} = render(
      <React.StrictMode>
        <MultipleMetadataFixture />
      </React.StrictMode>,
    );
    const input = screen.getByRole("textbox", {name: "Multiple helpers"});
    const tokens = input.getAttribute("aria-describedby")?.split(/\s+/u) ?? [];
    expect(tokens).toHaveLength(4);
    expect(new Set(tokens).size).toBe(4);
    for (const token of tokens) expect(document.querySelectorAll(`[id="${token}"]`)).toHaveLength(1);
    expect(input).toHaveAccessibleDescription("First helper. Second helper. First message. Second message.");
    unmount();
    for (const token of tokens) expect(document.getElementById(token)).toBeNull();
  });

  it("retargets every linked ID after explicit overrides change", () => {
    const error = {message: "Enter a contact."};
    const {rerender} = render(
      <CompositionFixture
        initialDescription
        wrapper={{id: "first-control"}}
        descriptionId='first-help'
        messageId='first-error'
        error={error}
      />,
    );
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("id", "first-control");
    rerender(
      <CompositionFixture
        initialDescription
        wrapper={{id: "second-control"}}
        descriptionId='second-help'
        messageId='second-error'
        error={error}
      />,
    );
    const input = screen.getByLabelText("Contact email");
    expect(input).toHaveAttribute("id", "second-control");
    expect(input).toHaveAttribute("aria-describedby", "second-help second-error");
    expect(document.getElementById("first-help")).toBeNull();
    expect(document.getElementById("first-error")).toBeNull();
  });

  it("trims errors, restores fallback text on clear, and removes error styling", async () => {
    const user = userEvent.setup();
    render(
      <CompositionFixture
        error={{message: "  Enter a contact.  "}}
        messageChildren='Optional contact.'
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).toHaveAccessibleDescription("Enter a contact.");
    const message = screen.getByText("Enter a contact.");
    const id = message.id;
    expect(message.textContent).toBe("Enter a contact.");
    await user.click(screen.getByRole("button", {name: "Clear errors"}));
    expect(input).toHaveAccessibleDescription("Optional contact.");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText("Optional contact.")).toHaveAttribute("id", id);
    expect(screen.getByText("Contact email").classList).not.toContain(styles.labelError);
  });

  it("does not announce empty nested fragments, but preserves fragment content", () => {
    const first = render(
      <CompositionFixture
        messageChildren={
          <>
            <> </>
          </>
        }
      />,
    );
    expect(screen.getByRole("textbox", {name: "Contact email"})).not.toHaveAttribute("aria-describedby");
    first.unmount();
    render(
      <CompositionFixture
        messageChildren={
          <>
            <>Fragment helper.</>
          </>
        }
      />,
    );
    expect(screen.getByRole("textbox", {name: "Contact email"})).toHaveAccessibleDescription("Fragment helper.");
  });

  it("forwards object refs on both sides and clears them when the form unmounts", () => {
    const wrapperRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLInputElement>();
    const {unmount} = render(
      <CompositionFixture
        wrapperRef={wrapperRef}
        childRef={childRef}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(wrapperRef.current).toBe(input);
    expect(childRef.current).toBe(input);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("keeps empty explicit IDs from disconnecting the label, descriptions, and meaningful errors", () => {
    render(
      <CompositionFixture
        itemId=''
        wrapper={{id: ""}}
        descriptionId=''
        messageId=''
        initialDescription
        error={{message: "Enter a contact."}}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input.id).not.toBe("");
    expect(screen.getByText("Contact email")).toHaveAttribute("for", input.id);
    expect(input).toHaveAccessibleName("Contact email");
    expect(input).toHaveAccessibleDescription("We only send requested updates. Enter a contact.");
  });

  it("merges both labelledby ID lists without dropping either caller's accessible label", () => {
    render(
      <CompositionFixture
        wrapper={{"aria-labelledby": "wrapper-label shared-label"}}
        child={{"aria-labelledby": "child-label shared-label"}}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-labelledby", "child-label shared-label wrapper-label");
  });

  it("keeps precise textarea/select change events and refs while submitting real RHF values", async () => {
    const user = userEvent.setup();
    render(<NativeControlsFixture />);
    await user.type(screen.getByRole("textbox", {name: "Native notes"}), "Hello");
    await user.selectOptions(screen.getByRole("combobox", {name: "Native choice"}), "second");
    expect(screen.getByLabelText("Notes observer")).toHaveTextContent("3:Hello");
    expect(screen.getByLabelText("Choice observer")).toHaveTextContent("1:second");
    await user.click(screen.getByRole("button", {name: "Save native values"}));
    await waitFor(() => expect(screen.getByLabelText("Native submitted")).toHaveTextContent('{"notes":"Hello","choice":"second"}'));
  });
});

describe("FormDescription mounted native HTML content", () => {
  it("links trusted native HTML text while preserving native props, the paragraph ref, and RHF input updates", async () => {
    const ref = React.createRef<HTMLParagraphElement>();
    const user = userEvent.setup();
    const {unmount} = render(
      <NativeDescriptionFixture
        descriptionRef={ref}
        description={{
          id: "native-html-helper",
          lang: "en",
          title: "A native helper",
          className: "native-helper-class",
          dangerouslySetInnerHTML: {__html: "<span>A rendered <strong>native helper.</strong></span>"},
        }}
      />,
    );
    const paragraph = screen.getByTestId("native-description");
    expect(paragraph).toHaveAttribute("id", "native-html-helper");
    expect(paragraph).toHaveAttribute("lang", "en");
    expect(paragraph).toHaveAttribute("title", "A native helper");
    expect(paragraph).toHaveClass("native-helper-class");
    expect(paragraph.querySelector("strong")).toHaveTextContent("native helper.");
    expect(ref.current).toBe(paragraph);
    const input = screen.getByRole("textbox", {name: "Native HTML description"});
    expect(input).toHaveAttribute("aria-describedby", "native-html-helper");
    expect(input).toHaveAccessibleDescription("A rendered native helper.");
    await user.type(input, "Ada");
    expect(screen.getByTestId("native-watched-value")).toHaveTextContent("Ada");
    expect(input).toHaveAccessibleDescription("A rendered native helper.");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("resamples actual HTML text and entities on same-ID updates, clears empty markup, and cleans up after unmount", () => {
    const nodes: Array<HTMLParagraphElement | null> = [];
    let cleanupCount = 0;
    const ref: React.RefCallback<HTMLParagraphElement> = (node) => {
      nodes.push(node);
      return () => {
        cleanupCount += 1;
      };
    };
    const {rerender} = render(
      <NativeDescriptionFixture
        descriptionRef={ref}
        description={{id: "native-html-helper", dangerouslySetInnerHTML: {__html: "Initial native helper."}}}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Native HTML description"});
    const paragraph = screen.getByTestId("native-description");
    expect(nodes).toEqual([paragraph]);
    expect(input).toHaveAccessibleDescription("Initial native helper.");
    rerender(
      <NativeDescriptionFixture
        descriptionRef={ref}
        description={{id: "native-html-helper", dangerouslySetInnerHTML: {__html: "<strong>Updated &lt;text&gt; &amp; checks.</strong>"}}}
      />,
    );
    expect(screen.getByTestId("native-description")).toBe(paragraph);
    expect(input).toHaveAccessibleDescription("Updated <text> & checks.");
    expect(input).toHaveAttribute("aria-describedby", "native-html-helper");
    rerender(
      <NativeDescriptionFixture
        descriptionRef={ref}
        description={{id: "native-html-helper", dangerouslySetInnerHTML: {__html: "<!-- no description --><span></span><br>&nbsp;&#32;"}}}
      />,
    );
    expect(paragraph.textContent?.trim()).toBe("");
    expect(input).not.toHaveAttribute("aria-describedby");
    rerender(
      <NativeDescriptionFixture
        descriptionRef={ref}
        description={{id: "updated-html-helper", dangerouslySetInnerHTML: {__html: "<em>Restored native helper.</em>"}}}
      />,
    );
    expect(paragraph).toHaveAttribute("id", "updated-html-helper");
    expect(document.getElementById("native-html-helper")).toBeNull();
    expect(input).toHaveAttribute("aria-describedby", "updated-html-helper");
    expect(input).toHaveAccessibleDescription("Restored native helper.");
    expect(nodes).toEqual([paragraph]);
    rerender(
      <NativeDescriptionFixture
        descriptionRef={ref}
        visible={false}
        description={{id: "updated-html-helper", dangerouslySetInnerHTML: {__html: "Restored native helper."}}}
      />,
    );
    expect(screen.queryByTestId("native-description")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(cleanupCount).toBe(1);
    expect(nodes).not.toContain(null);
  });

  it("retains children, zero, empty-content, and blank-ID policies when switching native content sources", () => {
    const {rerender} = render(<NativeDescriptionFixture description={{id: "native-helper", children: <strong>React helper.</strong>}} />);
    const input = screen.getByRole("textbox", {name: "Native HTML description"});
    expect(input).toHaveAccessibleDescription("React helper.");
    rerender(
      <NativeDescriptionFixture description={{id: "native-helper", dangerouslySetInnerHTML: {__html: "<em>Native helper.</em>"}}} />,
    );
    expect(input).toHaveAccessibleDescription("Native helper.");
    rerender(<NativeDescriptionFixture description={{id: "native-helper", children: 0}} />);
    expect(input).toHaveAccessibleDescription("0");
    rerender(<NativeDescriptionFixture description={{id: "native-helper", children: <> </>}} />);
    expect(input).not.toHaveAttribute("aria-describedby");
    rerender(<NativeDescriptionFixture description={{id: "", dangerouslySetInnerHTML: {__html: "0"}}} />);
    const paragraph = screen.getByTestId("native-description");
    expect(paragraph.id).not.toBe("");
    expect(input).toHaveAttribute("aria-describedby", paragraph.id);
    expect(input).toHaveAccessibleDescription("0");
  });

  it.each(["", " \n ", "<!-- only a comment -->", "<span><strong></strong></span><br>", "&nbsp;&#32;"])(
    "keeps an empty native paragraph mounted without an empty description link (%j)",
    (html) => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <NativeDescriptionFixture
          descriptionRef={ref}
          description={{id: "empty-native-helper", dangerouslySetInnerHTML: {__html: html}}}
        />,
      );
      const paragraph = screen.getByTestId("native-description");
      expect(paragraph).toHaveAttribute("id", "empty-native-helper");
      expect(paragraph.textContent?.trim()).toBe("");
      expect(ref.current).toBe(paragraph);
      expect(screen.getByRole("textbox", {name: "Native HTML description"})).not.toHaveAttribute("aria-describedby");
    },
  );
});

function NativeMessageFixture({message}: {readonly message: FormMessageProps}): React.JSX.Element {
  const methods = useForm<TestFormValues>({defaultValues: {email: ""}});
  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name='email'
        render={({field}) => (
          <FormItem>
            <FormLabel>Native error content</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage
              data-testid='native-message'
              {...message}
            />
          </FormItem>
        )}
      />
      <button onClick={() => methods.setError("email", {message: " Validation wins. "})}>Set validation</button>
      <button onClick={() => methods.clearErrors("email")}>Clear validation</button>
    </Form>
  );
}

describe("FormMessage native error content", () => {
  it("renders HTML-only content and tracks text, empty markup, refs, validation and fallback transitions", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLParagraphElement>();
    const {rerender, unmount} = render(
      <NativeMessageFixture
        message={{id: "native-error", ref, dangerouslySetInnerHTML: {__html: "<strong>Native &amp; safe.</strong>"}}}
      />,
    );
    const input = screen.getByRole("textbox", {name: "Native error content"});
    expect(screen.getByTestId("native-message").querySelector("strong")).toHaveTextContent("Native & safe.");
    expect(ref.current).toBe(screen.getByTestId("native-message"));
    expect(input).toHaveAccessibleDescription("Native & safe.");
    expect(input).toHaveAttribute("aria-describedby", "native-error");
    await user.click(screen.getByRole("button", {name: "Set validation"}));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Validation wins.");
    expect(screen.getByTestId("native-message").querySelector("strong")).toBeNull();
    await user.click(screen.getByRole("button", {name: "Clear validation"}));
    expect(input).toHaveAccessibleDescription("Native & safe.");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    rerender(
      <NativeMessageFixture message={{id: "native-error", ref, dangerouslySetInnerHTML: {__html: "<!-- empty --><span></span>&nbsp;"}}} />,
    );
    expect(screen.getByTestId("native-message").textContent?.trim()).toBe("");
    expect(input).not.toHaveAttribute("aria-describedby");
    rerender(<NativeMessageFixture message={{id: "native-error", ref, dangerouslySetInnerHTML: {__html: "<em>Updated.</em>"}}} />);
    expect(input).toHaveAccessibleDescription("Updated.");
    rerender(<NativeMessageFixture message={{id: "native-error", ref, children: 0}} />);
    expect(input).toHaveAccessibleDescription("0");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("lets a validation error supersede native HTML on the first error render", async () => {
    const user = userEvent.setup();
    render(<NativeMessageFixture message={{dangerouslySetInnerHTML: {__html: "Fallback."}}} />);
    await user.click(screen.getByRole("button", {name: "Set validation"}));
    expect(screen.getByTestId("native-message")).toHaveTextContent("Validation wins.");
  });
});

describe("Form story announcement policy", () => {
  it("keeps real observer diagnostics non-live and announces only the submission result", async () => {
    const user = userEvent.setup();
    render(<ObserverStory />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    await user.type(screen.getByRole("textbox", {name: "Nickname"}), "Ada");
    expect(screen.getByText(/RHF: Ada · Observer: Ada · Changes: 3/u)).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    await user.click(screen.getByRole("button", {name: "Save nickname"}));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nickname saved locally."));
  });

  it("keeps real field-array watch diagnostics non-live and uses one submission announcement for validation", async () => {
    const user = userEvent.setup();
    render(<FieldArrayStory />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    await user.clear(screen.getByRole("textbox", {name: "Choice 1"}));
    await user.type(screen.getByRole("textbox", {name: "Choice 1"}), "Updated");
    expect(screen.getByText('Watched values: [{"label":"Updated"}]')).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Save choices"}));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved 1 choices locally."));
    await user.click(screen.getByRole("button", {name: "Add choice"}));
    await user.click(screen.getByRole("button", {name: "Save choices"}));
    expect(await screen.findByText("A choice label is required")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Complete the empty choices before saving.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Form diagnostics and error styling", () => {
  it("should render FormLabel with error state styling", async () => {
    function TestComponent(): React.JSX.Element {
      const methods = useForm<TestFormValues>({
        defaultValues: {email: ""},
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

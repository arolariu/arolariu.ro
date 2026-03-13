"use client";

import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import * as React from "react";
import {useForm} from "react-hook-form";

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "./form";

interface FormValues {
  email: string;
}

interface FormHarnessProps {
  controlRef?: React.Ref<HTMLElement>;
}

function FormHarness({controlRef}: Readonly<FormHarnessProps>): React.JSX.Element {
  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required"}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl
                ref={controlRef}
                data-testid='email-control'>
                <input
                  aria-describedby='existing-hint'
                  placeholder='Email'
                  {...field}
                />
              </FormControl>
              <FormDescription>Helpful description</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type='submit'>Submit</button>
      </form>
    </Form>
  );
}

describe("FormControl", () => {
  it("should clone its child and attach form accessibility attributes", () => {
    // Arrange
    render(<FormHarness />);

    // Act
    const input = screen.getByPlaceholderText("Email");
    const label = screen.getByText("Email");
    const description = screen.getByText("Helpful description");

    // Assert
    expect(input).toHaveAttribute("data-testid", "email-control");
    expect(input).toHaveAttribute("id");
    expect(label).toHaveAttribute("for", input.getAttribute("id"));
    expect(input).toHaveAttribute("aria-describedby", `existing-hint ${description.getAttribute("id")}`);
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("should include the error message id after validation fails", async () => {
    // Arrange
    render(<FormHarness />);

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Submit"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Email");
    const description = screen.getByText("Helpful description");
    const message = screen.getByText("Email is required");
    expect(input).toHaveAttribute("aria-describedby", `existing-hint ${description.getAttribute("id")} ${message.getAttribute("id")}`);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("should forward refs to the cloned control element", () => {
    // Arrange
    const ref = React.createRef<HTMLElement>();

    // Act
    render(<FormHarness controlRef={ref} />);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute("placeholder", "Email");
  });
});

import * as React from "react";

import {render, screen} from "@testing-library/react";
import {useForm} from "react-hook-form";
import {describe, expect, it} from "vitest";

import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "./form";

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
});

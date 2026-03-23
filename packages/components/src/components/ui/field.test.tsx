import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";

describe("Field", () => {
  it("renders FieldSet with custom className", () => {
    // Arrange & Act
    render(
      <FieldSet
        className='custom-fieldset'
        data-testid='fieldset'>
        <FieldLegend>Account Settings</FieldLegend>
      </FieldSet>,
    );

    // Assert
    const fieldset = screen.getByTestId("fieldset");
    expect(fieldset).toBeInTheDocument();
    expect(fieldset.tagName).toBe("FIELDSET");
    expect(fieldset).toHaveClass("custom-fieldset");
  });

  it("renders FieldLegend with default variant", () => {
    // Arrange & Act
    render(
      <FieldSet>
        <FieldLegend data-testid='legend'>Billing Address</FieldLegend>
      </FieldSet>,
    );

    // Assert
    const legend = screen.getByTestId("legend");
    expect(legend).toBeInTheDocument();
    expect(legend.tagName).toBe("LEGEND");
    expect(legend).toHaveTextContent("Billing Address");
    expect(legend).toHaveAttribute("data-variant", "legend");
  });

  it("renders FieldLegend with label variant", () => {
    // Arrange & Act
    render(
      <FieldSet>
        <FieldLegend
          variant='label'
          data-testid='legend-label'>
          Preferences
        </FieldLegend>
      </FieldSet>,
    );

    // Assert
    const legend = screen.getByTestId("legend-label");
    expect(legend).toHaveAttribute("data-variant", "label");
  });

  it("renders FieldGroup with children", () => {
    // Arrange & Act
    render(
      <FieldGroup data-testid='field-group'>
        <Field>
          <FieldLabel>Name</FieldLabel>
        </Field>
      </FieldGroup>,
    );

    // Assert
    const group = screen.getByTestId("field-group");
    expect(group).toBeInTheDocument();
    expect(group.tagName).toBe("DIV");
  });

  it("renders Field with vertical orientation by default", () => {
    // Arrange & Act
    render(
      <Field data-testid='field'>
        <FieldLabel>Email</FieldLabel>
      </Field>,
    );

    // Assert
    const field = screen.getByTestId("field");
    expect(field).toHaveAttribute("data-orientation", "vertical");
    expect(field).toHaveAttribute("role", "group");
  });

  it("renders Field with horizontal orientation", () => {
    // Arrange & Act
    render(
      <Field
        orientation='horizontal'
        data-testid='field-horizontal'>
        <FieldLabel>Email</FieldLabel>
      </Field>,
    );

    // Assert
    const field = screen.getByTestId("field-horizontal");
    expect(field).toHaveAttribute("data-orientation", "horizontal");
  });

  it("renders Field with responsive orientation", () => {
    // Arrange & Act
    render(
      <Field
        orientation='responsive'
        data-testid='field-responsive'>
        <FieldLabel>Email</FieldLabel>
      </Field>,
    );

    // Assert
    const field = screen.getByTestId("field-responsive");
    expect(field).toHaveAttribute("data-orientation", "responsive");
  });

  it("renders FieldContent with children", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldContent data-testid='field-content'>
          <input type='text' />
        </FieldContent>
      </Field>,
    );

    // Assert
    const content = screen.getByTestId("field-content");
    expect(content).toBeInTheDocument();
    expect(content.tagName).toBe("DIV");
    expect(content).toHaveAttribute("data-slot", "field-content");
  });

  it("renders FieldLabel with custom className", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldLabel
          className='custom-label'
          htmlFor='email'
          data-testid='field-label'>
          Email Address
        </FieldLabel>
      </Field>,
    );

    // Assert
    const label = screen.getByTestId("field-label");
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("custom-label");
    expect(label).toHaveAttribute("for", "email");
    expect(label).toHaveAttribute("data-slot", "field-label");
  });

  it("renders FieldTitle with content", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldTitle data-testid='field-title'>Account Information</FieldTitle>
      </Field>,
    );

    // Assert
    const title = screen.getByTestId("field-title");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("DIV");
    expect(title).toHaveTextContent("Account Information");
    expect(title).toHaveAttribute("data-slot", "field-label");
  });

  it("renders FieldDescription with text", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldDescription data-testid='field-description'>This field is required for account recovery.</FieldDescription>
      </Field>,
    );

    // Assert
    const description = screen.getByTestId("field-description");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("P");
    expect(description).toHaveTextContent("This field is required for account recovery.");
    expect(description).toHaveAttribute("data-slot", "field-description");
  });

  it("renders FieldSeparator without content", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldSeparator data-testid='field-separator' />
      </Field>,
    );

    // Assert
    const separator = screen.getByTestId("field-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("data-slot", "field-separator");
    expect(separator).not.toHaveAttribute("data-content");
  });

  it("renders FieldSeparator with inline content", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldSeparator data-testid='field-separator-content'>or</FieldSeparator>
      </Field>,
    );

    // Assert
    const separator = screen.getByTestId("field-separator-content");
    expect(separator).toHaveAttribute("data-content", "true");
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("renders FieldError with single error message from errors array", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError
          errors={[{message: "Email is required"}]}
          data-testid='field-error'
        />
      </Field>,
    );

    // Assert
    const error = screen.getByTestId("field-error");
    expect(error).toBeInTheDocument();
    expect(error).toHaveAttribute("role", "alert");
    expect(error).toHaveAttribute("data-slot", "field-error");
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("renders FieldError with multiple error messages as list", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError
          errors={[{message: "Email is required"}, {message: "Email must be valid"}]}
          data-testid='field-error-list'
        />
      </Field>,
    );

    // Assert
    const error = screen.getByTestId("field-error-list");
    expect(error).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Email must be valid")).toBeInTheDocument();
    const list = error.querySelector("ul");
    expect(list).toBeInTheDocument();
  });

  it("renders FieldError with children instead of errors prop", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError data-testid='field-error-children'>Custom error message</FieldError>
      </Field>,
    );

    // Assert
    const error = screen.getByTestId("field-error-children");
    expect(error).toBeInTheDocument();
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("does not render FieldError when no errors or children provided", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError data-testid='field-error-empty' />
      </Field>,
    );

    // Assert
    expect(screen.queryByTestId("field-error-empty")).not.toBeInTheDocument();
  });

  it("does not render FieldError when errors array is empty", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError
          errors={[]}
          data-testid='field-error-empty-array'
        />
      </Field>,
    );

    // Assert - An empty errors array still renders the container, but no content
    const error = screen.queryByTestId("field-error-empty-array");
    expect(error).toBeInTheDocument();
    // Check that there's no visible content
    expect(error?.textContent).toBe("");
  });

  it("filters out undefined errors in FieldError list", () => {
    // Arrange & Act
    render(
      <Field>
        <FieldError
          errors={[{message: "Valid error"}, undefined, {message: "Another valid error"}]}
          data-testid='field-error-filtered'
        />
      </Field>,
    );

    // Assert
    const error = screen.getByTestId("field-error-filtered");
    expect(error).toBeInTheDocument();
    expect(screen.getByText("Valid error")).toBeInTheDocument();
    expect(screen.getByText("Another valid error")).toBeInTheDocument();
  });

  it("merges custom className on all Field components", () => {
    // Arrange & Act
    render(
      <FieldSet className='custom-set'>
        <FieldLegend className='custom-legend'>Legend</FieldLegend>
        <FieldGroup className='custom-group'>
          <Field
            className='custom-field'
            data-testid='custom-field'>
            <FieldLabel className='custom-label'>Label</FieldLabel>
            <FieldContent
              className='custom-content'
              data-testid='custom-content'>
              <input />
              <FieldDescription className='custom-description'>Description</FieldDescription>
            </FieldContent>
            <FieldSeparator className='custom-separator' />
            <FieldError
              className='custom-error'
              data-testid='custom-error'
              errors={[{message: "Error"}]}
            />
          </Field>
        </FieldGroup>
      </FieldSet>,
    );

    // Assert
    expect(screen.getByText("Legend").closest("fieldset")).toHaveClass("custom-set");
    expect(screen.getByText("Legend")).toHaveClass("custom-legend");
    expect(screen.getByText("Label").closest('[data-slot="field-group"]')).toHaveClass("custom-group");
    expect(screen.getByTestId("custom-field")).toHaveClass("custom-field");
    expect(screen.getByText("Label")).toHaveClass("custom-label");
    expect(screen.getByTestId("custom-content")).toHaveClass("custom-content");
    expect(screen.getByText("Description")).toHaveClass("custom-description");
    expect(screen.getByTestId("custom-error")).toHaveClass("custom-error");
  });

  it("renders Field compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const fieldSetRef = {current: null as HTMLFieldSetElement | null};
    const fieldRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <FieldSet
        ref={fieldSetRef}
        className='fieldset-class'
        data-testid='field-set'>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field
            ref={fieldRef}
            className='field-class'
            data-testid='field'
            orientation='horizontal'>
            <FieldLabel htmlFor='field-input'>Name</FieldLabel>
            <FieldContent>
              <input
                id='field-input'
                aria-label='Name'
              />
              <FieldDescription>Used on invoices and documents.</FieldDescription>
            </FieldContent>
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <FieldError errors={[{message: "Name is required"}]} />
        </FieldGroup>
      </FieldSet>,
    );

    // Assert
    const fieldSet = screen.getByTestId("field-set");
    const field = screen.getByTestId("field");

    expect(fieldSet).toHaveClass("fieldset-class");
    expect(field).toHaveClass("field-class");
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Used on invoices and documents.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    expect(fieldSetRef.current).toBe(fieldSet);
    expect(fieldRef.current).toBe(field);
  });
});

import {render, screen} from "@testing-library/react";
import {createRef} from "react";
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
  it("renders HTML-only errors and preserves children/error precedence across native content transitions", () => {
    const ref = createRef<HTMLDivElement>();
    const html = {__html: "<strong>Native &amp; safe.</strong>"};
    const {rerender, unmount} = render(
      <FieldError
        ref={ref}
        dangerouslySetInnerHTML={html}
      />,
    );
    expect(screen.getByRole("alert").querySelector("strong")).toHaveTextContent("Native & safe.");
    expect(ref.current).toBe(screen.getByRole("alert"));
    rerender(
      <FieldError
        ref={ref}
        errors={[{message: " Required "}, {message: "Required"}]}
        dangerouslySetInnerHTML={html}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByRole("alert").querySelector("strong")).toBeNull();
    rerender(
      <FieldError
        ref={ref}
        errors={[{message: "Ignored"}]}
        dangerouslySetInnerHTML={html}>
        Explicit children
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Explicit children");
    rerender(
      <FieldError
        ref={ref}
        dangerouslySetInnerHTML={html}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Native & safe.");
    rerender(
      <FieldError
        ref={ref}
        dangerouslySetInnerHTML={{__html: "<!-- empty --><span></span>&nbsp;"}}
      />,
    );
    expect(screen.getByRole("alert").textContent?.trim()).toBe("");
    rerender(<FieldError ref={ref}>{0}</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("0");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("renders validation-only error content without combining children and native HTML", () => {
    render(
      <FieldError
        errors={[{message: "Required"}, {message: "Invalid"}]}
        dangerouslySetInnerHTML={{__html: "Fallback"}}
      />,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Required", "Invalid"]);
  });

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

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls through transparent empty Fragments to normalized errors and preserves numeric zero", () => {
    const {rerender} = render(
      <FieldError>
        <>
          {null}
          {false} <></>
        </>
      </FieldError>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(
      <FieldError errors={[{message: " Required "}, {message: "Required"}]}>
        <>
          <>{false}</>
        </>
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getAllByText("Required")).toHaveLength(1);
    rerender(
      <FieldError errors={[{message: "Ignored"}]}>
        <>{0}</>
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("0");
    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
  });

  it("suppresses empty field errors and deduplicates messages", () => {
    const {rerender} = render(<FieldError errors={[]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<FieldError errors={[{message: "Required"}, {message: "Required"}]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getAllByText("Required")).toHaveLength(1);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders repeated meaningful errors only once", () => {
    render(<FieldError errors={[{message: "Required"}, {message: "Required"}]} />);
    expect(screen.getAllByText("Required")).toHaveLength(1);
  });

  it("normalizes meaningful messages before choosing a single message or ordered list", () => {
    const {rerender} = render(<FieldError errors={[undefined, {}, {message: ""}, {message: " \n "}]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<FieldError errors={[undefined, {message: " Required "}, {message: "Required"}, {message: ""}]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    rerender(<FieldError errors={[{message: " Required "}, {message: "Invalid"}, {message: "Required"}]} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Required", "Invalid"]);
  });

  it("prioritizes explicit children including zero and supports error ref lifecycle", () => {
    const ref = createRef<HTMLDivElement>();
    const {rerender} = render(
      <FieldError
        ref={ref}
        errors={[{message: "Ignored"}]}>
        {0}
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("0");
    expect(ref.current).toBe(screen.getByRole("alert"));
    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
    rerender(
      <FieldError
        ref={ref}
        errors={[]}
      />,
    );
    expect(ref.current).toBeNull();
    rerender(<FieldError errors={[{message: "Fallback"}]}>{false}</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Fallback");
  });

  it("does not announce empty React children arrays or whitespace", () => {
    const {rerender} = render(<FieldError>{[null, false, "", "  "]}</FieldError>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<FieldError errors={[{message: "Fallback"}]}>{[null, false, " "]}</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Fallback");
    rerender(
      <FieldError errors={[{message: "Ignored"}]}>
        <strong>Custom error</strong>
      </FieldError>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Custom error");
    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
  });

  it("preserves numeric separator content", () => {
    render(<FieldSeparator data-testid='numeric-separator'>{0}</FieldSeparator>);
    expect(screen.getByTestId("numeric-separator")).toHaveTextContent("0");
    expect(screen.getByTestId("numeric-separator")).toHaveAttribute("data-content", "true");
  });

  it("keeps caller-owned labels, descriptions and disabled fieldset semantics", () => {
    render(
      <FieldSet disabled>
        <FieldLegend>Contact</FieldLegend>
        <FieldGroup>
          <Field
            data-disabled='true'
            data-invalid='true'
            aria-labelledby='contact-label'
            orientation='responsive'>
            <FieldLabel
              id='contact-label'
              htmlFor='contact-input'>
              Contact email
            </FieldLabel>
            <FieldContent>
              <input
                id='contact-input'
                aria-describedby='contact-hint contact-error'
                aria-invalid='true'
              />
              <FieldDescription id='contact-hint'>Use a reachable address.</FieldDescription>
              <FieldError
                id='contact-error'
                errors={[{message: "Required"}]}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>,
    );
    const input = screen.getByRole("textbox", {name: "Contact email"});
    expect(input).toBeDisabled();
    expect(input).toHaveAccessibleDescription("Use a reachable address. Required");
    expect(screen.getByRole("group", {name: "Contact"}).tagName).toBe("FIELDSET");
    expect(screen.getByRole("group", {name: "Contact email"})).toHaveAttribute("data-invalid", "true");
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

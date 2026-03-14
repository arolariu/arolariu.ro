import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "./card";

describe("Card", () => {
  it("renders without crashing", () => {
    render(<Card>Content</Card>);

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref}>Content</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Card className='custom-card'>Content</Card>);

    const card = screen.getByText("Content");

    expect(card).toHaveClass("custom-card");
    expect(card.className).not.toBe("custom-card");
  });

  it("renders composed card children", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Account summary</CardTitle>
          <CardDescription>Latest workspace activity</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Account summary")).toBeInTheDocument();
    expect(screen.getByText("Latest workspace activity")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText("Footer actions")).toBeInTheDocument();
  });

  it("forwards accessibility attributes to the root element", () => {
    render(
      <Card
        role='region'
        aria-label='Billing summary'>
        Content
      </Card>,
    );

    expect(screen.getByRole("region", {name: "Billing summary"})).toBeInTheDocument();
  });

  it("renders CardAction component", () => {
    // Arrange
    render(
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Account details</p>
        </CardContent>
        <CardAction data-testid='card-action'>
          <button type='button'>Manage</button>
        </CardAction>
      </Card>,
    );

    // Assert
    expect(screen.getByTestId("card-action")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Manage"})).toBeInTheDocument();
  });

  it("forwards ref to CardAction", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardAction ref={ref}>Action content</CardAction>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className to CardAction", () => {
    // Arrange
    render(
      <Card>
        <CardAction
          className='custom-action'
          data-testid='card-action-custom'>
          Action content
        </CardAction>
      </Card>,
    );

    // Assert
    expect(screen.getByTestId("card-action-custom")).toHaveClass("custom-action");
  });
});

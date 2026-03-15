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

  it("renders CardHeader component", () => {
    // Arrange
    render(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>,
    );

    // Assert
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("CardHeader forwards ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardHeader ref={ref}>Header</CardHeader>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("CardHeader applies custom className alongside default styles", () => {
    // Arrange
    render(
      <Card>
        <CardHeader
          className='custom'
          data-testid='header'>
          Header
        </CardHeader>
      </Card>,
    );

    // Assert
    const header = screen.getByTestId("header");
    expect(header).toHaveClass("custom");
    expect(header.className).not.toBe("custom");
  });

  it("renders CardTitle component as a div", () => {
    // Arrange
    render(
      <Card>
        <CardTitle>Title</CardTitle>
      </Card>,
    );

    // Assert
    const title = screen.getByText("Title");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("DIV");
  });

  it("CardTitle forwards ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardTitle ref={ref}>Title</CardTitle>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("CardTitle applies custom className alongside default styles", () => {
    // Arrange
    render(
      <Card>
        <CardTitle
          className='custom-title'
          data-testid='title'>
          Title
        </CardTitle>
      </Card>,
    );

    // Assert
    const title = screen.getByTestId("title");
    expect(title).toHaveClass("custom-title");
    expect(title.className).not.toBe("custom-title");
  });

  it("renders CardDescription component as a div", () => {
    // Arrange
    render(
      <Card>
        <CardDescription>Description</CardDescription>
      </Card>,
    );

    // Assert
    const description = screen.getByText("Description");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("DIV");
  });

  it("CardDescription forwards ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardDescription ref={ref}>Description</CardDescription>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("CardDescription applies custom className alongside default styles", () => {
    // Arrange
    render(
      <Card>
        <CardDescription
          className='custom-description'
          data-testid='description'>
          Description
        </CardDescription>
      </Card>,
    );

    // Assert
    const description = screen.getByTestId("description");
    expect(description).toHaveClass("custom-description");
    expect(description.className).not.toBe("custom-description");
  });

  it("renders CardContent component", () => {
    // Arrange
    render(
      <Card>
        <CardContent>Body content</CardContent>
      </Card>,
    );

    // Assert
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("CardContent forwards ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardContent ref={ref}>Body content</CardContent>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("CardContent applies custom className alongside default styles", () => {
    // Arrange
    render(
      <Card>
        <CardContent
          className='custom-content'
          data-testid='content'>
          Body content
        </CardContent>
      </Card>,
    );

    // Assert
    const content = screen.getByTestId("content");
    expect(content).toHaveClass("custom-content");
    expect(content.className).not.toBe("custom-content");
  });

  it("renders CardFooter component", () => {
    // Arrange
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    );

    // Assert
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("CardFooter forwards ref", () => {
    // Arrange
    const ref = createRef<HTMLDivElement>();

    render(
      <Card>
        <CardFooter ref={ref}>Footer content</CardFooter>
      </Card>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("CardFooter applies custom className alongside default styles", () => {
    // Arrange
    render(
      <Card>
        <CardFooter
          className='custom-footer'
          data-testid='footer'>
          Footer content
        </CardFooter>
      </Card>,
    );

    // Assert
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveClass("custom-footer");
    expect(footer.className).not.toBe("custom-footer");
  });
});

import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS} from "./input-otp";

describe("InputOTP", () => {
  it("renders without crashing", () => {
    // Arrange
    render(<InputOTP maxLength={2} />);

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("accepts typed values", () => {
    // Arrange
    render(<InputOTP maxLength={2} />);

    // Act
    fireEvent.input(screen.getByRole("textbox"), {target: {value: "12"}});

    // Assert
    expect(screen.getByRole("textbox")).toHaveValue("12");
  });

  it("merges the input and container classNames", () => {
    // Arrange
    const {container} = render(
      <InputOTP
        maxLength={2}
        className='custom-input'
        containerClassName='custom-container'
      />,
    );

    // Assert
    expect(screen.getByRole("textbox")).toHaveClass("custom-input");
    expect(container.querySelector(".custom-container")).toBeInTheDocument();
  });

  it("renders group children", () => {
    // Arrange
    render(
      <InputOTPGroup>
        <span>OTP group child</span>
      </InputOTPGroup>,
    );

    // Assert
    expect(screen.getByText("OTP group child")).toBeInTheDocument();
  });

  it("re-exports the digits-only validation pattern", () => {
    // Assert
    expect(REGEXP_ONLY_DIGITS).toBe("^\\d+$");
  });

  it("renders placeholder characters for inactive empty slots", () => {
    // Arrange
    render(
      <InputOTP maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );

    // Assert
    expect(screen.getAllByText("·").length).toBeGreaterThan(0);
  });

  it("renders the library placeholder character when provided", () => {
    // Arrange
    render(
      <InputOTP
        maxLength={2}
        placeholder='AB'>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );

    // Assert
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

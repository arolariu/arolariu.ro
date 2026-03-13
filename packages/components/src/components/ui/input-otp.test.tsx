import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {InputOTP, InputOTPGroup} from "./input-otp";

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
});

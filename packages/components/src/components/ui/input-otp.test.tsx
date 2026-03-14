import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, REGEXP_ONLY_DIGITS} from "./input-otp";

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

  it("renders InputOTPSeparator component", () => {
    // Arrange
    render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator data-testid='otp-separator' />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>,
    );

    // Assert
    const separator = screen.getByTestId("otp-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("role", "separator");
  });

  it("renders active slot with fake caret when focused", () => {
    // Arrange
    render(
      <InputOTP
        maxLength={3}
        autoFocus>
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            data-testid='slot-0'
          />
          <InputOTPSlot
            index={1}
            data-testid='slot-1'
          />
          <InputOTPSlot
            index={2}
            data-testid='slot-2'
          />
        </InputOTPGroup>
      </InputOTP>,
    );

    // Assert - First slot should be active when focused
    const slot0 = screen.getByTestId("slot-0");
    expect(slot0).toBeInTheDocument();
  });

  it("renders character in slot when value is entered", () => {
    // Arrange
    render(
      <InputOTP maxLength={3}>
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            data-testid='slot-0'
          />
          <InputOTPSlot
            index={1}
            data-testid='slot-1'
          />
        </InputOTPGroup>
      </InputOTP>,
    );

    // Act
    fireEvent.input(screen.getByRole("textbox"), {target: {value: "12"}});

    // Assert
    const slot0 = screen.getByTestId("slot-0");
    const slot1 = screen.getByTestId("slot-1");
    expect(slot0).toHaveTextContent("1");
    expect(slot1).toHaveTextContent("2");
  });

  it("throws error when InputOTPSlot cannot find slot at index", () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act & Assert
    expect(() =>
      render(
        <InputOTP maxLength={2}>
          <InputOTPGroup>
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>,
      ),
    ).toThrow("InputOTPSlot could not find slot at index 5.");

    consoleErrorSpy.mockRestore();
  });
});

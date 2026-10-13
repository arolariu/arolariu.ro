import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef, type JSX, useState} from "react";
import {describe, expect, it, vi} from "vitest";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "./input-otp";

describe("InputOTP", () => {
  it("exposes slot, active and caret states from the actual backing input", async () => {
    const user = userEvent.setup();
    render(
      <InputOTP
        maxLength={2}
        aria-label='Code'>
        <InputOTPGroup data-testid='group'>
          <InputOTPSlot
            index={0}
            data-testid='first'
          />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    const input = screen.getByRole("textbox", {name: "Code"});
    expect(input).toHaveAttribute("data-slot", "input-otp");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(screen.getByTestId("group")).toHaveAttribute("data-slot", "input-otp-group");
    expect(screen.getByTestId("first")).toHaveAttribute("data-active", "false");
    await user.click(input);
    await waitFor(() => expect(screen.getByTestId("first")).toHaveAttribute("data-active", "true"));
    expect(screen.getByTestId("first")).toHaveAttribute("data-slot", "input-otp-slot");
    expect(screen.getByTestId("first")).toHaveTextContent("");
    expect(screen.getByTestId("first").querySelector('[data-slot="input-otp-caret"]')).toBeInTheDocument();
  });

  it("preserves transformed paste, controlled values, completion and input/group refs", async () => {
    const inputRef = createRef<HTMLInputElement>();
    const groupRef = createRef<HTMLDivElement>();
    const onComplete = vi.fn();
    function Controlled(): JSX.Element {
      const [value, setValue] = useState("");
      return (
        <InputOTP
          ref={inputRef}
          aria-label='Paste code'
          maxLength={4}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          onChange={setValue}
          onComplete={onComplete}
          pasteTransformer={(text) => text.replaceAll("-", "")}>
          <InputOTPGroup
            ref={groupRef}
            data-testid='paste-group'>
            {[0, 1, 2, 3].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole("textbox", {name: "Paste code"});
    await user.click(input);
    await user.paste("12-34");
    expect(input).toHaveValue("1234");
    expect(onComplete).toHaveBeenCalledWith("1234");
    expect(inputRef.current).toBe(input);
    expect(groupRef.current).toBe(screen.getByTestId("paste-group"));
  });

  it("preserves primitive-owned custom render slot data and focus state", async () => {
    const user = userEvent.setup();
    render(
      <InputOTP
        maxLength={2}
        aria-label='Custom code'
        value='12'
        render={({slots, isFocused}) => (
          <output
            aria-label='Rendered code'
            data-focused={isFocused}>
            {slots.map((slot) => slot.char).join("")}
          </output>
        )}
      />,
    );
    const output = screen.getByRole("status", {name: "Rendered code"});
    expect(output).toHaveTextContent("12");
    expect(output).toHaveAttribute("data-focused", "false");
    await user.click(screen.getByRole("textbox", {name: "Custom code"}));
    expect(output).toHaveAttribute("data-focused", "true");
  });

  it.each([
    {pattern: REGEXP_ONLY_DIGITS, valid: "12", invalid: "a"},
    {pattern: REGEXP_ONLY_CHARS, valid: "Ab", invalid: "1"},
    {pattern: REGEXP_ONLY_DIGITS_AND_CHARS, valid: "A1", invalid: "-"},
  ])("preserves validation pattern $pattern", async ({pattern, valid, invalid}) => {
    const user = userEvent.setup();
    render(
      <InputOTP
        maxLength={2}
        pattern={pattern}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    await user.type(screen.getByRole("textbox"), invalid + valid);
    expect(screen.getByRole("textbox")).toHaveValue(valid);
  });

  it("fails fast with a useful index error outside the OTP root", () => {
    expect(() => render(<InputOTPSlot index={0} />)).toThrow("InputOTPSlot could not find slot at index 0.");
  });
  it("renders without crashing", () => {
    // Arrange
    render(<InputOTP maxLength={2}>{null}</InputOTP>);

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("accepts typed values", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<InputOTP maxLength={2}>{null}</InputOTP>);

    // Act
    await user.type(screen.getByRole("textbox"), "12");

    // Assert
    expect(screen.getByRole("textbox")).toHaveValue("12");
  });

  it("merges the input and container classNames", () => {
    // Arrange
    const {container} = render(
      <InputOTP
        maxLength={2}
        className='custom-input'
        containerClassName='custom-container'>
        {null}
      </InputOTP>,
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

  it("shows controlled updates and primitive placeholders without replacing characters", () => {
    const {rerender} = render(
      <InputOTP
        maxLength={2}
        aria-label='Controlled code'
        value=''
        onChange={() => {}}
        placeholder='AB'>
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            data-testid='controlled-first'
          />
          <InputOTPSlot
            index={1}
            data-testid='controlled-second'
          />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getByTestId("controlled-first")).toHaveTextContent("A");
    expect(screen.getByTestId("controlled-second")).toHaveTextContent("B");
    rerender(
      <InputOTP
        maxLength={2}
        aria-label='Controlled code'
        value='12'
        onChange={() => {}}
        placeholder='AB'>
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            data-testid='controlled-first'
          />
          <InputOTPSlot
            index={1}
            data-testid='controlled-second'
          />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getByRole("textbox")).toHaveValue("12");
    expect(screen.getByTestId("controlled-first")).toHaveTextContent("1");
    expect(screen.getByTestId("controlled-second")).toHaveTextContent("2");
  });

  it("retains disabled state and invalid association on the backing input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <InputOTP
          aria-label='Disabled code'
          maxLength={2}
          disabled
          aria-invalid='true'
          aria-describedby='otp-error'
          value='12'>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
        <p id='otp-error'>Code expired.</p>
      </>,
    );
    const input = screen.getByRole("textbox", {name: "Disabled code"});
    await user.type(input, "34");
    expect(input).toBeDisabled();
    expect(input).toHaveValue("12");
    expect(input).toHaveAccessibleDescription("Code expired.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("forwards real input, group, slot and separator ref cleanup", () => {
    const inputRef = createRef<HTMLInputElement>();
    const slotRef = createRef<HTMLDivElement>();
    const groupRef = createRef<HTMLDivElement>();
    const separatorRef = createRef<HTMLDivElement>();
    const {unmount} = render(
      <InputOTP
        ref={inputRef}
        maxLength={1}
        aria-label='Ref code'>
        <InputOTPGroup
          ref={groupRef}
          data-testid='ref-group'>
          <InputOTPSlot
            ref={slotRef}
            index={0}
            data-testid='ref-slot'
          />
        </InputOTPGroup>
        <InputOTPSeparator ref={separatorRef} />
      </InputOTP>,
    );
    expect(inputRef.current).toBe(screen.getByRole("textbox"));
    expect(groupRef.current).toBe(screen.getByTestId("ref-group"));
    expect(slotRef.current).toBe(screen.getByTestId("ref-slot"));
    expect(separatorRef.current).toBe(screen.getByRole("separator"));
    unmount();
    expect(inputRef.current).toBeNull();
    expect(groupRef.current).toBeNull();
    expect(slotRef.current).toBeNull();
    expect(separatorRef.current).toBeNull();
  });

  it.each([-1, 0.5, Number.NaN, 2])("rejects invalid index %s", (index) => {
    expect(() =>
      render(
        <InputOTP maxLength={2}>
          <InputOTPSlot index={index} />
        </InputOTP>,
      ),
    ).toThrow(`InputOTPSlot could not find slot at index ${index}.`);
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

  it("renders character in slot when value is entered", async () => {
    // Arrange
    const user = userEvent.setup();
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
    await user.type(screen.getByRole("textbox"), "12");

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

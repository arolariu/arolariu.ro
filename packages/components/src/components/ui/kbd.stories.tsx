import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Kbd, KbdGroup} from "./kbd";

const meta = {
  title: "Components/Data Display/Kbd",
  component: Kbd,
  tags: ["autodocs"],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Single keyboard key representation.
 */
export const SingleKey: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
      <span>Press</span>
      <Kbd>Enter</Kbd>
      <span>to submit</span>
    </div>
  ),
};

/**
 * Keyboard shortcut combination using KbdGroup.
 */
export const KeyboardShortcut: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Save:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Copy:</span>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>C</Kbd>
        </KbdGroup>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Paste:</span>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>V</Kbd>
        </KbdGroup>
      </div>
    </div>
  ),
};

/**
 * Multiple shortcuts displayed in a list.
 */
export const ShortcutsList: Story = {
  render: () => (
    <div style={{padding: "1.5rem", background: "#f9fafb", borderRadius: "8px", maxWidth: "400px"}}>
      <h3 style={{marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600"}}>Keyboard Shortcuts</h3>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span>Search</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </div>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span>New file</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>N</Kbd>
          </KbdGroup>
        </div>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span>Toggle sidebar</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>B</Kbd>
          </KbdGroup>
        </div>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span>Undo</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>Z</Kbd>
          </KbdGroup>
        </div>
      </div>
    </div>
  ),
};

/**
 * Multi-key combination showing Ctrl+Shift+P.
 */
export const Combination: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
      <span>Command Palette:</span>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </div>
  ),
};

/**
 * Mac-style keyboard shortcut with ⌘ symbol.
 */
export const MacStyle: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Quick Open:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Save:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <span>Close Tab:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>W</Kbd>
        </KbdGroup>
      </div>
    </div>
  ),
};

/**
 * Keyboard shortcut shown inline within descriptive text.
 */
export const InContext: Story = {
  render: () => (
    <div style={{maxWidth: "32rem", lineHeight: "1.75", fontSize: "0.875rem"}}>
      <p>
        To quickly save your work, press{" "}
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
        . You can also use{" "}
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>{" "}
        to save with a new name. Press <Kbd>Esc</Kbd> to close any dialog without saving changes.
      </p>
    </div>
  ),
};

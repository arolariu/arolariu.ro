import {DirectionProvider as BaseDirectionProvider, useDirection as useBaseDirection} from "@base-ui/react/direction-provider";
import {Tabs} from "@base-ui/react/tabs";
import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {describe, expect, it} from "vitest";

import {DirectionProvider, useDirection, type TextDirection} from "./direction";

function DirectionConsumer({name}: Readonly<{name: string}>): React.JSX.Element {
  const direction = useDirection();
  return <output aria-label={name}>{direction}</output>;
}

function BaseDirectionConsumer({name}: Readonly<{name: string}>): React.JSX.Element {
  const direction = useBaseDirection();
  return <output aria-label={name}>{direction}</output>;
}

function SwitchableDirection(): React.JSX.Element {
  const [direction, setDirection] = useState<TextDirection>("ltr");
  return (
    <>
      <button
        type='button'
        onClick={() => setDirection((current) => (current === "ltr" ? "rtl" : "ltr"))}>
        Toggle direction
      </button>
      <DirectionProvider direction={direction}>
        <DirectionConsumer name='Changing scope' />
        <DirectionProvider direction='rtl'>
          <DirectionConsumer name='Fixed nested scope' />
        </DirectionProvider>
      </DirectionProvider>
      <DirectionConsumer name='Outside scope' />
    </>
  );
}

function PrimitiveTabs(): React.JSX.Element {
  return (
    <Tabs.Root defaultValue='first'>
      <Tabs.List aria-label='Pages'>
        <Tabs.Tab value='first'>First</Tabs.Tab>
        <Tabs.Tab value='second'>Second</Tabs.Tab>
        <Tabs.Tab value='third'>Third</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value='first'>First page</Tabs.Panel>
      <Tabs.Panel value='second'>Second page</Tabs.Panel>
      <Tabs.Panel value='third'>Third page</Tabs.Panel>
    </Tabs.Root>
  );
}

describe("direction entry point", () => {
  it("re-exports the exact Base UI provider and hook identities", () => {
    expect(DirectionProvider).toBe(BaseDirectionProvider);
    expect(useDirection).toBe(useBaseDirection);
  });

  it("retains the Base UI ltr fallback outside a provider and for an unspecified direction", () => {
    render(
      <div dir='rtl'>
        <DirectionConsumer name='No provider' />
        <DirectionProvider>
          <DirectionConsumer name='Default provider' />
        </DirectionProvider>
      </div>,
    );

    expect(screen.getByRole("status", {name: "No provider"})).toHaveTextContent("ltr");
    expect(screen.getByRole("status", {name: "Default provider"})).toHaveTextContent("ltr");
  });

  it("shares context with the original Base UI provider and consumer", () => {
    render(
      <>
        <BaseDirectionProvider direction='rtl'>
          <DirectionConsumer name='Our consumer' />
        </BaseDirectionProvider>
        <DirectionProvider direction='rtl'>
          <BaseDirectionConsumer name='Base UI consumer' />
        </DirectionProvider>
      </>,
    );

    expect(screen.getByRole("status", {name: "Our consumer"})).toHaveTextContent("rtl");
    expect(screen.getByRole("status", {name: "Base UI consumer"})).toHaveTextContent("rtl");
  });

  it("scopes nested providers without adding a DOM wrapper", () => {
    const {container} = render(
      <main>
        <DirectionProvider direction='rtl'>
          <DirectionConsumer name='Outer' />
          <DirectionProvider direction='ltr'>
            <DirectionConsumer name='Inner' />
          </DirectionProvider>
          <DirectionConsumer name='Outer sibling' />
        </DirectionProvider>
        <DirectionConsumer name='Outside' />
      </main>,
    );

    expect(screen.getByRole("status", {name: "Outer"})).toHaveTextContent("rtl");
    expect(screen.getByRole("status", {name: "Inner"})).toHaveTextContent("ltr");
    expect(screen.getByRole("status", {name: "Outer sibling"})).toHaveTextContent("rtl");
    expect(screen.getByRole("status", {name: "Outside"})).toHaveTextContent("ltr");
    expect(container.querySelector("main")?.children).toHaveLength(4);
  });

  it("updates real consumers without changing a nested override or outside scope", async () => {
    const user = userEvent.setup();
    render(<SwitchableDirection />);

    expect(screen.getByRole("status", {name: "Changing scope"})).toHaveTextContent("ltr");
    await user.click(screen.getByRole("button", {name: "Toggle direction"}));
    expect(screen.getByRole("status", {name: "Changing scope"})).toHaveTextContent("rtl");
    expect(screen.getByRole("status", {name: "Fixed nested scope"})).toHaveTextContent("rtl");
    expect(screen.getByRole("status", {name: "Outside scope"})).toHaveTextContent("ltr");
    await user.click(screen.getByRole("button", {name: "Toggle direction"}));
    expect(screen.getByRole("status", {name: "Changing scope"})).toHaveTextContent("ltr");
  });

  it("provides RTL keyboard navigation to real Base UI primitives without leaking to siblings", async () => {
    const user = userEvent.setup();
    render(
      <>
        <section aria-label='RTL scope'>
          <DirectionProvider direction='rtl'>
            <PrimitiveTabs />
          </DirectionProvider>
        </section>
        <section aria-label='LTR scope'>
          <PrimitiveTabs />
        </section>
      </>,
    );

    const rtl = within(screen.getByRole("region", {name: "RTL scope"}));
    const ltr = within(screen.getByRole("region", {name: "LTR scope"}));
    await user.click(rtl.getByRole("tab", {name: "First"}));
    await user.keyboard("{ArrowLeft}");
    expect(rtl.getByRole("tab", {name: "Second"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(rtl.getByRole("tab", {name: "Second"})).toHaveAttribute("aria-selected", "true");

    await user.click(ltr.getByRole("tab", {name: "First"}));
    await user.keyboard("{ArrowRight}");
    expect(ltr.getByRole("tab", {name: "Second"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(ltr.getByRole("tab", {name: "Second"})).toHaveAttribute("aria-selected", "true");
  });
});

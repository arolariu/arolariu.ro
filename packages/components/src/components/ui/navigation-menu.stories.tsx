import {DirectionProvider} from "@base-ui/react/direction-provider";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {cn} from "@/lib/utilities";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import styles from "./navigation-menu.module.css";

const meta: Meta<typeof NavigationMenu> = {
  title: "Components/Navigation/NavigationMenu",
  component: NavigationMenu,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
  args: {align: "start"},
  argTypes: {
    align: {control: "select", options: ["start", "center", "end"]},
    orientation: {control: "select", options: ["horizontal", "vertical"]},
    delay: {control: "number"},
    closeDelay: {control: "number"},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function DemoItems(): React.ReactElement {
  return (
    <NavigationMenuList>
      <NavigationMenuItem value='products'>
        <NavigationMenuTrigger>Products</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className={styles.storyPanel}>
            <li>
              <NavigationMenuLink
                href='#analytics'
                className={styles.storyLink}>
                <strong>Analytics</strong>
                <span className={styles.storyDescription}>Understand trends with accessible charts.</span>
              </NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink
                href='#automation'
                className={styles.storyLink}>
                <strong>Automation</strong>
                <span className={styles.storyDescription}>Build repeatable workflows.</span>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem value='resources'>
        <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className={cn(styles.storyPanel, styles.storyWidePanel)}>
            {["Introduction", "Installation", "Components", "Accessibility", "Theming", "Changelog"].map((label) => (
              <li key={label}>
                <NavigationMenuLink
                  href={`#${label.toLowerCase()}`}
                  className={styles.storyLink}>
                  <strong>{label}</strong>
                  <span className={styles.storyDescription}>Explore Base UI components and CSS Modules.</span>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink
          href='#pricing'
          className={navigationMenuTriggerStyle()}
          active>
          Pricing
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  );
}

/** Switch Products/Resources to see the primitive-owned popup resize between unequal content sizes. */
export const Default: Story = {
  args: {defaultValue: "products"},
  render: (args) => (
    <NavigationMenu {...args}>
      <DemoItems />
    </NavigationMenu>
  ),
};

/** Native direct links require no popup; the active link retains aria-current="page". */
export const SimpleLinks: Story = {
  render: (args) => (
    <NavigationMenu {...args}>
      <NavigationMenuList>
        {["Home", "About", "Services", "Contact"].map((label) => (
          <NavigationMenuItem key={label}>
            <NavigationMenuLink
              href={`#${label.toLowerCase()}`}
              className={navigationMenuTriggerStyle()}
              active={label === "Home"}>
              {label}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

/** Mixed direct links and dropdowns; Root's align control configures its automatic Positioner. */
export const MixedNavigation: Story = {
  render: (args) => (
    <NavigationMenu {...args}>
      <DemoItems />
    </NavigationMenu>
  ),
};

/** An explicit public Positioner with custom placement and correctly owned Popup/Viewport callbacks. */
export const ExplicitPositioner: Story = {
  args: {defaultValue: "resources", align: "end"},
  render: (args) => (
    <div className={styles.storyStack}>
      <p className={styles.storyHint}>Root's automatic popup is disabled when composing an explicit Positioner.</p>
      <NavigationMenu
        {...args}
        positionerProps={false}>
        <DemoItems />
        <NavigationMenuPositioner
          side='bottom'
          align={args.align}
          sideOffset={12}
          alignOffset={0}
          popupProps={{
            "aria-label": "Resource navigation",
            render: (props, state) => (
              <nav
                {...props}
                data-placement={`${state.side}:${state.align}`}
              />
            ),
          }}
          viewportProps={{className: () => styles.viewport}}
        />
      </NavigationMenu>
    </div>
  ),
};

/** Backward-compatible decorative Indicator and Viewport; neither pretends to own popup state. */
export const LegacyViewport: Story = {
  render: (args) => (
    <div className={styles.storyStack}>
      <p className={styles.storyHint}>Deprecated Viewport props/ref still target the clipping viewport.</p>
      <NavigationMenu
        {...args}
        positionerProps={false}>
        <DemoItems />
        <NavigationMenuViewport positionerProps={{align: args.align}} />
      </NavigationMenu>
      <NavigationMenuIndicator />
    </div>
  ),
};

/** RTL keyboard navigation uses Base UI's scoped direction context, including the portaled popup. */
export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider direction='rtl'>
      <div
        dir='rtl'
        className={styles.storyStack}>
        <p className={styles.storyHint}>Use Left/Right arrows across items, Down to open, and Tab to enter links.</p>
        <NavigationMenu {...args}>
          <DemoItems />
        </NavigationMenu>
      </div>
    </DirectionProvider>
  ),
};

/** Vertical orientation uses Up/Down across items and Right (Left in RTL) to open content. */
export const Vertical: Story = {
  args: {orientation: "vertical"},
  render: (args) => (
    <NavigationMenu
      {...args}
      positionerProps={{side: "inline-end", align: "start"}}>
      <DemoItems />
    </NavigationMenu>
  ),
};

function ResizeExample(props: Readonly<NavigationMenu.Props>): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <NavigationMenu
      {...props}
      defaultValue='updates'>
      <NavigationMenuList>
        <NavigationMenuItem value='updates'>
          <NavigationMenuTrigger>Updates</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className={styles.storyPanel}>
              <NavigationMenuLink
                href='#latest'
                className={styles.storyLink}>
                Latest release
              </NavigationMenuLink>
              <button
                type='button'
                className={navigationMenuTriggerStyle()}
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show fewer details" : "Show release details"}
              </button>
              {expanded && (
                <p className={styles.storyDescription}>
                  More content changes the measured popup size without local geometry tokens or wrapper-owned observers.
                </p>
              )}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/** Dynamic content remains inside the real primitive's measurement and transition lifecycle. */
export const DynamicContent: Story = {
  render: (args) => <ResizeExample {...args} />,
};

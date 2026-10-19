import {DirectionProvider} from "@base-ui/react/direction-provider";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {cn} from "@/lib/utilities";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import styles from "./navigation-menu.module.css";
const storyStyles = `
.ac-story-navigation-menu-storyPanel {
  box-sizing: border-box;
  display: grid;
  width: 22rem;
  max-width: calc(100vw - var(--ac-space-8));
  gap: var(--ac-space-3);
  margin: 0;
  padding: var(--ac-space-4);
  list-style: none;
}

.ac-story-navigation-menu-storyWidePanel {
  width: 32rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ac-story-navigation-menu-storyLink {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ac-space-1);
  padding: var(--ac-space-3);
}

.ac-story-navigation-menu-storyDescription,
.ac-story-navigation-menu-storyHint {
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
  line-height: 1.5;
}

.ac-story-navigation-menu-storyStack {
  display: grid;
  justify-items: start;
  gap: var(--ac-space-4);
}

@media (max-width: 36rem) {
  .ac-story-navigation-menu-storyWidePanel {
    grid-template-columns: 1fr;
  }
}
`;

const storyClasses = {
  storyPanel: "ac-story-navigation-menu-storyPanel",
  storyWidePanel: "ac-story-navigation-menu-storyWidePanel",
  storyLink: "ac-story-navigation-menu-storyLink",
  storyDescription: "ac-story-navigation-menu-storyDescription",
  storyHint: "ac-story-navigation-menu-storyHint",
  storyStack: "ac-story-navigation-menu-storyStack",
} as const;

const meta: Meta<typeof NavigationMenu> = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
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
          <ul className={storyClasses.storyPanel}>
            <li>
              <NavigationMenuLink
                href='#analytics'
                className={storyClasses.storyLink}>
                <strong>Analytics</strong>
                <span className={storyClasses.storyDescription}>Understand trends with accessible charts.</span>
              </NavigationMenuLink>
            </li>
            <li>
              <NavigationMenuLink
                href='#automation'
                className={storyClasses.storyLink}>
                <strong>Automation</strong>
                <span className={storyClasses.storyDescription}>Build repeatable workflows.</span>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem value='resources'>
        <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className={cn(storyClasses.storyPanel, storyClasses.storyWidePanel)}>
            {["Introduction", "Installation", "Components", "Accessibility", "Theming", "Changelog"].map((label) => (
              <li key={label}>
                <NavigationMenuLink
                  href={`#${label.toLowerCase()}`}
                  className={storyClasses.storyLink}>
                  <strong>{label}</strong>
                  <span className={storyClasses.storyDescription}>Explore Base UI components and CSS Modules.</span>
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

/** Native direct links require no popup; the current link keeps aria-current="page" and an underline that hover never shows. */
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
    <div className={storyClasses.storyStack}>
      <p className={storyClasses.storyHint}>Root's automatic popup is disabled when composing an explicit Positioner.</p>
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

/** Explicit native positioning with caller-owned viewport options. */
export const ExplicitViewport: Story = {
  render: (args) => (
    <div className={storyClasses.storyStack}>
      <p className={storyClasses.storyHint}>Positioner viewportProps target the clipping viewport.</p>
      <NavigationMenu
        {...args}
        positionerProps={false}>
        <DemoItems />
        <NavigationMenuPositioner align={args.align} />
      </NavigationMenu>
    </div>
  ),
};

/** RTL keyboard navigation uses Base UI's scoped direction context, including the portaled popup. */
export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider direction='rtl'>
      <div
        dir='rtl'
        className={storyClasses.storyStack}>
        <p className={storyClasses.storyHint}>Use Left/Right arrows across items, Down to open, and Tab to enter links.</p>
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
            <div className={storyClasses.storyPanel}>
              <NavigationMenuLink
                href='#latest'
                className={storyClasses.storyLink}>
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
                <p className={storyClasses.storyDescription}>
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

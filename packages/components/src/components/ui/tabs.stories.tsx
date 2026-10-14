"use client";

import {FileText, House, Settings} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Tabs, TabsContent, TabsList, TabsTrigger, type TabsListVariant} from "./tabs";
const storyStyles = `
.ac-story-tabs-scrollable {
  overflow-x: auto;
}
`;

const storyClasses = {
  scrollable: "ac-story-tabs-scrollable",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    orientation: {control: "select", options: ["horizontal", "vertical"]},
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tabs
      defaultValue='account'
      {...args}>
      <TabsList>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
        <TabsTrigger value='settings'>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>
        <p>Manage your account settings and preferences.</p>
      </TabsContent>
      <TabsContent value='password'>
        <p>Change your password and security settings.</p>
      </TabsContent>
      <TabsContent value='settings'>
        <p>Configure your application settings.</p>
      </TabsContent>
    </Tabs>
  ),
};

function PresentationExample({
  variant,
  orientation = "horizontal",
}: Readonly<{
  variant: TabsListVariant;
  orientation?: "horizontal" | "vertical";
}>): React.JSX.Element {
  return (
    <Tabs
      defaultValue='overview'
      orientation={orientation}>
      <TabsList
        variant={variant}
        aria-label='Sections'>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='activity'>Recent activity</TabsTrigger>
        <TabsTrigger value='settings'>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value='overview'>
        <p>Explore the overview. The shared indicator adapts to each tab&apos;s size.</p>
      </TabsContent>
      <TabsContent value='activity'>
        <p>Review recent activity.</p>
      </TabsContent>
      <TabsContent value='settings'>
        <p>Adjust your settings.</p>
      </TabsContent>
    </Tabs>
  );
}

export const Line: Story = {
  parameters: {
    docs: {description: {story: "The line presentation retains the local animated underline shared between tabs."}},
  },
  render: () => <PresentationExample variant='line' />,
};

export const Vertical: Story = {
  parameters: {
    docs: {description: {story: "Vertical orientation is forwarded to Base UI: Up/Down navigate and Enter/Space select."}},
  },
  render: () => (
    <PresentationExample
      variant='default'
      orientation='vertical'
    />
  ),
};

export const VerticalLine: Story = {
  render: () => (
    <PresentationExample
      variant='line'
      orientation='vertical'
    />
  ),
};

function ControlledExample(): React.JSX.Element {
  const [value, setValue] = React.useState("overview");
  return (
    <Tabs
      value={value}
      onValueChange={setValue}>
      <TabsList
        variant='line'
        activateOnFocus
        aria-label='Controlled sections'>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='activity'>Activity</TabsTrigger>
        <TabsTrigger
          value='settings'
          disabled>
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value='overview'>Overview selected by the controller.</TabsContent>
      <TabsContent value='activity'>Activity selected by the controller.</TabsContent>
      <TabsContent value='settings'>Settings are unavailable.</TabsContent>
    </Tabs>
  );
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story: "The controller owns selection; arrow focus activates enabled tabs. Disabled tabs remain focusable, but cannot activate.",
      },
    },
  },
  render: () => <ControlledExample />,
};

export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultValue='overview'>
      <TabsList>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='details'>Details</TabsTrigger>
      </TabsList>
      <TabsContent value='overview'>
        <p>Overview content goes here.</p>
      </TabsContent>
      <TabsContent value='details'>
        <p>Detailed information goes here.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue='home'>
      <TabsList>
        <TabsTrigger value='home'>Home</TabsTrigger>
        <TabsTrigger
          value='settings'
          disabled>
          Settings
        </TabsTrigger>
        <TabsTrigger value='profile'>Profile</TabsTrigger>
      </TabsList>
      <TabsContent value='home'>
        <p>Welcome to the home tab.</p>
      </TabsContent>
      <TabsContent value='settings'>
        <p>Settings are currently unavailable.</p>
      </TabsContent>
      <TabsContent value='profile'>
        <p>Your profile information.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue='home'>
      <TabsList>
        <TabsTrigger value='home'>
          <House aria-hidden='true' />
          Home
        </TabsTrigger>
        <TabsTrigger value='documents'>
          <FileText aria-hidden='true' />
          Documents
        </TabsTrigger>
        <TabsTrigger value='settings'>
          <Settings aria-hidden='true' />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value='home'>
        <p>Home page with dashboard overview.</p>
      </TabsContent>
      <TabsContent value='documents'>
        <p>View and manage your documents.</p>
      </TabsContent>
      <TabsContent value='settings'>
        <p>Configure your application preferences.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue='tab1'>
      <TabsList className={storyClasses.scrollable}>
        <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        <TabsTrigger value='tab2'>Tab 2</TabsTrigger>
        <TabsTrigger value='tab3'>Tab 3</TabsTrigger>
        <TabsTrigger value='tab4'>Tab 4</TabsTrigger>
        <TabsTrigger value='tab5'>Tab 5</TabsTrigger>
        <TabsTrigger value='tab6'>Tab 6</TabsTrigger>
        <TabsTrigger value='tab7'>Tab 7</TabsTrigger>
        <TabsTrigger value='tab8'>Tab 8</TabsTrigger>
        <TabsTrigger value='tab9'>Tab 9</TabsTrigger>
        <TabsTrigger value='tab10'>Tab 10</TabsTrigger>
      </TabsList>
      <TabsContent value='tab1'>
        <p>Content for Tab 1</p>
      </TabsContent>
      <TabsContent value='tab2'>
        <p>Content for Tab 2</p>
      </TabsContent>
      <TabsContent value='tab3'>
        <p>Content for Tab 3</p>
      </TabsContent>
      <TabsContent value='tab4'>
        <p>Content for Tab 4</p>
      </TabsContent>
      <TabsContent value='tab5'>
        <p>Content for Tab 5</p>
      </TabsContent>
      <TabsContent value='tab6'>
        <p>Content for Tab 6</p>
      </TabsContent>
      <TabsContent value='tab7'>
        <p>Content for Tab 7</p>
      </TabsContent>
      <TabsContent value='tab8'>
        <p>Content for Tab 8</p>
      </TabsContent>
      <TabsContent value='tab9'>
        <p>Content for Tab 9</p>
      </TabsContent>
      <TabsContent value='tab10'>
        <p>Content for Tab 10</p>
      </TabsContent>
    </Tabs>
  ),
};

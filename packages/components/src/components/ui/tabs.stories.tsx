import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./tabs";

const meta = {
  title: "Components/Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue='account'>
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

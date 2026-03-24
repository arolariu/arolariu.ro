import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FileText, Home, Settings} from "lucide-react";
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
          <Home style={{width: "16px", height: "16px", marginRight: "0.5rem"}} />
          Home
        </TabsTrigger>
        <TabsTrigger value='documents'>
          <FileText style={{width: "16px", height: "16px", marginRight: "0.5rem"}} />
          Documents
        </TabsTrigger>
        <TabsTrigger value='settings'>
          <Settings style={{width: "16px", height: "16px", marginRight: "0.5rem"}} />
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
      <TabsList style={{overflowX: "auto"}}>
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

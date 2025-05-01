import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../dist";

const meta: Meta<typeof Tabs> = {
  title: "Design System/Tabs",
  component: Tabs,
};

export default meta;

type Story = StoryObj<typeof Tabs>;

// Basic tabs
export const Basic: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="p-4 rounded-md border mt-2">
          <h3 className="font-medium mb-2">Account Settings</h3>
          <p className="text-sm">Manage your account settings here.</p>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="p-4 rounded-md border mt-2">
          <h3 className="font-medium mb-2">Password Settings</h3>
          <p className="text-sm">Change your password here.</p>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="p-4 rounded-md border mt-2">
          <h3 className="font-medium mb-2">App Settings</h3>
          <p className="text-sm">Manage app settings and preferences.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

// Tabs with icons
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="profile" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="profile">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profile
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Notifications
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Analytics
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              View and edit your profile information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Name:</strong> John Doe
              </p>
              <p>
                <strong>Email:</strong> john@example.com
              </p>
              <p>
                <strong>Role:</strong> Administrator
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications" className="mt-2">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage your notification preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p>You have notifications enabled for comments and mentions.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics" className="mt-2">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>View your activity statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p>Your engagement is up 20% from last week.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

// Vertical tabs
export const Vertical: Story = {
  render: () => (
    <div className="flex gap-4 w-[600px]">
      <Tabs defaultValue="tab1" orientation="vertical" className="w-full">
        <div className="flex flex-row gap-4">
          <TabsList className="flex flex-col h-full w-[200px]">
            <TabsTrigger value="tab1" className="justify-start text-left">
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="tab2" className="justify-start text-left">
              Installation
            </TabsTrigger>
            <TabsTrigger value="tab3" className="justify-start text-left">
              Configuration
            </TabsTrigger>
            <TabsTrigger value="tab4" className="justify-start text-left">
              Advanced Usage
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="tab1" className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
              <p className="text-sm">
                This guide will help you get started with our component library.
              </p>
            </TabsContent>
            <TabsContent value="tab2" className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">Installation</h3>
              <p className="text-sm">
                Install the package using your package manager of choice.
              </p>
              <pre className="mt-2 bg-neutral-100 p-2 rounded text-sm">
                npm install @acme/components
              </pre>
            </TabsContent>
            <TabsContent value="tab3" className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">Configuration</h3>
              <p className="text-sm">
                Configure the library to work with your project.
              </p>
            </TabsContent>
            <TabsContent value="tab4" className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">Advanced Usage</h3>
              <p className="text-sm">
                Learn about advanced features and customization options.
              </p>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  ),
};

// Custom styled tabs
export const CustomStyled: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList className="bg-blue-100 dark:bg-blue-900/50">
        <TabsTrigger
          value="tab1"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-700"
        >
          Dashboard
        </TabsTrigger>
        <TabsTrigger
          value="tab2"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-700"
        >
          Projects
        </TabsTrigger>
        <TabsTrigger
          value="tab3"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-700"
        >
          Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="tab1"
        className="mt-2 p-4 border border-blue-200 rounded-md"
      >
        <h3 className="text-blue-700 font-medium">Dashboard</h3>
        <p className="text-sm text-blue-600">
          View your dashboard statistics and analytics.
        </p>
      </TabsContent>
      <TabsContent
        value="tab2"
        className="mt-2 p-4 border border-blue-200 rounded-md"
      >
        <h3 className="text-blue-700 font-medium">Projects</h3>
        <p className="text-sm text-blue-600">
          View and manage your active projects.
        </p>
      </TabsContent>
      <TabsContent
        value="tab3"
        className="mt-2 p-4 border border-blue-200 rounded-md"
      >
        <h3 className="text-blue-700 font-medium">Reports</h3>
        <p className="text-sm text-blue-600">
          Access and download your reports.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

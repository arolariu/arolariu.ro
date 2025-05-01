import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  Button,
} from "../dist";

const meta: Meta<typeof Card> = {
  title: "Design System/Cards/Card",
  component: Card,
};

export default meta;

type Story = StoryObj<typeof Card>;

// Basic card
export const Basic: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
};

// Card with action
export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Notification</CardTitle>
        <CardDescription>You have a new message</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Mark as Read
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>John Doe sent you a message about the project deadline.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          Dismiss
        </Button>
        <Button size="sm">View</Button>
      </CardFooter>
    </Card>
  ),
};

// Custom styled card
export const CustomStyled: Story = {
  render: () => (
    <Card className="w-[350px] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50 border-blue-100 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="text-blue-700 dark:text-blue-300">
          Premium Plan
        </CardTitle>
        <CardDescription className="text-blue-600/80 dark:text-blue-400/80">
          Access all features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-blue-700 dark:text-blue-300">
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Unlimited projects
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Priority support
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Custom domains
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-700/90">
          Upgrade Now
        </Button>
      </CardFooter>
    </Card>
  ),
};

// Multiple cards layout
export const MultipleCards: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>First Card</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Some content for the first card</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Second Card</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Some content for the second card</p>
        </CardContent>
      </Card>
    </div>
  ),
};

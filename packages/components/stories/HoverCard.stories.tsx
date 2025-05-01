import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  CalendarIcon,
  BadgeCheck,
} from "../dist";

const meta: Meta<typeof HoverCard> = {
  title: "Design System/Cards/Hover Card",
  component: HoverCard,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof HoverCard>;

// Basic hover card example
export const Basic: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@username</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between space-x-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@username</h4>
            <p className="text-sm">
              The React Framework – created and maintained by @vercel.
            </p>
            <div className="flex items-center pt-2">
              <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />{" "}
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Joined December 2021
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

// User profile hover card
export const UserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <span>shadcn</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <Avatar className="h-14 w-14">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">shadcn</h4>
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                @shadcn
              </div>
              <div className="mt-2 text-sm">
                Software developer and creator of UI components
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <div className="font-medium">112</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                Posts
              </div>
            </div>
            <div>
              <div className="font-medium">1,204</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                Followers
              </div>
            </div>
            <div>
              <div className="font-medium">568</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                Following
              </div>
            </div>
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            <CalendarIcon className="inline mr-1 h-3 w-3" />
            Joined March 2019
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

// Product info hover card
export const ProductInfo: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href="#" className="text-blue-500 hover:underline">
          Premium Plan
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-lg font-semibold">Premium Plan</h4>
          <p className="text-sm">
            Our most popular plan, perfect for professionals and small teams.
          </p>
          <div className="mt-2 space-y-2">
            <div className="text-2xl font-bold">$29/month</div>
            <ul className="text-sm space-y-1">
              <li className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Unlimited projects
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Advanced analytics
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                24/7 priority support
              </li>
            </ul>
            <Button className="w-full mt-4">Upgrade Now</Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

// Image preview hover card
export const ImagePreview: Story = {
  render: () => (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <a href="#" className="inline-block">
          <img
            src="https://images.unsplash.com/photo-1527090496-346715f0b28d?q=80&w=120&h=120&auto=format&fit=crop"
            alt="Thumbnail"
            className="h-12 w-12 rounded-md object-cover"
          />
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0">
        <img
          src="https://images.unsplash.com/photo-1527090496-346715f0b28d?q=80&w=1200&auto=format&fit=crop"
          alt="Full size preview"
          className="h-auto w-full rounded-md object-cover"
        />
        <div className="p-4">
          <h4 className="font-medium">Beach Sunset</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Photo by John Smith • 1920×1080
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

// Help text hover card
export const HelpText: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <label htmlFor="api-key" className="text-sm font-medium">
        API Key
      </label>
      <HoverCard>
        <HoverCardTrigger asChild>
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
            className="text-neutral-500 cursor-help"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">About API Keys</h4>
            <p className="text-sm">
              API keys are used to authenticate your requests. Keep your API
              keys secure and do not share them in publicly accessible areas.
            </p>
            <p className="text-sm">
              If you suspect your API key has been compromised, you can
              regenerate it from your account settings.
            </p>
            <a href="#" className="text-sm text-blue-500 hover:underline">
              Learn more about API security
            </a>
          </div>
        </HoverCardContent>
      </HoverCard>
      <input
        id="api-key"
        type="text"
        value="sk_live_1234567890abcdef"
        readOnly
        className="ml-2 rounded-md border px-3 py-2 text-sm"
      />
    </div>
  ),
};

// Custom positioned hover card
export const CustomPosition: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-20">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="outline">Hover (Default)</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Default Position</h4>
            <p className="text-sm">
              This hover card appears below the trigger by default.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="outline">Hover (Top)</Button>
        </HoverCardTrigger>
        <HoverCardContent side="top">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Top Position</h4>
            <p className="text-sm">
              This hover card appears above the trigger element.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="outline">Hover (Left)</Button>
        </HoverCardTrigger>
        <HoverCardContent side="left" align="start">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Left Position</h4>
            <p className="text-sm">
              This hover card appears to the left of the trigger.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="outline">Hover (Right)</Button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Right Position</h4>
            <p className="text-sm">
              This hover card appears to the right of the trigger.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

// Custom timing hover card
export const CustomTiming: Story = {
  render: () => (
    <div className="flex gap-8">
      <div>
        <div className="mb-2 text-sm font-medium text-center">
          Quick (100ms)
        </div>
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Button variant="outline">Quick Response</Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Quick Response</h4>
              <p className="text-sm">
                This card appears and disappears quickly (100ms).
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-center">Slow (700ms)</div>
        <HoverCard openDelay={700} closeDelay={700}>
          <HoverCardTrigger asChild>
            <Button variant="outline">Slow Response</Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Slow Response</h4>
              <p className="text-sm">
                This card has a longer delay (700ms) both for appearing and
                disappearing.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </div>
  ),
};

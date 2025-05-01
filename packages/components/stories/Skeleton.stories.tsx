import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Skeleton,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Avatar,
} from "../dist";

const meta: Meta<typeof Skeleton> = {
  title: "Design System/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

// Basic skeleton shapes
export const Basic: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};

// Card skeleton
export const CardSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="flex flex-col space-y-2">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  ),
};

// User card skeleton
export const UserCardSkeleton: Story = {
  render: () => (
    <div className="flex flex-col space-y-5">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    </div>
  ),
};

// Table skeleton
export const TableSkeleton: Story = {
  render: () => (
    <div className="w-[600px] rounded-md border">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="flex flex-col space-y-3 p-4">
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
      </div>
    </div>
  ),
};

// Dashboard skeleton
export const DashboardSkeleton: Story = {
  render: () => (
    <div className="w-[600px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-[200px]" />
          <div className="mt-2 flex space-x-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
      </div>
      <div>
        <Skeleton className="mb-2 h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  ),
};

// Comment skeleton
export const CommentSkeleton: Story = {
  render: () => (
    <div className="w-[500px] space-y-4">
      {Array(3)
        .fill(null)
        .map((_, i) => (
          <div key={i} className="flex space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="w-full space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
    </div>
  ),
};

// Custom colors
export const CustomColors: Story = {
  render: () => (
    <div className="flex flex-col space-y-6 w-[300px]">
      <div className="space-y-2">
        <div className="text-sm text-neutral-500">Default</div>
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-neutral-500">Blue</div>
        <Skeleton className="h-8 w-full bg-blue-100 dark:bg-blue-950" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-neutral-500">Green</div>
        <Skeleton className="h-8 w-full bg-green-100 dark:bg-green-950" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-neutral-500">Red</div>
        <Skeleton className="h-8 w-full bg-red-100 dark:bg-red-950" />
      </div>
    </div>
  ),
};

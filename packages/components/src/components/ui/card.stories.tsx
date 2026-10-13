"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "./card";
import styles from "./card.module.css";
import {Skeleton} from "./skeleton";

const meta = {
  title: "Components/Data Display/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {size: {control: "select", options: ["default", "sm"]}},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args): React.JSX.Element => (
    <Card
      {...args}
      className={styles.storyCard}>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>Supporting information for the content below.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Related content lives together in this surface.</p>
      </CardContent>
      <CardFooter>Updated today</CardFooter>
    </Card>
  ),
};

export const Small: Story = {...Default, args: {size: "sm"}};

export const WithoutFooter: Story = {
  render: (): React.JSX.Element => (
    <Card className={styles.storyCard}>
      <CardHeader>
        <CardTitle>Simple card</CardTitle>
      </CardHeader>
      <CardContent>No footer is required.</CardContent>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: (): React.JSX.Element => (
    <Card className={styles.storyCard}>
      <CardContent>Content-only cards keep their interior padding.</CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: (): React.JSX.Element => (
    <Card
      size='sm'
      className={styles.storyCard}>
      <CardHeader>
        <CardTitle>A_long_unbroken_title_that_should_not_push_the_header_action_out_of_its_column</CardTitle>
        <CardDescription>Descriptions wrap independently of header controls.</CardDescription>
        <CardAction>
          <Button
            size='sm'
            variant='outline'>
            Manage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>Compact sizing applies to every section.</CardContent>
    </Card>
  ),
};

export const WithImage: Story = {
  render: (): React.JSX.Element => (
    <Card className={styles.storyCard}>
      <svg
        className={styles.storyImage}
        role='img'
        aria-label='Mountain illustration'
        viewBox='0 0 320 160'>
        <path
          d='M0 160 100 20 180 120 240 60 320 160Z'
          fill='currentColor'
        />
      </svg>
      <CardHeader>
        <CardTitle>Mountain landscape</CardTitle>
        <CardDescription>Media follows the card's rounded clipping.</CardDescription>
      </CardHeader>
      <CardContent>Explore a new route.</CardContent>
      <CardFooter>
        <Button>View details</Button>
      </CardFooter>
    </Card>
  ),
};

function InteractiveCard(): React.JSX.Element {
  const [saved, setSaved] = React.useState(false);
  return (
    <Card className={styles.storyCard}>
      <CardHeader>
        <CardTitle>Reading list</CardTitle>
        <CardDescription>Native button behavior, not a clickable div.</CardDescription>
        <CardAction>
          <Button
            size='sm'
            aria-pressed={saved}
            onClick={() => setSaved(!saved)}>
            {saved ? "Saved" : "Save"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p role='status'>{saved ? "Added to the list." : "Not saved yet."}</p>
      </CardContent>
    </Card>
  );
}
export const Interactive: Story = {render: (): React.JSX.Element => <InteractiveCard />};

export const Loading: Story = {
  render: (): React.JSX.Element => (
    <Card
      aria-busy='true'
      aria-label='Loading content'
      className={styles.storyCard}>
      <CardHeader>
        <Skeleton className={styles.storyLoadingLine} />
        <Skeleton className={styles.storyLoadingLine} />
      </CardHeader>
      <CardContent>
        <Skeleton className={styles.storyLoadingLine} />
      </CardContent>
      <CardFooter>
        <span role='status'>Preparing content…</span>
      </CardFooter>
    </Card>
  ),
};

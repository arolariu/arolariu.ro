import {FileText} from "lucide-react";
import type * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle} from "./attachment";
import {Avatar, AvatarFallback, AvatarImage} from "./avatar";
import {Bubble, BubbleContent, BubbleGroup, BubbleReactions} from "./bubble";
import {Button} from "./button";
import {Marker, MarkerContent} from "./marker";
import {Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader} from "./message";
const storyStyles = `
.ac-story-message-storyStack {
  inline-size: min(32rem, 90vw);
  gap: var(--ac-space-6);
}
`;

const storyClasses = {
  storyStack: "ac-story-message-storyStack",
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
  title: "Components/Data Display/Message",
  component: Message,
  tags: ["autodocs"],
  argTypes: {align: {control: "select", options: ["start", "end"]}},
} satisfies Meta<typeof Message>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {align: "start"},
  render: (args): React.JSX.Element => (
    <Message {...args}>
      <MessageAvatar>
        <Avatar>
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>Alex · caller-provided name</MessageHeader>
        <Bubble variant='secondary'>
          <BubbleContent>Message content belongs to the caller.</BubbleContent>
        </Bubble>
        <MessageFooter>
          <time dateTime='2026-10-13T10:30:00Z'>10:30</time> · Delivered
        </MessageFooter>
      </MessageContent>
    </Message>
  ),
};

export const CompleteConversation: Story = {
  render: (): React.JSX.Element => (
    <MessageGroup
      className={storyClasses.storyStack}
      aria-label='Example conversation'>
      <Marker variant='separator'>
        <MarkerContent>Today</MarkerContent>
      </Marker>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage
              alt='Local example avatar'
              src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
            />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Alex</MessageHeader>
          <BubbleGroup>
            <Bubble variant='secondary'>
              <BubbleContent>Here are the notes.</BubbleContent>
            </Bubble>
            <Bubble variant='ghost'>
              <BubbleContent>
                <Attachment>
                  <AttachmentMedia>
                    <FileText aria-hidden='true' />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>Notes.txt</AttachmentTitle>
                    <AttachmentDescription>Ready · 24 KB</AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
              </BubbleContent>
            </Bubble>
          </BubbleGroup>
          <MessageFooter>10:30</MessageFooter>
        </MessageContent>
      </Message>
      <Message align='end'>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>You</MessageHeader>
          <Bubble>
            <BubbleContent>Thanks, I will read them.</BubbleContent>
            <BubbleReactions>👍 1</BubbleReactions>
          </Bubble>
          <MessageFooter>10:31 · Read</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  ),
};

export const CallerOwnedEmptyAndError: Story = {
  render: (): React.JSX.Element => (
    <MessageGroup className={storyClasses.storyStack}>
      <Marker>
        <MarkerContent>No earlier messages. The caller supplies this empty state.</MarkerContent>
      </Marker>
      <Message align='end'>
        <MessageContent>
          <MessageHeader>You</MessageHeader>
          <Bubble variant='destructive'>
            <BubbleContent>Could not prepare the message.</BubbleContent>
          </Bubble>
          <MessageFooter>
            <Button
              variant='outline'
              size='xs'
              disabled>
              Retry unavailable in this static example
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
      <Message aria-label='Empty message shell'>
        <MessageContent />
      </Message>
    </MessageGroup>
  ),
};

export const LongContentAndRTL: Story = {
  render: (): React.JSX.Element => (
    <MessageGroup
      dir='rtl'
      className={storyClasses.storyStack}>
      <Message>
        <MessageAvatar>
          <Avatar size='sm'>
            <AvatarFallback>م</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>الاسم</MessageHeader>
          <Bubble variant='secondary'>
            <BubbleContent>رسالة طويلة يملكها المستدعي، دون حالة تطبيق أو اتصال شبكي.</BubbleContent>
          </Bubble>
          <MessageFooter>10:30</MessageFooter>
        </MessageContent>
      </Message>
      <Message align='end'>
        <MessageContent>
          <MessageHeader>Caller with a long metadata label that remains available</MessageHeader>
          <Bubble>
            <BubbleContent>{"LongUnbrokenCallerMessage".repeat(25)}</BubbleContent>
          </Bubble>
          <MessageFooter>Caller-owned delivery status</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  ),
};

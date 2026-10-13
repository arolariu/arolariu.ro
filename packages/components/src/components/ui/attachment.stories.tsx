import {FileText, RotateCcw, X} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
  type AttachmentStatus,
} from "./attachment";
import styles from "./attachment.module.css";
import {Button} from "./button";

const meta = {
  title: "Components/Data Display/Attachment",
  component: Attachment,
  tags: ["autodocs"],
  argTypes: {
    state: {control: "select", options: ["done", "idle", "uploading", "processing", "error"]},
    size: {control: "select", options: ["default", "sm", "xs"]},
    orientation: {control: "select", options: ["horizontal", "vertical"]},
  },
} satisfies Meta<typeof Attachment>;
export default meta;
type Story = StoryObj<typeof meta>;

const statuses = {
  done: "Ready · 24 KB",
  idle: "Not selected",
  uploading: "Caller reports 45%",
  processing: "Caller is processing",
  error: "Could not prepare file",
} satisfies Record<AttachmentStatus, string>;
const attachmentStatuses = ["done", "idle", "uploading", "processing", "error"] as const satisfies readonly AttachmentStatus[];

export const Default: Story = {
  args: {state: "done", size: "default", orientation: "horizontal"},
  render: (args): React.JSX.Element => (
    <Attachment {...args}>
      <AttachmentMedia>
        <FileText aria-hidden='true' />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle id='attachment-default-title'>Meeting notes.txt</AttachmentTitle>
        <AttachmentDescription>{statuses[args.state ?? "done"]}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentTrigger
        aria-labelledby='attachment-default-title'
        render={<a href='#attachment-preview' />}
      />
      <AttachmentActions>
        <AttachmentAction
          aria-label='Remove meeting notes'
          disabled>
          <X aria-hidden='true' />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
};

export const StatesAndSizes: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyStack}>
      {(["default", "sm", "xs"] as const).map((size) => (
        <AttachmentGroup
          key={size}
          aria-label={`${size} attachments`}>
          {attachmentStatuses.map((state) => (
            <Attachment
              key={state}
              size={size}
              state={state}>
              <AttachmentMedia>
                <FileText aria-hidden='true' />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{state}.txt</AttachmentTitle>
                <AttachmentDescription>{statuses[state]}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Remove ${state} file`}
                  disabled>
                  <X aria-hidden='true' />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      ))}
    </div>
  ),
};

function CallerOwnedAttachment(): React.JSX.Element {
  const [present, setPresent] = React.useState(true);
  const [status, setStatus] = React.useState<AttachmentStatus>("error");
  const [detail, setDetail] = React.useState("Nothing opened");
  return (
    <div className={styles.storyStack}>
      {present ? (
        <Attachment state={status}>
          <AttachmentMedia>
            <FileText aria-hidden='true' />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>Draft.txt</AttachmentTitle>
            <AttachmentDescription>{statuses[status]}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            aria-label='Open draft details'
            onClick={() => setDetail("Draft details opened by the caller")}
          />
          <AttachmentActions>
            <AttachmentAction
              aria-label='Mark draft ready'
              onClick={() => setStatus("done")}>
              <RotateCcw aria-hidden='true' />
            </AttachmentAction>
            <AttachmentAction
              aria-label='Remove draft'
              onClick={() => setPresent(false)}>
              <X aria-hidden='true' />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Attachment state='idle'>
          <AttachmentContent>
            <AttachmentTitle>No attachment selected</AttachmentTitle>
            <AttachmentDescription>The caller removed the draft.</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      )}
      <output aria-live='polite'>{detail}</output>
      <Button
        variant='outline'
        onClick={() => {
          setPresent(true);
          setStatus("error");
          setDetail("Nothing opened");
        }}>
        Reset example
      </Button>
    </div>
  );
}

export const CallerOwnedErrorAndEmpty: Story = {
  render: (): React.JSX.Element => <CallerOwnedAttachment />,
};

export const VerticalImages: Story = {
  render: (): React.JSX.Element => (
    <AttachmentGroup className={styles.storyNarrow}>
      {(["done", "processing", "error"] as const).map((state) => (
        <Attachment
          key={state}
          state={state}
          orientation='vertical'>
          <AttachmentMedia variant='image'>
            <img
              alt='Local one-pixel preview'
              src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>Image.png</AttachmentTitle>
            <AttachmentDescription>{statuses[state]}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Remove ${state} image`}
              disabled>
              <X aria-hidden='true' />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  ),
};

export const LongContentAndRTL: Story = {
  render: (): React.JSX.Element => (
    <AttachmentGroup
      dir='rtl'
      className={styles.storyNarrow}>
      {["مستند-طويل-للغاية-مع-عنوان-كامل.txt", "VeryLongUnbrokenCallerFilenameWithNoSpacesAndItsOriginalExtension.pdf", "Next.txt"].map(
        (name) => (
          <Attachment
            key={name}
            className={styles.storyNarrow}>
            <AttachmentMedia>
              <FileText aria-hidden='true' />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={name}>{name}</AttachmentTitle>
              <AttachmentDescription title='Full caller description remains in the DOM'>
                Full caller description remains in the DOM
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ),
      )}
    </AttachmentGroup>
  ),
};

export const TypedNativeRender: Story = {
  render: (): React.JSX.Element => (
    <Attachment>
      <AttachmentContent>
        <AttachmentTitle>Caller-composed button</AttachmentTitle>
      </AttachmentContent>
      <AttachmentTrigger
        aria-label='Open caller-composed attachment'
        render={(props, state): React.ReactElement => (
          <button
            {...props}
            type='button'
            data-example-slot={state.slot}
          />
        )}
      />
    </Attachment>
  ),
};

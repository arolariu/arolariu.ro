import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "./dialog";
import {Input} from "./input";
import {Label} from "./label";

const meta = {
  title: "Components/Feedback/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>This is a description of what the dialog is about.</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p>Dialog content goes here. You can add any content you need.</p>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Simple: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button variant='outline'>Simple Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

function WithFormDemo() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Dialog>
      <DialogTrigger>
        <Button>Open Form Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information below.</DialogDescription>
        </DialogHeader>
        <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 0"}}>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const WithForm: Story = {
  render: () => <WithFormDemo />,
};

export const Scrollable: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button variant='outline'>Scrollable Content</Button>
      </DialogTrigger>
      <DialogContent style={{maxHeight: "80vh"}}>
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>Please read and accept our terms of service.</DialogDescription>
        </DialogHeader>
        <div style={{overflowY: "auto", maxHeight: "400px", padding: "1rem 0"}}>
          <p style={{marginBottom: "1rem"}}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat.
          </p>
          <p style={{marginBottom: "1rem"}}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
            laborum.
          </p>
          <p style={{marginBottom: "1rem"}}>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem
            aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          <p style={{marginBottom: "1rem"}}>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni
            dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
          <p style={{marginBottom: "1rem"}}>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non
            numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
          </p>
          <p>
            Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid
            ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil
            molestiae consequatur.
          </p>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant='outline'>Decline</Button>
          </DialogClose>
          <Button>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const CustomWidth: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button>Wide Dialog</Button>
      </DialogTrigger>
      <DialogContent style={{maxWidth: "800px", width: "90vw"}}>
        <DialogHeader>
          <DialogTitle>Custom Width Dialog</DialogTitle>
          <DialogDescription>This dialog has a custom maximum width of 800px.</DialogDescription>
        </DialogHeader>
        <div style={{padding: "2rem 0"}}>
          <p>
            This dialog demonstrates how to adjust the width. The content area can accommodate more information or
            wider components like data tables, side-by-side layouts, or detailed forms.
          </p>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

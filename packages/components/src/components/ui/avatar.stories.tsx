import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Avatar, AvatarFallback, AvatarImage} from "./avatar";

const meta = {
  title: "Components/Data Display/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Avatar with a loaded image.
 */
export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop'
        alt='User avatar'
      />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Avatar showing fallback initials when no image is available.
 */
export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        src=''
        alt='User avatar'
      />
      <AvatarFallback>AO</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Multiple avatars displayed in a row.
 */
export const Group: Story = {
  render: () => (
    <div style={{display: "flex", gap: "1rem"}}>
      <Avatar>
        <AvatarImage
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop'
          alt='John Doe'
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage
          src='https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop'
          alt='Jane Smith'
        />
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  ),
};

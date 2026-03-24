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

/**
 * Avatar with online status indicator overlay.
 */
export const WithStatus: Story = {
  render: () => (
    <div style={{position: "relative", display: "inline-block"}}>
      <Avatar>
        <AvatarImage
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop'
          alt='User avatar'
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <span
        style={{
          position: "absolute",
          bottom: "0",
          right: "0",
          width: "14px",
          height: "14px",
          background: "#22c55e",
          border: "2px solid white",
          borderRadius: "50%",
        }}
        aria-label='Online'
      />
    </div>
  ),
};

/**
 * Row of overlapping avatars forming an avatar stack.
 */
export const AvatarStack: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center"}}>
      <div style={{position: "relative", display: "inline-flex"}}>
        <Avatar style={{position: "relative", zIndex: 3, marginRight: "-12px"}}>
          <AvatarImage
            src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop'
            alt='John'
          />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar style={{position: "relative", zIndex: 2, marginRight: "-12px"}}>
          <AvatarImage
            src='https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop'
            alt='Jane'
          />
          <AvatarFallback>JS</AvatarFallback>
        </Avatar>
        <Avatar style={{position: "relative", zIndex: 1, marginRight: "-12px"}}>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar style={{position: "relative", zIndex: 0}}>
          <AvatarFallback>+5</AvatarFallback>
        </Avatar>
      </div>
    </div>
  ),
};

/**
 * Avatars in multiple sizes: small (24px), medium (40px), large (64px).
 */
export const Sizes: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", gap: "1.5rem"}}>
      <Avatar style={{width: "24px", height: "24px", fontSize: "0.625rem"}}>
        <AvatarImage
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=24&h=24&fit=crop'
          alt='Small'
        />
        <AvatarFallback>S</AvatarFallback>
      </Avatar>
      <Avatar style={{width: "40px", height: "40px", fontSize: "0.875rem"}}>
        <AvatarImage
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop'
          alt='Medium'
        />
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar style={{width: "64px", height: "64px", fontSize: "1.25rem"}}>
        <AvatarImage
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop'
          alt='Large'
        />
        <AvatarFallback>L</AvatarFallback>
      </Avatar>
    </div>
  ),
};

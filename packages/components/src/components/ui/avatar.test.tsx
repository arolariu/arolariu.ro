import * as React from "react";

import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

vi.mock("@base-ui/react/avatar", () => ({
  Avatar: {
    Fallback: React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(({children, ...props}, ref) => (
      <span
        ref={ref}
        {...props}>
        {children}
      </span>
    )),
    Image: React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<"img">>((props, ref) => (
      <img
        ref={ref}
        {...props}
      />
    )),
    Root: React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(({children, ...props}, ref) => (
      <span
        ref={ref}
        {...props}>
        {children}
      </span>
    )),
  },
}));

import {Avatar, AvatarFallback, AvatarImage} from "./avatar";

describe("Avatar", () => {
  it("renders Avatar, AvatarImage, and AvatarFallback with className and forwarded refs", () => {
    // Arrange
    const avatarRef = {current: null as HTMLSpanElement | null};
    const imageRef = {current: null as HTMLImageElement | null};
    const fallbackRef = {current: null as HTMLSpanElement | null};

    // Act
    render(
      <Avatar
        ref={avatarRef}
        className='avatar-class'
        data-testid='avatar'>
        <AvatarImage
          ref={imageRef}
          alt='Profile picture'
          className='avatar-image-class'
          src='https://example.com/avatar.png'
        />
        <AvatarFallback
          ref={fallbackRef}
          className='avatar-fallback-class'>
          AO
        </AvatarFallback>
      </Avatar>,
    );

    // Assert
    const avatar = screen.getByTestId("avatar");
    const image = screen.getByAltText("Profile picture");
    const fallback = screen.getByText("AO");

    expect(avatarRef.current).toBe(avatar);
    expect(imageRef.current).toBe(image);
    expect(fallbackRef.current).toBe(fallback);
  });
});

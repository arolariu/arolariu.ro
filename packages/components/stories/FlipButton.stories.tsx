import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FlipButton } from "../dist";
import {
  Check,
  X,
  ShoppingCart,
  CreditCard,
  Gift,
  Heart,
  HeartCrack,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

const meta: Meta<typeof FlipButton> = {
  title: "Design System/Buttons/Flip Button",
  component: FlipButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Flip Button Component**

A custom button component that displays a 3D flipping animation on click, revealing a different 'back' face. Built using the standard \`<Button>\` component and Framer Motion for the animation.

**Core Component:**
*   \`<FlipButton>\`: The main component that wraps the button logic and animation.

**Key Features & Props:**
*   **Flip Animation**: Uses Framer Motion's \`animate\` function and CSS \`rotateY\` transform to create a 3D flip effect when the button is clicked.
*   **Front & Back Content**: Accepts props for content on both faces:
    *   \`frontLabel\`, \`backLabel\`: Text content for each face.
    *   \`frontIcon\`, \`backIcon\`: Optional React node (e.g., lucide icon) for each face.
*   **State Management**: Uses React state (\`useState\`) to track the flipped state (\`isFlipped\`).
*   **Customization**:
    *   \`duration\`: Controls the speed of the flip animation (in seconds).
    *   Inherits \`variant\` and \`size\` props from the underlying \`<Button>\` component for styling.
    *   Accepts standard button props like \`disabled\`, \`onClick\`, \`className\`.
*   **Styling**: Uses CSS perspective and transform styles (\`preserve-3d\`, \`rotateY\`, \`backface-visibility\`) to achieve the 3D effect. The front and back faces are positioned absolutely within the button.

**Technical Details:**
*   Wraps the content in a \`motion.div\` to enable Framer Motion animations.
*   Applies \`transformStyle: "preserve-3d"\` to the main button container.
*   Positions the front and back content absolutely. The back face initially has \`rotateY(180deg)\` and \`backfaceVisibility: "hidden"\`.
*   The \`onClick\` handler toggles the \`isFlipped\` state.
*   A Framer Motion animation targets the inner \`motion.div\`, animating \`rotateY\` to 180deg or 0deg based on the \`isFlipped\` state.
        `,
      },
    },
  },
  argTypes: {
    frontLabel: {
      control: "text",
      description: "Text shown on the front of the button",
    },
    backLabel: {
      control: "text",
      description: "Text shown on the back of the button",
    },
    duration: {
      control: { type: "range", min: 0.2, max: 2, step: 0.1 },
      description: "Duration of the flip animation in seconds",
    },
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
      description: "Button style variant",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
      description: "Button size",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
  },
};

export default meta;

type Story = StoryObj<typeof FlipButton>;

// Basic flip button
export const Basic: Story = {
  args: {
    frontLabel: "Click me",
    backLabel: "Thanks!",
    duration: 0.6,
  },
};

// Flip button with icons
export const WithIcons: Story = {
  render: () => (
    <FlipButton
      frontLabel="Add to cart"
      backLabel="Added!"
      frontIcon={<ShoppingCart className="mr-2 h-4 w-4" />}
      backIcon={<Check className="mr-2 h-4 w-4" />}
      variant="default"
    />
  ),
};

// Flip button variants
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <FlipButton frontLabel="Default" backLabel="Clicked" variant="default" />
      <FlipButton
        frontLabel="Destructive"
        backLabel="Deleted"
        variant="destructive"
      />
      <FlipButton frontLabel="Outline" backLabel="Selected" variant="outline" />
      <FlipButton
        frontLabel="Secondary"
        backLabel="Processed"
        variant="secondary"
      />
      <FlipButton frontLabel="Ghost" backLabel="Boo!" variant="ghost" />
      <FlipButton frontLabel="Link" backLabel="Visited" variant="link" />
    </div>
  ),
};

// Different sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <FlipButton frontLabel="Small" backLabel="Clicked" size="sm" />
      <FlipButton frontLabel="Default" backLabel="Clicked" size="default" />
      <FlipButton frontLabel="Large" backLabel="Clicked" size="lg" />
      <FlipButton
        frontIcon={<Heart className="h-4 w-4" />}
        backIcon={<HeartCrack className="h-4 w-4" />}
        size="icon"
      />
    </div>
  ),
};

// Custom duration
export const CustomDuration: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <div>
        <p className="mb-2 text-center text-sm">Fast (0.3s)</p>
        <FlipButton frontLabel="Quick flip" backLabel="Fast!" duration={0.3} />
      </div>
      <div>
        <p className="mb-2 text-center text-sm">Medium (0.8s)</p>
        <FlipButton
          frontLabel="Medium flip"
          backLabel="Medium"
          duration={0.8}
        />
      </div>
      <div>
        <p className="mb-2 text-center text-sm">Slow (1.5s)</p>
        <FlipButton frontLabel="Slow flip" backLabel="Slow..." duration={1.5} />
      </div>
    </div>
  ),
};

// Payment button example
export const PaymentButton: Story = {
  render: function PaymentButtonExample() {
    const [isPaying, setIsPaying] = React.useState(false);
    const [isComplete, setIsComplete] = React.useState(false);

    const handleClick = () => {
      setIsPaying(true);
      setTimeout(() => {
        setIsComplete(true);
      }, 2000);
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl font-semibold">Total: $42.99</div>
        {!isComplete ? (
          <FlipButton
            frontLabel="Pay now"
            frontIcon={<CreditCard className="mr-2 h-4 w-4" />}
            backLabel="Processing..."
            backIcon={
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            }
            onClick={handleClick}
            flipped={isPaying}
            disabled={isPaying}
            className="w-40"
          />
        ) : (
          <FlipButton
            frontLabel="Paid!"
            frontIcon={<Check className="mr-2 h-4 w-4" />}
            backLabel="Thank you"
            backIcon={<Gift className="mr-2 h-4 w-4" />}
            flipped={false}
            className="w-40 bg-green-600 hover:bg-green-700"
          />
        )}
      </div>
    );
  },
};

// Like/Dislike button
export const LikeDislike: Story = {
  render: function LikeDislikeExample() {
    const [liked, setLiked] = React.useState<boolean | null>(null);

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-xl font-semibold">Rate this article</div>
        <div className="flex gap-4">
          <FlipButton
            frontIcon={<ThumbsUp className="h-5 w-5" />}
            backIcon={<Check className="h-5 w-5" />}
            size="icon"
            flipped={liked === true}
            onClick={() => setLiked(true)}
            className={liked === true ? "bg-green-600 hover:bg-green-700" : ""}
          />
          <FlipButton
            frontIcon={<ThumbsDown className="h-5 w-5" />}
            backIcon={<X className="h-5 w-5" />}
            size="icon"
            flipped={liked === false}
            onClick={() => setLiked(false)}
            className={liked === false ? "bg-red-600 hover:bg-red-700" : ""}
          />
        </div>
        {liked !== null && (
          <div className="text-sm text-gray-500">
            {liked
              ? "Thanks for your positive feedback!"
              : "Thanks for your feedback. We'll try to improve."}
          </div>
        )}
      </div>
    );
  },
};

// Custom styled flip button
export const CustomStyled: Story = {
  render: () => (
    <FlipButton
      frontLabel="SUBSCRIBE"
      backLabel="SUBSCRIBED"
      frontIcon={<Heart className="mr-2 h-4 w-4" />}
      backIcon={<Check className="mr-2 h-4 w-4" />}
      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
      backClassName="bg-gradient-to-r from-green-500 to-teal-500 text-white"
    />
  ),
};

// Multi-state flip button
export const MultiState: Story = {
  render: function MultiStateExample() {
    const [state, setState] = React.useState(0);
    const states = [
      { label: "Start", icon: <div className="mr-2">🚀</div> },
      {
        label: "Loading",
        icon: (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ),
      },
      { label: "Complete", icon: <Check className="mr-2 h-4 w-4" /> },
      { label: "Reset", icon: <div className="mr-2">🔄</div> },
    ];

    const currentState = states[state % states.length];
    const nextState = states[(state + 1) % states.length];

    return (
      <FlipButton
        frontLabel={currentState.label}
        frontIcon={currentState.icon}
        backLabel={nextState.label}
        backIcon={nextState.icon}
        duration={0.5}
        flipped={state % 2 === 1}
        onClick={() => setState(state + 1)}
        className={state === 2 ? "bg-green-600 hover:bg-green-700" : ""}
      />
    );
  },
};

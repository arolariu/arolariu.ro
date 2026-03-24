import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "./card";

const meta = {
  title: "Components/Data Display/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content area where you can put any content.</p>
      </CardContent>
      <CardFooter>
        <p className='text-sm text-gray-500'>Card footer</p>
      </CardFooter>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
        <CardDescription>A card without a footer</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content without footer section.</p>
      </CardContent>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card>
      <CardContent>
        <p>A minimal card with just content.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with a header image.
 */
function CardWithImage(): React.JSX.Element {
  return (
    <Card style={{maxWidth: "400px"}}>
      <div
        style={{
          width: "100%",
          height: "200px",
          backgroundColor: "#e5e7eb",
          backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}></div>
      <CardHeader>
        <CardTitle>Mountain Landscape</CardTitle>
        <CardDescription>Beautiful scenery from the mountains</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{fontSize: "14px", color: "#4b5563"}}>
          Experience breathtaking views and pristine nature in this stunning mountain location.
        </p>
      </CardContent>
      <CardFooter>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}>
          View Details
        </button>
      </CardFooter>
    </Card>
  );
}

export const WithImage: Story = {
  render: () => <CardWithImage />,
};

/**
 * Interactive card with hover effect.
 */
function InteractiveCard(): React.JSX.Element {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Card
      style={{
        maxWidth: "400px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered
          ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Hover over this card to see the effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card responds to hover interactions with smooth animations.</p>
      </CardContent>
      <CardFooter style={{color: "#6b7280", fontSize: "12px"}}>Click to explore</CardFooter>
    </Card>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveCard />,
};

/**
 * Card showing skeleton loading state.
 */
function LoadingCard(): React.JSX.Element {
  return (
    <Card style={{maxWidth: "400px"}}>
      <CardHeader>
        <div
          style={{
            width: "60%",
            height: "24px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            marginBottom: "8px",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}></div>
        <div
          style={{
            width: "80%",
            height: "16px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}></div>
      </CardHeader>
      <CardContent>
        <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
          <div
            style={{
              width: "100%",
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}></div>
          <div
            style={{
              width: "90%",
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}></div>
          <div
            style={{
              width: "75%",
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}></div>
        </div>
      </CardContent>
      <CardFooter>
        <div
          style={{
            width: "100px",
            height: "36px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}></div>
      </CardFooter>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Card>
  );
}

export const Loading: Story = {
  render: () => <LoadingCard />,
};

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
  Button,
} from "../dist";
import { GripVertical } from "lucide-react";

const meta: Meta<typeof ResizablePanelGroup> = {
  title: "Design System/Resizable",
  component: ResizablePanelGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Resizable Components**

A set of components for creating layouts with panels that can be resized by dragging handles between them. Built upon the \`react-resizable-panels\` library.

**Core Components (from \`react-resizable-panels\`):**
*   \`<ResizablePanelGroup>\`: The root container that manages the layout and state of its child panels and handles. Requires a \`direction\` prop ('horizontal' or 'vertical'). Accepts props like \`onLayout\` (callback with panel sizes), \`autoSaveId\` (for persisting layout to localStorage).
*   \`<ResizablePanel>\`: Represents a single panel within the group. Accepts props like \`defaultSize\` (initial size percentage), \`minSize\`, \`maxSize\` (constraints in percentage), \`order\`, \`collapsible\`, \`onCollapse\`, \`onExpand\`.
*   \`<ResizableHandle>\`: The draggable divider element placed between two \`<ResizablePanel>\` components. Accepts a \`withHandle\` prop to render a visual grabber indicator inside. Handles drag events to resize adjacent panels. Accepts \`disabled\` and \`onDragging\` props.

**Key Features:**
*   **Directional Layout**: Supports both horizontal (side-by-side) and vertical (stacked) panel arrangements via the \`direction\` prop on the group.
*   **Size Control**: Allows setting default sizes, minimum/maximum size constraints for panels. Sizes are typically specified in percentages.
*   **Drag Interaction**: Provides draggable handles for users to intuitively resize panels.
*   **Persistence**: Can automatically save and restore layout configurations to \`localStorage\` using the \`autoSaveId\` prop.
*   **Collapsible Panels**: Supports making panels collapsible down to a minimum size or completely hidden.
*   **Accessibility**: \`react-resizable-panels\` includes keyboard support (Arrow keys, Home, End) for resizing handles when focused.

See the [shadcn/ui Resizable documentation](https://ui.shadcn.com/docs/components/resizable) and the [react-resizable-panels documentation](https://react-resizable-panels.vercel.app/) for comprehensive details and advanced usage.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ResizablePanelGroup>;

// Basic horizontal resizable panels
export const BasicHorizontal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates a horizontal ResizablePanelGroup. Panels are arranged side-by-side, and the vertical handle allows resizing their widths.",
      },
    },
  },
  render: () => (
    <div className="h-[500px] max-w-[800px] rounded-lg border">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Main Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

// Basic vertical resizable panels
export const BasicVertical: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates a vertical ResizablePanelGroup. Panels are stacked vertically, and the horizontal handle allows resizing their heights.",
      },
    },
  },
  render: () => (
    <div className="h-[500px] max-w-[800px] rounded-lg border">
      <ResizablePanelGroup
        direction="vertical"
        className="h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={25} minSize={15}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Header</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Content</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={15}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Footer</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

// Multiple resizable panels
export const MultipleResizablePanels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An example of nesting ResizablePanelGroups to create more complex, multi-dimensional resizable layouts.",
      },
    },
  },
  render: () => (
    <div className="h-[500px] max-w-[800px] rounded-lg border">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-900">
            <div className="p-4 font-medium">Navigation</div>
            <div className="flex-1 overflow-auto p-4">
              <nav className="grid gap-2">
                <a
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Products
                </a>
                <a
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Customers
                </a>
                <a
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Orders
                </a>
                <a
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Settings
                </a>
              </nav>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70}>
              <div className="flex h-full flex-col">
                <div className="border-b p-4 font-medium">Main Content</div>
                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Dashboard</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      This is the main content area. You can resize both the
                      sidebar and the details panel to customize your workspace.
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Drag the handles to resize the panels.
                    </p>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30}>
              <div className="flex h-full flex-col">
                <div className="border-b p-4 font-medium">Console</div>
                <div className="flex-1 overflow-auto p-4 bg-neutral-900 text-neutral-200 font-mono text-sm">
                  <div className="space-y-2">
                    <div> System initialized</div>
                    <div> Loading components</div>
                    <div> Ready</div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-900">
            <div className="p-4 font-medium">Details</div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Selected Item</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    None
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Size</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    --
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Last Modified</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    --
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

// IDE Layout
export const IDELayout: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates setting initial default sizes for the panels within the ResizablePanelGroup.",
      },
    },
  },
  render: () => (
    <div className="h-[600px] max-w-[1200px] rounded-lg border">
      <ResizablePanelGroup
        direction="vertical"
        className="h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={10} minSize={8}>
          <div className="flex h-full items-center bg-neutral-100 px-4 dark:bg-neutral-800">
            <div className="flex w-full justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="font-mono text-sm text-neutral-600 dark:text-neutral-300">
                MyProject.tsx
              </div>
              <div className="w-16" />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="flex h-full flex-col bg-neutral-100 dark:bg-neutral-800">
                <div className="p-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  EXPLORER
                </div>
                <div className="flex-1 p-2">
                  <div className="space-y-1">
                    <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                      📁 src
                    </div>
                    <div className="pl-4 space-y-1">
                      <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                        📁 components
                      </div>
                      <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                        📁 pages
                      </div>
                      <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                        📄 App.tsx
                      </div>
                      <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                        📄 main.tsx
                      </div>
                    </div>
                    <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                      📄 package.json
                    </div>
                    <div className="font-mono text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-1 rounded">
                      📄 tsconfig.json
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={60}>
              <div className="h-full bg-white p-4 dark:bg-neutral-900">
                <pre className="font-mono text-sm">
                  <span className="text-neutral-500">1</span>{" "}
                  <span className="text-blue-500">import</span>{" "}
                  <span className="text-neutral-200">React</span>{" "}
                  <span className="text-blue-500">from</span>{" "}
                  <span className="text-amber-400">"react"</span>;<br />
                  <span className="text-neutral-500">2</span> <br />
                  <span className="text-neutral-500">3</span>{" "}
                  <span className="text-blue-500">export</span>{" "}
                  <span className="text-blue-500">default</span>{" "}
                  <span className="text-blue-500">function</span>{" "}
                  <span className="text-green-400">App</span>() {"{"}
                  <br />
                  <span className="text-neutral-500">4</span>{" "}
                  <span className="text-blue-500">return</span> (<br />
                  <span className="text-neutral-500">5</span>{" "}
                  <span className="text-amber-400">&lt;div</span>{" "}
                  <span className="text-green-400">className</span>=
                  <span className="text-amber-400">"App"</span>
                  <span className="text-amber-400">&gt;</span>
                  <br />
                  <span className="text-neutral-500">6</span>{" "}
                  <span className="text-amber-400">&lt;header</span>{" "}
                  <span className="text-green-400">className</span>=
                  <span className="text-amber-400">"App-header"</span>
                  <span className="text-amber-400">&gt;</span>
                  <br />
                  <span className="text-neutral-500">7</span>{" "}
                  <span className="text-amber-400">&lt;h1&gt;</span>Hello World
                  <span className="text-amber-400">&lt;/h1&gt;</span>
                  <br />
                  <span className="text-neutral-500">8</span>{" "}
                  <span className="text-amber-400">&lt;/header&gt;</span>
                  <br />
                  <span className="text-neutral-500">9</span>{" "}
                  <span className="text-amber-400">&lt;/div&gt;</span>
                  <br />
                  <span className="text-neutral-500">10</span> );
                  <br />
                  <span className="text-neutral-500">11</span> {"}"}
                  <br />
                </pre>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={20}>
              <div className="flex h-full flex-col">
                <div className="border-b p-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  PROBLEMS
                </div>
                <div className="flex-1 p-2">
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
                    No problems detected
                  </div>
                </div>
                <div className="border-t p-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  OUTPUT
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={15} minSize={10}>
          <div className="flex h-full flex-col bg-neutral-100 dark:bg-neutral-800">
            <div className="border-b p-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
              TERMINAL
            </div>
            <div className="flex-1 overflow-auto p-2">
              <pre className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                $ npm start
                <br />
                <span className="text-green-500">
                  Starting development server...
                </span>
                <br />
                <span className="text-green-500">Compiled successfully!</span>
                <br />
                <br />
                You can now view my-app in the browser.
                <br />
                <br />
                Local: http://localhost:3000
                <br />
                On Your Network: http://192.168.1.5:3000
                <br />
                <br />
                Note that the development build is not optimized.
                <br />
                To create a production build, use npm run build.
                <br />
                <br />
                webpack compiled{" "}
                <span className="text-green-500">successfully</span>
                <br />
              </pre>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

// Custom Handle
export const CustomHandle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows a ResizablePanelGroup with a visible handle that includes grabber dots for better visual indication of the draggable area.",
      },
    },
  },
  render: () => (
    <div className="h-[400px] max-w-[800px] rounded-lg border">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <h3 className="mb-2 font-semibold">Sidebar</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                This panel has a custom resize handle
              </p>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle>
          <div className="flex h-full w-6 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
            <GripVertical className="h-4 w-4 text-neutral-500" />
          </div>
        </ResizableHandle>
        <ResizablePanel defaultSize={70}>
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <h3 className="mb-2 font-semibold">Content</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Try resizing using the custom handle
              </p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

// Collapsible panels with cards
export const CollapsiblePanels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows a panel within the group that can be collapsed to a minimum size (or zero) and potentially expanded again.",
      },
    },
  },
  render: function CollapsiblePanelsExample() {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
      <div className="h-[400px] max-w-[800px] rounded-lg border">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-lg border"
        >
          <ResizablePanel
            defaultSize={30}
            minSize={15}
            collapsible
            collapsedSize={5}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
            className={
              isCollapsed
                ? "min-w-12 transition-all duration-300 ease-in-out"
                : "transition-all duration-300 ease-in-out"
            }
          >
            <div className="flex h-full flex-col">
              <div className="flex h-12 items-center justify-center border-b">
                {isCollapsed ? (
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsCollapsed(false)}
                  >
                    <span className="sr-only">Expand</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                ) : (
                  <div className="px-4 font-medium">Sidebar</div>
                )}
              </div>
              <div className={isCollapsed ? "hidden" : "p-4"}>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="p-2">
                      <CardTitle className="text-sm">Item 1</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 text-xs">
                      <p>This is collapsible</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-2">
                      <CardTitle className="text-sm">Item 2</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 text-xs">
                      <p>Try the collapse button</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="flex h-full flex-col">
              <div className="flex h-12 items-center border-b px-4 font-medium">
                Content
              </div>
              <div className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Main Content</CardTitle>
                    <CardDescription>
                      The sidebar panel can be collapsed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      This example shows a collapsible panel. Try clicking the
                      button in the sidebar header to collapse it. When
                      collapsed, it takes minimal space but remains accessible.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                      {isCollapsed ? "Expand" : "Collapse"} Sidebar
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
};

import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Button,
  Checkbox,
  Badge,
} from "../dist";
import { ArrowUpDown, MoreHorizontal, ChevronDown, Check } from "lucide-react";

const meta: Meta<typeof Table> = {
  title: "Design System/Table",
  component: Table,
  parameters: {
    layout: "padded", // Use padded layout for tables
    docs: {
      description: {
        component: `
**Table Component**

Renders data in a standard HTML tabular format, applying consistent styling. Uses native HTML table elements (\`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tfoot>\`, \`<tr>\`, \`<th>\`, \`<td>\`, \`<caption>\`) wrapped with styled components.

**Core Components:**
*   \`<Table>\`: The main container, rendering an HTML \`<table>\` element with base styling.
*   \`<TableHeader>\`: Renders an HTML \`<thead>\` element to group header content.
*   \`<TableBody>\`: Renders an HTML \`<tbody>\` element to group the main data rows.
*   \`<TableFooter>\`: Renders an HTML \`<tfoot>\` element to group footer content (e.g., totals, summaries).
*   \`<TableRow>\`: Renders an HTML \`<tr>\` element representing a single row within the header, body, or footer. Includes hover effects and borders.
*   \`<TableHead>\`: Renders an HTML \`<th>\` element, typically used within \`<TableHeader>\`. Represents a header cell. Styled with font weight and alignment.
*   \`<TableCell>\`: Renders an HTML \`<td>\` element, used within \`<TableBody>\` or \`<TableFooter>\`. Represents a standard data cell. Styled with padding and alignment.
*   \`<TableCaption>\`: Renders an HTML \`<caption>\` element, providing a title or description for the table. Positioned below the table by default.

**Key Features:**
*   **Semantic HTML**: Uses standard HTML table elements for structure and accessibility.
*   **Styling**: Applies consistent padding, borders, alignment, and hover states using Tailwind CSS utility classes.
*   **Composition**: Follows standard HTML table structure, allowing for flexible composition of headers, bodies, footers, rows, and cells.
*   **Accessibility**: Relies on the inherent accessibility of native HTML table elements. Proper use of \`<th>\` with \`scope\` attributes (implicitly handled by placement in \`<thead>\`) and \`<caption>\` enhances screen reader support.

See the [shadcn/ui Table documentation](https://ui.shadcn.com/docs/components/table) for more details and examples of usage with data mapping, sorting, and selection.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Table>;

// Sample data for tables
const invoices = [
  {
    id: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    id: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    id: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    id: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    id: "INV005",
    paymentStatus: "Pending",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
];

const users = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "User",
    status: "Active",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "User",
    status: "Inactive",
  },
  {
    id: "4",
    name: "Alice Williams",
    email: "alice@example.com",
    role: "Editor",
    status: "Active",
  },
];

const products = [
  {
    id: "PROD001",
    name: "Widget Pro",
    stock: 12,
    price: "$99.00",
    category: "Electronics",
  },
  {
    id: "PROD002",
    name: "Gadget Lite",
    stock: 0,
    price: "$49.00",
    category: "Electronics",
  },
  {
    id: "PROD003",
    name: "Super Notebook",
    stock: 34,
    price: "$19.00",
    category: "Office",
  },
  {
    id: "PROD004",
    name: "Premium Chair",
    stock: 8,
    price: "$249.00",
    category: "Furniture",
  },
];

// Basic table
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A basic Table displaying invoice data with a header, body, and caption. Demonstrates standard table structure and cell rendering.",
      },
    },
  },
  render: () => (
    <div className="rounded-md border w-[600px]">
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.id}</TableCell>
              <TableCell>{invoice.paymentStatus}</TableCell>
              <TableCell>{invoice.paymentMethod}</TableCell>
              <TableCell className="text-right">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

// Table with custom styling
export const CustomStyling: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates adding striped rows to the Table for improved readability using CSS classes on `TableRow`.",
      },
    },
  },
  render: () => (
    <div className="rounded-md border w-[600px]">
      <Table>
        <TableHeader className="bg-neutral-100 dark:bg-neutral-800">
          <TableRow className="hover:bg-transparent border-0">
            <TableHead className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
              Invoice
            </TableHead>
            <TableHead className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
              Status
            </TableHead>
            <TableHead className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
              Method
            </TableHead>
            <TableHead className="text-center font-semibold text-neutral-700 dark:text-neutral-300">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice, index) => (
            <TableRow
              key={invoice.id}
              className={
                index % 2 === 0
                  ? "bg-white dark:bg-neutral-950"
                  : "bg-neutral-50 dark:bg-neutral-900"
              }
            >
              <TableCell className="font-medium text-center">
                {invoice.id}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    invoice.paymentStatus === "Paid"
                      ? "default"
                      : invoice.paymentStatus === "Pending"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {invoice.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {invoice.paymentMethod}
              </TableCell>
              <TableCell className="text-center font-mono">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-center font-mono font-semibold">
              $1,750.00
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  ),
};

// Table with selection
export const WithSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows a Table where rows highlight on hover, providing visual feedback.",
      },
    },
  },
  render: () => (
    <div className="rounded-md border w-[700px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox aria-label="Select all" />
            </TableHead>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Checkbox aria-label={`Select ${user.name}`} />
              </TableCell>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <Badge
                    variant={user.status === "Active" ? "default" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

// Table with sortable headers
export const SortableColumns: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Table with visible borders around the table and its cells.",
      },
    },
  },
  render: () => (
    <div className="rounded-md border w-[700px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                Product
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                Category
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                Stock
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                Price
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>
                <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </Badge>
              </TableCell>
              <TableCell>{product.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

// Table with expandable rows
export const ExpandableRows: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates a more compact Table layout with reduced cell padding.",
      },
    },
  },
  render: function ExpandableTable() {
    const [expandedRows, setExpandedRows] = React.useState<
      Record<string, boolean>
    >({});

    const toggleRow = (id: string) => {
      setExpandedRows((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    };

    return (
      <div className="rounded-md border w-[700px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <React.Fragment key={invoice.id}>
                <TableRow>
                  <TableCell className="w-[50px]">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRow(invoice.id)}
                      aria-label={`${
                        expandedRows[invoice.id] ? "Collapse" : "Expand"
                      } row`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedRows[invoice.id] ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.paymentStatus === "Paid"
                          ? "default"
                          : invoice.paymentStatus === "Pending"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {invoice.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{invoice.paymentMethod}</TableCell>
                  <TableCell className="text-right">
                    {invoice.totalAmount}
                  </TableCell>
                </TableRow>
                {expandedRows[invoice.id] && (
                  <TableRow className="bg-neutral-50 dark:bg-neutral-900">
                    <TableCell></TableCell>
                    <TableCell colSpan={4} className="p-4">
                      <div className="text-sm space-y-2">
                        <p>
                          <strong>Invoice Details</strong>
                        </p>
                        <p>Date: April 30, 2025</p>
                        <p>Customer: John Doe</p>
                        <p>Description: Payment for services rendered</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};

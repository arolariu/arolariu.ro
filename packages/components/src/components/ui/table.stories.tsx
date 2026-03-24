import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./table";

const meta = {
  title: "Components/Data Display/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic table with header and body.
 */
export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
          <TableCell>Admin</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@example.com</TableCell>
          <TableCell>User</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Bob Johnson</TableCell>
          <TableCell>bob@example.com</TableCell>
          <TableCell>User</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/**
 * Table with caption.
 */
export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent invoices for January 2024</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className='text-right'>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>INV-001</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell className='text-right'>$250.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>INV-002</TableCell>
          <TableCell>Pending</TableCell>
          <TableCell className='text-right'>$150.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/**
 * Table with footer.
 */
export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className='text-right'>Quantity</TableHead>
          <TableHead className='text-right'>Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Widget A</TableCell>
          <TableCell className='text-right'>5</TableCell>
          <TableCell className='text-right'>$50.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Widget B</TableCell>
          <TableCell className='text-right'>3</TableCell>
          <TableCell className='text-right'>$30.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className='text-right'>$80.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/**
 * Table with alternating row colors (striped).
 */
function StripedTable(): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow style={{backgroundColor: "#f9fafb"}}>
          <TableCell>Alice Johnson</TableCell>
          <TableCell>Engineering</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Bob Smith</TableCell>
          <TableCell>Marketing</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow style={{backgroundColor: "#f9fafb"}}>
          <TableCell>Carol White</TableCell>
          <TableCell>Sales</TableCell>
          <TableCell>Away</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>David Brown</TableCell>
          <TableCell>Support</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow style={{backgroundColor: "#f9fafb"}}>
          <TableCell>Emma Davis</TableCell>
          <TableCell>Engineering</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export const Striped: Story = {
  render: () => <StripedTable />,
};

/**
 * Table with tighter padding (compact variant).
 */
function CompactTable(): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead style={{padding: "6px 12px"}}>ID</TableHead>
          <TableHead style={{padding: "6px 12px"}}>Name</TableHead>
          <TableHead style={{padding: "6px 12px"}}>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell style={{padding: "6px 12px"}}>001</TableCell>
          <TableCell style={{padding: "6px 12px"}}>John Doe</TableCell>
          <TableCell style={{padding: "6px 12px"}}>john@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{padding: "6px 12px"}}>002</TableCell>
          <TableCell style={{padding: "6px 12px"}}>Jane Smith</TableCell>
          <TableCell style={{padding: "6px 12px"}}>jane@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{padding: "6px 12px"}}>003</TableCell>
          <TableCell style={{padding: "6px 12px"}}>Bob Johnson</TableCell>
          <TableCell style={{padding: "6px 12px"}}>bob@example.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export const Compact: Story = {
  render: () => <CompactTable />,
};

/**
 * Table rows with action buttons.
 */
function TableWithActions(): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead style={{textAlign: "right"}}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>Admin</TableCell>
          <TableCell>Active</TableCell>
          <TableCell style={{textAlign: "right"}}>
            <div style={{display: "flex", gap: "8px", justifyContent: "flex-end"}}>
              <button
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}>
                Edit
              </button>
              <button
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  border: "1px solid #dc2626",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  color: "#dc2626",
                  cursor: "pointer",
                }}>
                Delete
              </button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>User</TableCell>
          <TableCell>Active</TableCell>
          <TableCell style={{textAlign: "right"}}>
            <div style={{display: "flex", gap: "8px", justifyContent: "flex-end"}}>
              <button
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}>
                Edit
              </button>
              <button
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  border: "1px solid #dc2626",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  color: "#dc2626",
                  cursor: "pointer",
                }}>
                Delete
              </button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export const WithActions: Story = {
  render: () => <TableWithActions />,
};

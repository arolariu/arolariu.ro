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

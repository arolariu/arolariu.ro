/** @format */

"use client";

import {type Product, ProductCategory} from "@/types/invoices";
import {
  Button,
  Cell,
  Column,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  Row,
  Table,
  TableBody,
  TableHeader,
  Text,
} from "react-aria-components";

/**
 * This function renders the edit invoice item card.
 * @returns The JSX for the edit invoice item card.
 */
export default function ProductCard({item}: Readonly<{item: Product}>) {
  // TODO: Implement the edit invoice item (product) card.
  const itemState = item;
  const isModified = itemState !== item;

  const capitalizeFirst15Words = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className='m-4 flex flex-col rounded-lg border border-gray-800 p-4 font-semibold dark:border-gray-200'>
      <Table className='table table-xs text-center'>
        <TableHeader>
          <Column className='text-center'>Attribute</Column>
          <Column className='text-center'>Value</Column>
        </TableHeader>
        <TableBody>
          <Row>
            <Cell>Raw Name</Cell>
            <Cell
              className='tooltip tooltip-top'
              data-tip={itemState.rawName}>
              {capitalizeFirst15Words(itemState.rawName)}
            </Cell>
          </Row>
          <Row>
            <Cell>Generic Name</Cell>
            <Cell
              className='tooltip tooltip-bottom'
              data-tip={itemState.genericName}>
              {capitalizeFirst15Words(itemState.genericName)}
            </Cell>
          </Row>
          <Row>
            <Cell>Category</Cell>
            <Cell>{ProductCategory[itemState.category]}</Cell>
          </Row>
          <Row>
            <Cell>Quantity</Cell>
            <Cell>{itemState.quantity}</Cell>
          </Row>
          <Row>
            <Cell>Quantity Unit</Cell>
            <Cell>{itemState.quantityUnit}</Cell>
          </Row>
          <Row>
            <Cell>Price</Cell>
            <Cell>{itemState.price}</Cell>
          </Row>
          <Row>
            <Cell>Total Price</Cell>
            <Cell>{itemState.price * itemState.quantity}</Cell>
          </Row>
          <Row>
            <Cell>Product Code</Cell>
            <Cell>{itemState.productCode}</Cell>
          </Row>
        </TableBody>
      </Table>
      <div className='mx-auto mt-4 flex flex-row gap-4'>
        {isModified ? (
          <DialogTrigger>
            <Button className='btn btn-primary mb-4 font-black'>✅ Save Changes</Button>
            <Modal>
              <Dialog>
                <Heading>Save Item</Heading>
                <Text>
                  You can edit the item details here. <br />
                  Make sure to save or discard your changes.
                </Text>
                <Button
                  slot='close'
                  type='submit'
                  className='btn btn-success'>
                  💾 Save item changes
                </Button>
              </Dialog>
            </Modal>
          </DialogTrigger>
        ) : null}
        <DialogTrigger>
          <Button className='mb-4 font-black'>⚠️ Delete Item</Button>
          <Modal>
            <Dialog>
              <Heading className='mb-4'>⚠️ WARNING: Delete Item</Heading>
              <Text>
                This action is irreversible. <br />
                Deleting this item will remove it from the invoice.
              </Text>
              <Button
                type='submit'
                className='btn btn-warning'>
                🗑️ Delete item
              </Button>
            </Dialog>
          </Modal>
        </DialogTrigger>
      </div>
    </div>
  );
}

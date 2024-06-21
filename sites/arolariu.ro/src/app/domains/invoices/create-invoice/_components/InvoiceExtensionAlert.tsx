/** @format */

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

export default function InvoiceExtensionAlert() {
  return (
    <section className='alert alert-warning mx-auto flex w-1/2 flex-col items-center justify-center justify-items-center'>
      <article className='text-center'>
        The uploaded file is not a valid image or PDF. Please upload a valid scan/photo or a protected document file
        (PDF) of the receipt.
      </article>
      <article className='text-start'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supported file types (extensions)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='text-center'>
            <TableRow>
              <TableCell>image/jpeg</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>image/jpg</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>image/png</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>application/pdf</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </article>
    </section>
  );
}

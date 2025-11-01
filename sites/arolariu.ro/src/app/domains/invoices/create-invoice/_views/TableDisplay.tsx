import {Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useState} from "react";
import {TbEdit, TbRotateClockwise, TbTrash} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Table display component for invoice scans.
 * Displays scans in a table format without media preview.
 * @returns JSX.Element that displays a table of invoice scans.
 */
export default function TableDisplay(): React.JSX.Element | null {
  const {scans, rotateScan, renameScan, removeScan} = useInvoiceCreator();
  const [query, setQuery] = useState("");

  const filteredScans = scans.filter((scan) => 
    scan.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleRotate = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      rotateScan(id, 90);
    },
    [rotateScan],
  );

  const handleRename = useCallback(
    (scan: {id: string; name: string}) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const newName = prompt("Enter new filename:", scan.name);
      if (newName) {
        renameScan(scan.id, newName);
      }
    },
    [renameScan],
  );

  const handleDelete = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      removeScan(id);
    },
    [removeScan],
  );

  if (scans.length === 0) {
    return null;
  }

  return (
    <>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div className='flex-1'>
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder='Search by filename...'
            className='border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
            aria-label='Search uploads'
          />
        </div>
        <div className='shrink-0 text-sm text-gray-600 dark:text-gray-400'>
          {filteredScans.length} of {scans.length} shown
        </div>
      </div>

      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.3}}
        className='rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12'>#</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScans.map((scan, index) => (
              <TableRow key={scan.id}>
                <TableCell className='font-medium'>{index + 1}</TableCell>
                <TableCell className='max-w-xs truncate font-medium'>
                  {scan.name}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    scan.type === "pdf" 
                      ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}>
                    {scan.type.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>{(scan.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                <TableCell>
                  {scan.uploadedAt.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-2'>
                    <TooltipProvider>
                      {scan.type === "image" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 w-8 cursor-pointer p-0'
                              onClick={handleRotate(scan.id)}
                              disabled={scan.isProcessing}>
                              <TbRotateClockwise className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rotate 90°</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 w-8 cursor-pointer p-0'
                            onClick={handleRename(scan)}
                            disabled={scan.isProcessing}>
                            <TbEdit className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rename file</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300'
                            onClick={handleDelete(scan.id)}
                            disabled={scan.isProcessing}>
                            <TbTrash className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete file</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </>
  );
}

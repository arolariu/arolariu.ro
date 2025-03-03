/** @format */
"use client";

import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import Link from "next/link";
import {useCallback} from "react";
import {FaExternalLinkAlt} from "react-icons/fa";
import {TbPackage} from "react-icons/tb";

type Props = {packages: NodePackagesJSON};

function PackageBadge({type}: {type: "production" | "development" | "peer"}) {
  return type === "production" ? (
    <span className='rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 transition-colors duration-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800'>
      Production
    </span>
  ) : (
    <span className='rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors duration-200 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800'>
      Development
    </span>
  );
}

function DependenciesDialog({pkg}: {pkg: NodePackageInformation}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'>
          View Dependencies
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{pkg.name} Dependencies</DialogTitle>
          <DialogDescription>This package has {pkg.dependents?.length ?? "0"} dependencies.</DialogDescription>
        </DialogHeader>
        <div className='max-h-[300px] overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pkg.dependents?.map((dep) => (
                <TableRow key={dep.name}>
                  <TableCell>{dep.name}</TableCell>
                  <TableCell>{dep.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The component shows counts and percentages for production, development, and peer dependencies,
 * as well as the total number of type definition packages.
 *
 * @returns A table displaying package statistics by dependency type
 */
export default function PackagesTable({packages}: Readonly<Props>) {
  const productionPackages = packages.production ?? [];
  const developmentPackages = packages.development ?? [];
  const peerPackages = packages.peer ?? [];

  const extractPackageType = useCallback(
    (pkg: {name: string}) => {
      if (productionPackages.some((p) => p.name === pkg.name)) {
        return "production";
      }
      if (developmentPackages.some((p) => p.name === pkg.name)) {
        return "development";
      }
      return "peer";
    },
    [productionPackages, developmentPackages],
  );

  const totalPackages = productionPackages.length + developmentPackages.length + peerPackages.length;
  const flatPackages = Object.values(packages).flat();

  return (
    <div className='container mx-auto max-w-7xl py-10 text-black'>
      <Tabs
        defaultValue='grid'
        className='w-full'>
        <TabsList className='mx-auto mb-8 grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='grid'>Grid View</TabsTrigger>
          <TabsTrigger value='table'>Table View</TabsTrigger>
        </TabsList>

        <div className='min-h-[600px]'>
          <TabsContent
            value='grid'
            className='w-full'>
            <div className='grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
              {flatPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.name + pkg.version}
                  initial={{opacity: 0, y: 20}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.3, delay: index * 0.1}}>
                  <Card className='h-full'>
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-xl'>{pkg.name}</CardTitle>
                        <span className='bg-muted rounded-full px-2 py-1 text-xs'>{pkg.version}</span>
                      </div>
                      <div className='mt-2 flex items-center'>
                        <PackageBadge type={extractPackageType(pkg)} />
                      </div>
                      <CardDescription>{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='flex flex-col space-y-2'>
                        <div className='flex items-center text-sm'>
                          <span className='mr-2 font-medium'>License:</span> {pkg.license}
                        </div>
                        <div className='flex items-center text-sm'>
                          <span className='mr-2 font-medium'>Dependencies: {pkg.dependents?.length ?? "N/A"}</span>
                        </div>
                        <div className='mt-4 flex items-center justify-between'>
                          <Link
                            href={pkg.homepage}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-muted-foreground flex items-center text-sm transition-colors hover:text-primary'>
                            <FaExternalLinkAlt className='mr-1 h-4 w-4' />
                            <span>Website</span>
                          </Link>
                          <DependenciesDialog pkg={pkg} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value='table'>
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.5}}
              className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className='hidden md:table-cell'>Description</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Depedendencies</TableHead>
                    <TableHead>Website</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flatPackages.map((pkg) => (
                    <TableRow key={pkg.name + pkg.version}>
                      <TableCell className='font-medium'>{pkg.name}</TableCell>
                      <TableCell>{pkg.version}</TableCell>
                      <TableCell className='hidden max-w-md md:table-cell'>{pkg.description}</TableCell>
                      <TableCell>{pkg.license}</TableCell>
                      <TableCell>
                        <DependenciesDialog pkg={pkg} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={pkg.homepage}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:bg-muted rounded-md p-2 transition-colors'
                          title='Website'>
                          <FaExternalLinkAlt className='h-4 w-4' />
                          <span className='sr-only'>Website</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>

      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.5, delay: 0.5}}
        className='mt-16 text-center'>
        <div className='mb-4 flex items-center justify-center'>
          <TbPackage className='mr-2 h-6 w-6' />
          <h2 className='text-xl font-semibold'>Open Source Matters</h2>
        </div>
        <p className='text-muted-foreground mx-auto max-w-2xl'>
          This project stands on the shoulders of giants. We're grateful for the open-source community and all the
          developers who have contributed to these packages.
        </p>
      </motion.div>
    </div>
  );
}


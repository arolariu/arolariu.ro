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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

import {motion} from "motion/react";
import {useTranslations} from "next-intl";

import {useCallback} from "react";
import {TbExternalLink, TbPackage} from "react-icons/tb";
import {usePackageFilters} from "../_hooks/usePackageFilters";

type Props = Readonly<{packages: NodePackagesJSON}>;

type SortDirection = Readonly<"asc" | "desc">;
type SortField = Readonly<"name" | "dependencies" | "type">;
type PackageType = Readonly<"all" | "production" | "development">;

/**
 * Component that displays a badge indicating the type of package (production or development).
 * @returns A badge indicating the type of package.
 */
function PackageBadge({type}: Readonly<{type: PackageType}>): React.JSX.Element {
  const t = useTranslations("Acknowledgements.packagesScreen.badge");

  return type === "production" ? (
    <span className='rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 transition-colors duration-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800'>
      {t("production")}
    </span>
  ) : (
    <span className='rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors duration-200 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800'>
      {t("development")}
    </span>
  );
}

/**
 * Component that displays a dialog with the dependencies of a package.
 * @returns A dialog with the dependencies of a package.
 */
function DependenciesDialog({pkg}: Readonly<{pkg: NodePackageInformation}>): React.JSX.Element {
  const t = useTranslations("Acknowledgements.packagesScreen");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'>
          {t("card.viewDependencies")}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px] md:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{t("dialog.dependencies", {name: pkg.name})}</DialogTitle>
          <DialogDescription>
            {pkg.description} <br /> <br />
            {t("dialog.dependenciesCount", {count: String(pkg.dependents?.length ?? 0)})}
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-[300px] overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.package")}</TableHead>
                <TableHead>{t("table.version")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pkg.dependents?.map((dep) => (
                <TableRow key={dep.name + dep.version}>
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
 * @returns A table displaying package statistics by dependency type
 */
export default function PackagesScreen({packages}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Acknowledgements.packagesScreen");
  const {
    extractPackageType,
    filteredAndSortedPackages,
    searchQuery,
    setSearchQuery,
    packageType,
    setPackageType,
    sortField,
    setSortField,
    setSortDirection,
    sortDirection,
  } = usePackageFilters(packages);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchQuery is a stable function.
    [],
  );

  const handlePackageType = useCallback(
    (e: string) => {
      setPackageType(e as PackageType);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPackageType is a stable function.
    [],
  );

  const handleSortField = useCallback(
    (e: string) => {
      setSortField(e as SortField);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSortField is a stable function.
    [],
  );

  const handleSortDirection = useCallback(
    (e: string) => {
      setSortDirection(e as SortDirection);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSortDirection is a stable function.
    [],
  );

  return (
    <div className='container mx-auto max-w-7xl py-10 text-black'>
      <div className='mx-auto mb-6 space-y-4'>
        <div className='relative mx-auto max-w-md'>
          <Input
            type='text'
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={handleSearch}
            className='pl-10'
          />
        </div>
        <div className='mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row'>
          <div className='flex-1'>
            <Select
              value={packageType}
              onValueChange={handlePackageType}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t("filters.allPackages")}</SelectItem>
                <SelectItem value='production'>{t("filters.productionOnly")}</SelectItem>
                <SelectItem value='development'>{t("filters.developmentOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex-1'>
            <Select
              value={sortField}
              onValueChange={handleSortField}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='name'>{t("filters.name")}</SelectItem>
                <SelectItem value='dependencies'>{t("filters.dependenciesCount")}</SelectItem>
                <SelectItem value='type'>{t("filters.packageType")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex-1'>
            <Select
              value={sortDirection}
              onValueChange={handleSortDirection}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.sortDirection")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='asc'>{t("filters.ascending")}</SelectItem>
                <SelectItem value='desc'>{t("filters.descending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue='grid'
        className='w-full'>
        <TabsList className='mx-auto mb-8 grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='grid'>{t("views.gridView")}</TabsTrigger>
          <TabsTrigger value='table'>{t("views.tableView")}</TabsTrigger>
        </TabsList>

        <div className='min-h-[600px]'>
          <TabsContent
            value='grid'
            className='w-full'>
            {filteredAndSortedPackages.length > 0 ? (
              <div className='grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
                {filteredAndSortedPackages.map((pkg, index) => (
                  <motion.div
                    key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}
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
                            <span className='mr-2 font-medium'>{t("card.license")}</span> {pkg.license}
                          </div>
                          <div className='flex items-center text-sm'>
                            <span className='mr-2 font-medium'>
                              {t("card.dependencies")} {pkg.dependents?.length ?? "N/A"}
                            </span>
                          </div>
                          <div className='mt-4 flex items-center justify-between'>
                            <a
                              href={pkg.homepage}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-muted-foreground hover:text-primary flex items-center text-sm transition-colors'>
                              <TbExternalLink className='mr-1 h-4 w-4' />
                              <span>{t("card.website")}</span>
                            </a>
                            <DependenciesDialog pkg={pkg} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className='py-12 text-center'>
                <TbPackage className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <p className='text-muted-foreground'>{t("emptyState.title")}</p>
                <p className='text-muted-foreground'>{t("emptyState.subtitle")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value='table'>
            {filteredAndSortedPackages.length > 0 ? (
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 0.5}}
                className='rounded-md border text-black dark:text-white'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.package")}</TableHead>
                      <TableHead className='hidden md:table-cell'>{t("table.version")}</TableHead>
                      <TableHead className='hidden md:table-cell'>{t("table.type")}</TableHead>
                      <TableHead className='hidden lg:table-cell'>{t("table.description")}</TableHead>
                      <TableHead className='hidden xl:table-cell'>{t("table.license")}</TableHead>
                      <TableHead className='hidden sm:table-cell'>{t("table.dependencies")}</TableHead>
                      <TableHead>{t("table.website")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPackages.map((pkg) => (
                      <TableRow key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}>
                        <TableCell className='font-bold'>{pkg.name}</TableCell>
                        <TableCell className='hidden md:table-cell'>{pkg.version}</TableCell>
                        <TableCell className='hidden md:table-cell'>
                          <PackageBadge type={extractPackageType(pkg)} />
                        </TableCell>
                        <TableCell className='hidden lg:table-cell'>
                          <p className='max-w-md text-pretty'>{pkg.description}</p>
                        </TableCell>
                        <TableCell className='hidden xl:table-cell'>{pkg.license}</TableCell>
                        <TableCell className='hidden sm:table-cell'>
                          <DependenciesDialog pkg={pkg} />
                        </TableCell>
                        <TableCell>
                          <a
                            href={pkg.homepage}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='hover:bg-muted rounded-md p-2 transition-colors'
                            title={t("table.website")}>
                            <TbExternalLink className='mx-auto h-4 w-4' />
                            <span className='sr-only'>{t("table.website")}</span>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              <div className='py-12 text-center'>
                <TbPackage className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <p className='text-muted-foreground'>{t("emptyState.title")}</p>
                <p className='text-muted-foreground'>{t("emptyState.subtitle")}</p>
              </div>
            )}
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
          <h2 className='text-xl font-semibold'>{t("openSource.title")}</h2>
        </div>
        <p className='text-muted-foreground mx-auto max-w-2xl'>{t("openSource.description")}</p>
      </motion.div>
    </div>
  );
}

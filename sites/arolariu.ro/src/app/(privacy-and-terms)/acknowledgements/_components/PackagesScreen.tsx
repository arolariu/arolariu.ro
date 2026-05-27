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
import {useTranslations} from "next-intl-selector";

import {useCallback} from "react";
import {TbExternalLink, TbPackage} from "react-icons/tb";
import {usePackageFilters} from "../_hooks/usePackageFilters";
import styles from "./PackagesScreen.module.scss";

type Props = Readonly<{packages: NodePackagesJSON}>;

type SortDirection = Readonly<"asc" | "desc">;
type SortField = Readonly<"name" | "dependencies" | "type">;
type PackageType = Readonly<"all" | "production" | "development">;

/**
 * Component that displays a dialog with the dependencies of a package.
 * @returns A dialog with the dependencies of a package.
 */
function DependenciesDialog({pkg}: Readonly<{pkg: NodePackageInformation}>): React.JSX.Element {
  const t = useTranslations();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant='outline'
            size='sm'>
            {t((m) => m.sections.legal.acknowledgements.packagesScreen.card.viewDependencies)}
          </Button>
        }
      />
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.sections.legal.acknowledgements.packagesScreen.dialog.dependencies, {name: pkg.name})}</DialogTitle>
          <DialogDescription>
            {pkg.description} <br /> <br />
            {t((m) => m.sections.legal.acknowledgements.packagesScreen.dialog.dependenciesCount, {count: String(pkg.dependents?.length ?? 0)})}
          </DialogDescription>
        </DialogHeader>
        <div className={styles["dialogScrollArea"]}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.package)}</TableHead>
                <TableHead>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.version)}</TableHead>
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
  const t = useTranslations();
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
    <div className={styles["container"]}>
      <div className={styles["filtersContainer"]}>
        <div className={styles["searchContainer"]}>
          <Input
            type='text'
            placeholder={t((m) => m.sections.legal.acknowledgements.packagesScreen.search.placeholder)}
            value={searchQuery}
            onChange={handleSearch}
            className={styles["searchInput"]}
          />
        </div>
        <div className={styles["filterRow"]}>
          <div className={styles["filterItem"]}>
            <Select
              value={packageType}
              onValueChange={handlePackageType}>
              <SelectTrigger>
                <SelectValue placeholder={t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.filterByType)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.allPackages)}</SelectItem>
                <SelectItem value='production'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.productionOnly)}</SelectItem>
                <SelectItem value='development'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.developmentOnly)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={styles["filterItem"]}>
            <Select
              value={sortField}
              onValueChange={handleSortField}>
              <SelectTrigger>
                <SelectValue placeholder={t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.sortBy)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='name'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.name)}</SelectItem>
                <SelectItem value='dependencies'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.dependenciesCount)}</SelectItem>
                <SelectItem value='type'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.packageType)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={styles["filterItem"]}>
            <Select
              value={sortDirection}
              onValueChange={handleSortDirection}>
              <SelectTrigger>
                <SelectValue placeholder={t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.sortDirection)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='asc'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.ascending)}</SelectItem>
                <SelectItem value='desc'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.filters.descending)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue='grid'
        className={styles["tabsContainer"]}>
        <TabsList className={styles["tabsList"]}>
          <TabsTrigger value='grid'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.views.gridView)}</TabsTrigger>
          <TabsTrigger value='table'>{t((m) => m.sections.legal.acknowledgements.packagesScreen.views.tableView)}</TabsTrigger>
        </TabsList>

        <div className={styles["tabsContentWrapper"]}>
          <TabsContent
            value='grid'
            className={styles["tabsContainer"]}>
            {filteredAndSortedPackages.length > 0 ? (
              <div className={styles["packagesGrid"]}>
                {filteredAndSortedPackages.map((pkg, index) => (
                  <motion.div
                    key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3, delay: index * 0.1}}>
                    <Card className={styles["packageCard"]}>
                      <div className={extractPackageType(pkg) === "production" ? styles["productionBanner"] : styles["developmentBanner"]}>
                        {extractPackageType(pkg) === "production" ? t((m) => m.sections.legal.acknowledgements.packagesScreen.badge.production) : t((m) => m.sections.legal.acknowledgements.packagesScreen.badge.development)}
                      </div>
                      <CardHeader>
                        <div className={styles["cardHeaderRow"]}>
                          <CardTitle className={styles["cardTitle"]}>{pkg.name}</CardTitle>
                          <span className={styles["versionBadge"]}>{pkg.version}</span>
                        </div>
                        <CardDescription>{pkg.description}</CardDescription>
                      </CardHeader>
                      <CardContent className={styles["cardContent"]}>
                        <div className={styles["cardDetails"]}>
                          <div className={styles["detailsContent"]}>
                            <div className={styles["detailRow"]}>
                              <span className={styles["detailLabel"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.card.license)}</span> {pkg.license}
                            </div>
                            <div className={styles["detailRow"]}>
                              <span className={styles["detailLabel"]}>
                                {t((m) => m.sections.legal.acknowledgements.packagesScreen.card.dependencies)} {pkg.dependents?.length ?? "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className={styles["cardActions"]}>
                            <a
                              href={pkg.homepage}
                              target='_blank'
                              rel='noopener noreferrer'
                              className={styles["websiteLink"]}>
                              <TbExternalLink className={styles["linkIcon"]} />
                              <span>{t((m) => m.sections.legal.acknowledgements.packagesScreen.card.website)}</span>
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
              <div className={styles["emptyState"]}>
                <TbPackage className={styles["emptyIcon"]} />
                <p className={styles["emptyText"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.emptyState.title)}</p>
                <p className={styles["emptyText"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.emptyState.subtitle)}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value='table'>
            {filteredAndSortedPackages.length > 0 ? (
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 0.5}}
                className={styles["tableContainer"]}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.package)}</TableHead>
                      <TableHead className={styles["hiddenMd"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.version)}</TableHead>
                      <TableHead className={styles["hiddenMd"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.type)}</TableHead>
                      <TableHead className={styles["hiddenLg"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.description)}</TableHead>
                      <TableHead className={styles["hiddenXl"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.license)}</TableHead>
                      <TableHead className={styles["hiddenSm"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.dependencies)}</TableHead>
                      <TableHead>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.website)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPackages.map((pkg) => (
                      <TableRow key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}>
                        <TableCell className={styles["packageName"]}>{pkg.name}</TableCell>
                        <TableCell className={styles["hiddenMd"]}>{pkg.version}</TableCell>
                        <TableCell className={styles["hiddenMd"]}>
                          {extractPackageType(pkg) === "production" ? t((m) => m.sections.legal.acknowledgements.packagesScreen.badge.production) : t((m) => m.sections.legal.acknowledgements.packagesScreen.badge.development)}
                        </TableCell>
                        <TableCell className={styles["hiddenLg"]}>
                          <p className={styles["descriptionText"]}>{pkg.description}</p>
                        </TableCell>
                        <TableCell className={styles["hiddenXl"]}>{pkg.license}</TableCell>
                        <TableCell className={styles["hiddenSm"]}>
                          <DependenciesDialog pkg={pkg} />
                        </TableCell>
                        <TableCell>
                          <a
                            href={pkg.homepage}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={styles["tableLink"]}
                            title={t((m) => m.sections.legal.acknowledgements.packagesScreen.table.website)}>
                            <TbExternalLink className={styles["tableLinkIcon"]} />
                            <span className={styles["srOnly"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.table.website)}</span>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              <div className={styles["emptyState"]}>
                <TbPackage className={styles["emptyIcon"]} />
                <p className={styles["emptyText"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.emptyState.title)}</p>
                <p className={styles["emptyText"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.emptyState.subtitle)}</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.5, delay: 0.5}}
        className={styles["footer"]}>
        <div className={styles["footerHeader"]}>
          <TbPackage className={styles["footerIcon"]} />
          <h2 className={styles["footerTitle"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.openSource.title)}</h2>
        </div>
        <p className={styles["footerDescription"]}>{t((m) => m.sections.legal.acknowledgements.packagesScreen.openSource.description)}</p>
      </motion.div>
    </div>
  );
}

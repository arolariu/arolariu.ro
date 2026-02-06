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
import styles from "./PackagesScreen.module.scss";

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
    <span className={styles["productionBadge"]}>{t("production")}</span>
  ) : (
    <span className={styles["developmentBadge"]}>{t("development")}</span>
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
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("dialog.dependencies", {name: pkg.name})}</DialogTitle>
          <DialogDescription>
            {pkg.description} <br /> <br />
            {t("dialog.dependenciesCount", {count: String(pkg.dependents?.length ?? 0)})}
          </DialogDescription>
        </DialogHeader>
        <main className={styles["dialogScrollArea"]}>
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
        </main>
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
    <main className={styles["container"]}>
      <main className={styles["filtersContainer"]}>
        <main className={styles["searchContainer"]}>
          <Input
            type='text'
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={handleSearch}
            className={styles["searchInput"]}
          />
        </main>
        <main className={styles["filterRow"]}>
          <main className={styles["filterItem"]}>
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
          </main>

          <main className={styles["filterItem"]}>
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
          </main>

          <main className={styles["filterItem"]}>
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
          </main>
        </main>
      </main>

      <Tabs
        defaultValue='grid'
        className={styles["tabsContainer"]}>
        <TabsList className={styles["tabsList"]}>
          <TabsTrigger value='grid'>{t("views.gridView")}</TabsTrigger>
          <TabsTrigger value='table'>{t("views.tableView")}</TabsTrigger>
        </TabsList>

        <main className={styles["tabsContentWrapper"]}>
          <TabsContent
            value='grid'
            className={styles["tabsContainer"]}>
            {filteredAndSortedPackages.length > 0 ? (
              <main className={styles["packagesGrid"]}>
                {filteredAndSortedPackages.map((pkg, index) => (
                  <motion.div
                    key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3, delay: index * 0.1}}>
                    <Card className='h-full'>
                      <CardHeader>
                        <main className={styles["cardHeaderRow"]}>
                          <CardTitle className={styles["cardTitle"]}>{pkg.name}</CardTitle>
                          <span className={styles["versionBadge"]}>{pkg.version}</span>
                        </main>
                        <main className={styles["badgeContainer"]}>
                          <PackageBadge type={extractPackageType(pkg)} />
                        </main>
                        <CardDescription>{pkg.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <main className={styles["cardDetails"]}>
                          <main className={styles["detailRow"]}>
                            <span className={styles["detailLabel"]}>{t("card.license")}</span> {pkg.license}
                          </main>
                          <main className={styles["detailRow"]}>
                            <span className={styles["detailLabel"]}>
                              {t("card.dependencies")} {pkg.dependents?.length ?? "N/A"}
                            </span>
                          </main>
                          <main className={styles["cardActions"]}>
                            <a
                              href={pkg.homepage}
                              target='_blank'
                              rel='noopener noreferrer'
                              className={styles["websiteLink"]}>
                              <TbExternalLink className={styles["linkIcon"]} />
                              <span>{t("card.website")}</span>
                            </a>
                            <DependenciesDialog pkg={pkg} />
                          </main>
                        </main>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </main>
            ) : (
              <main className={styles["emptyState"]}>
                <TbPackage className={styles["emptyIcon"]} />
                <p className={styles["emptyText"]}>{t("emptyState.title")}</p>
                <p className={styles["emptyText"]}>{t("emptyState.subtitle")}</p>
              </main>
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
                      <TableHead>{t("table.package")}</TableHead>
                      <TableHead className={styles["hiddenMd"]}>{t("table.version")}</TableHead>
                      <TableHead className={styles["hiddenMd"]}>{t("table.type")}</TableHead>
                      <TableHead className={styles["hiddenLg"]}>{t("table.description")}</TableHead>
                      <TableHead className={styles["hiddenXl"]}>{t("table.license")}</TableHead>
                      <TableHead className={styles["hiddenSm"]}>{t("table.dependencies")}</TableHead>
                      <TableHead>{t("table.website")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPackages.map((pkg) => (
                      <TableRow key={`${pkg.name}#${pkg.version}#${pkg.dependents?.length ?? 0}`}>
                        <TableCell className={styles["packageName"]}>{pkg.name}</TableCell>
                        <TableCell className={styles["hiddenMd"]}>{pkg.version}</TableCell>
                        <TableCell className={styles["hiddenMd"]}>
                          <PackageBadge type={extractPackageType(pkg)} />
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
                            title={t("table.website")}>
                            <TbExternalLink className={styles["tableLinkIcon"]} />
                            <span className='sr-only'>{t("table.website")}</span>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              <main className={styles["emptyState"]}>
                <TbPackage className={styles["emptyIcon"]} />
                <p className={styles["emptyText"]}>{t("emptyState.title")}</p>
                <p className={styles["emptyText"]}>{t("emptyState.subtitle")}</p>
              </main>
            )}
          </TabsContent>
        </main>
      </Tabs>

      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.5, delay: 0.5}}
        className={styles["footer"]}>
        <main className={styles["footerHeader"]}>
          <TbPackage className={styles["footerIcon"]} />
          <h2 className={styles["footerTitle"]}>{t("openSource.title")}</h2>
        </main>
        <p className={styles["footerDescription"]}>{t("openSource.description")}</p>
      </motion.div>
    </main>
  );
}

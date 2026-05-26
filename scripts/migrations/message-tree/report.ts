import fs from "node:fs";
import path from "node:path";
import {flattenMessages, getMessagesDirectory, getPathDepth, getRepositoryRoot, localeNames, readMessageTree} from "./treeUtils.ts";
import {allowedTopLevelBuckets} from "./taxonomy.ts";

type BucketReport = Readonly<{
  bucket: string;
  leaves: number;
  maxDepth: number;
  childCount: number;
}>;

type LocaleReport = Readonly<{
  locale: string;
  topLevelCount: number;
  leafCount: number;
  maxDepth: number;
  allowedBucketLeaves: number;
  retiredPrefixLeaves: number;
  buckets: readonly BucketReport[];
}>;

function buildLocaleReport(locale: (typeof localeNames)[number]): LocaleReport {
  const tree = readMessageTree(locale);
  const flat = flattenMessages(tree);
  const buckets = Object.entries(tree).map(([bucket, value]) => {
    const branchFlat = typeof value === "string" ? new Map([[bucket, value]]) : flattenMessages(value, bucket);
    const paths = [...branchFlat.keys()];
    return {
      bucket,
      leaves: paths.length,
      maxDepth: Math.max(...paths.map(getPathDepth)),
      childCount: typeof value === "string" ? 0 : Object.keys(value).length,
    };
  });

  return {
    locale,
    topLevelCount: Object.keys(tree).length,
    leafCount: flat.size,
    maxDepth: Math.max(...[...flat.keys()].map(getPathDepth)),
    allowedBucketLeaves: [...flat.keys()].filter((key) => allowedTopLevelBuckets.some((bucket) => key === bucket || key.startsWith(`${bucket}.`))).length,
    retiredPrefixLeaves: [...flat.keys()].filter((key) => key.includes("IMS--")).length,
    buckets: buckets.sort((left, right) => right.leaves - left.leaves),
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  messagesDirectory: path.relative(getRepositoryRoot(), getMessagesDirectory()),
  locales: localeNames.map(buildLocaleReport),
};

const outputPath = process.argv[2];
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));

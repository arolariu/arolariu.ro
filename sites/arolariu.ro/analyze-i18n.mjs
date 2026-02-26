import fs from 'fs';
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf-8'));
const keys = Object.keys(en);
function maxDepth(obj, d) {
  if (typeof obj !== 'object' || obj === null) return d;
  return Math.max(...Object.values(obj).map(v => maxDepth(v, d + 1)));
}
function countLeaves(obj) {
  if (typeof obj !== 'object' || obj === null) return 1;
  return Object.values(obj).reduce((sum, v) => sum + countLeaves(v), 0);
}
console.log('=== Top-level Namespaces ===');
let totalLeaves = 0;
keys.forEach(k => {
  const size = JSON.stringify(en[k]).length;
  const depth = maxDepth(en[k], 1);
  const leaves = countLeaves(en[k]);
  totalLeaves += leaves;
  console.log(k.padEnd(25), (size + 'B').padStart(10), ('d=' + depth).padStart(5), (leaves + ' keys').padStart(10));
});
console.log();
console.log('Total file size:', fs.statSync('messages/en.json').size, 'bytes');
console.log('Total namespaces:', keys.length);
console.log('Total translatable strings:', totalLeaves);

// Check for duplicate/redundant content
console.log('\n=== Potential Duplicates ===');
const shared = en['Shared'];
const consolidation = en['I18nConsolidation'];
if (shared && consolidation) {
  console.log('Shared.header.logoAlt:', shared?.header?.logoAlt);
  console.log('I18nConsolidation.Header.logoAlt:', consolidation?.Header?.logoAlt);
  console.log('Match:', shared?.header?.logoAlt === consolidation?.Header?.logoAlt);
}

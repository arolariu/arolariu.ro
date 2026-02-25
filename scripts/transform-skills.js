// Vocabulary transformation script for Ars Contexta skills
// Run: node scripts/transform-skills.js

const fs = require('fs');
const path = require('path');

const sourcePath = 'C:/Users/aolariu/.claude/plugins/cache/agenticnotetaking/arscontexta/0.8.0/skill-sources';
const targetBase = 'C:/Users/aolariu/source/repos/arolariu/arolariu.ro/.claude/skills';

const skills = [
  ['reduce', 'distill'],
  ['reflect', 'connect'],
  ['reweave', 'refresh'],
  ['verify', 'validate'],
  ['validate', 'audit'],
  ['seed', 'seed'],
  ['ralph', 'ralph'],
  ['pipeline', 'pipeline'],
  ['tasks', 'tasks'],
  ['stats', 'stats'],
  ['graph', 'graph'],
  ['next', 'next'],
  ['learn', 'learn'],
  ['remember', 'remember'],
  ['rethink', 'rethink'],
  ['refactor', 'refactor']
];

function applyVocabTransform(content, domainName) {
  let s = content;

  // Phase A: Replace {vocabulary.xxx} template variables
  const vocabMap = {
    '{vocabulary.cmd_verify}': 'validate',
    '{vocabulary.cmd_reweave}': 'refresh',
    '{vocabulary.cmd_reflect}': 'connect',
    '{vocabulary.cmd_reduce}': 'distill',
    '{vocabulary.note_plural}': 'insights',
    '{vocabulary.notes_collection}': 'insights',
    '{vocabulary.notes}': 'insights',
    '{vocabulary.note}': 'insight',
    '{vocabulary.topic_map_plural}': 'domain maps',
    '{vocabulary.topic_maps}': 'domain maps',
    '{vocabulary.topic_map}': 'domain map',
    '{vocabulary.reduce}': 'distill',
    '{vocabulary.reflect}': 'connect',
    '{vocabulary.reweave}': 'refresh',
    '{vocabulary.verify}': 'validate',
    '{vocabulary.validate}': 'audit',
    '{vocabulary.inbox}': 'inbox',
    '{vocabulary.domain}': 'the arolariu.ro monorepo',
    '{DOMAIN:extraction_categories}': '',
    '{DOMAIN:notes}': 'insights',
    '{DOMAIN:note}': 'insight',
    '{DOMAIN:topic map}': 'domain map',
    '{DOMAIN:topic maps}': 'domain maps',
    '{DOMAIN:inbox}': 'inbox',
    '{DOMAIN:process}': 'distill',
    '{DOMAIN:connect}': 'connect',
    '{DOMAIN:maintain}': 'refresh',
    '{DOMAIN:verify}': 'validate',
    '{DOMAIN:rethink}': 'rethink',
    '{DOMAIN:skill}': 'skill',
    '{DOMAIN:skills}': 'skills',
    '{DOMAIN:claims}': 'insights',
    '{DOMAIN:Note}': 'Insight',
    '{DOMAIN:Notes}': 'Insights',
    '{DOMAIN:Knowledge}': 'Architectural knowledge',
    '{DOMAIN:Topic Map}': 'Domain Map',
    '{DOMAIN:Topic Maps}': 'Domain Maps',
    '{DOMAIN:the knowledge domain}': 'codebase architecture knowledge',
    '{DOMAIN:analyze}': 'graph',
    '{DOMAIN:health}': 'health',
  };

  for (const [key, val] of Object.entries(vocabMap)) {
    s = s.split(key).join(val);
  }

  // Phase B: Handle /command references (verify/validate conflict)
  s = s.replace(/\/validate/g, '___SLASH_AUDIT___');
  s = s.replace(/\/verify/g, '/validate');
  s = s.replace(/___SLASH_AUDIT___/g, '/audit');
  s = s.replace(/\/reduce/g, '/distill');
  s = s.replace(/\/reflect/g, '/connect');
  s = s.replace(/\/reweave/g, '/refresh');

  // Phase C: Multi-word phrases
  s = s.replace(/thinking notes/gi, 'insights');
  s = s.replace(/topic maps/gi, 'domain maps');
  s = s.replace(/topic map/gi, 'domain map');
  s = s.replace(/MOCs/g, 'domain maps');
  s = s.replace(/(?<![a-zA-Z])MOC(?![a-zA-Z])/g, 'domain map');

  // Phase D: Path references
  s = s.replace(/notes\//g, 'insights/');

  // Phase E: System terms with word boundaries
  s = s.replace(/(?<![a-zA-Z])notes(?![a-zA-Z/])/g, 'insights');
  s = s.replace(/(?<![a-zA-Z])Notes(?![a-zA-Z/])/g, 'Insights');
  s = s.replace(/(?<![a-zA-Z])note(?![a-zA-Z_])/g, 'insight');
  s = s.replace(/(?<![a-zA-Z])Note(?![a-zA-Z_])/g, 'Insight');
  s = s.replace(/(?<![a-zA-Z])claims(?![a-zA-Z])/g, 'insights');
  s = s.replace(/(?<![a-zA-Z])claim(?![a-zA-Z])/g, 'insight');

  // Phase F: Section headers
  s = s.replace(/^(#+\s*)Reduce/gm, '$1Distill');
  s = s.replace(/^(#+\s*)Reflect/gm, '$1Connect');
  s = s.replace(/^(#+\s*)Reweave/gm, '$1Refresh');

  // Phase G: Process verbs with word boundaries (verify/validate conflict)
  s = s.replace(/(?<![a-zA-Z/])validate(?![a-zA-Z])/g, '___AUDIT___');
  s = s.replace(/(?<![a-zA-Z/])Validate(?![a-zA-Z])/g, '___AUDIT_CAP___');
  s = s.replace(/(?<![a-zA-Z/])verify(?![a-zA-Z])/g, 'validate');
  s = s.replace(/(?<![a-zA-Z/])Verify(?![a-zA-Z])/g, 'Validate');
  s = s.replace(/___AUDIT___/g, 'audit');
  s = s.replace(/___AUDIT_CAP___/g, 'Audit');

  s = s.replace(/(?<![a-zA-Z/])reduce(?![a-zA-Z])/g, 'distill');
  s = s.replace(/(?<![a-zA-Z/])Reduce(?![a-zA-Z])/g, 'Distill');
  s = s.replace(/(?<![a-zA-Z/])reflect(?![a-zA-Z])/g, 'connect');
  s = s.replace(/(?<![a-zA-Z/])Reflect(?![a-zA-Z])/g, 'Connect');
  s = s.replace(/(?<![a-zA-Z/])reweave(?![a-zA-Z])/g, 'refresh');
  s = s.replace(/(?<![a-zA-Z/])Reweave(?![a-zA-Z])/g, 'Refresh');

  // Phase H: Extraction terminology
  s = s.replace(/extract insights/gi, 'distill insights');
  s = s.replace(/extraction engine/gi, 'distillation engine');
  s = s.replace(/extraction phase/gi, 'distillation phase');
  s = s.replace(/extraction report/gi, 'distillation report');
  s = s.replace(/extraction categories/gi, 'distillation categories');
  s = s.replace(/Extract ALL/g, 'Distill ALL');
  s = s.replace(/auto-extract/gi, 'auto-distill');

  // Phase I: Fix YAML name field
  s = s.replace(/^name: .+$/m, 'name: ' + domainName);

  // Phase J: Ensure context: fork
  if (!/^context:/m.test(s)) {
    s = s.replace(/^(---)\s*$/m, 'context: fork\n$1');
  }

  return s;
}

// Create target base
if (!fs.existsSync(targetBase)) {
  fs.mkdirSync(targetBase, { recursive: true });
}

const results = [];

for (const [sourceDir, domainName] of skills) {
  try {
    const sourceFile = path.join(sourcePath, sourceDir, 'SKILL.md');
    if (!fs.existsSync(sourceFile)) {
      results.push(`SKIP: ${domainName} (source not found: ${sourceFile})`);
      continue;
    }
    const content = fs.readFileSync(sourceFile, 'utf8');
    const transformed = applyVocabTransform(content, domainName);

    const targetDir = path.join(targetBase, domainName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, 'SKILL.md'), transformed, 'utf8');
    results.push(`OK: ${domainName}`);
  } catch (e) {
    results.push(`ERR: ${domainName} - ${e.message}`);
  }
}

console.log(results.join('\n'));
console.log(`\nDone: ${results.filter(r => r.startsWith('OK')).length} skills created`);

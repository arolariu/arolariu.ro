#!/usr/bin/env bash
# Compute extended diff metrics (churn, net-change, top extensions, top directories)
# Outputs: top-ext-markdown, top-dir-markdown, churn, net-change

set -e

BASE_BRANCH="${1:-origin/main}"
TARGET_REF="${2:-HEAD}"

echo "Generating extended diff metrics vs $BASE_BRANCH...$TARGET_REF"
git diff --name-only "$BASE_BRANCH"..."$TARGET_REF" > changed_files.txt || true

if [ ! -s changed_files.txt ]; then
  echo "No changed files for extended stats."
  echo "top-ext-markdown=| Ext | Files |\n|-----|-------|\n" >> "$GITHUB_OUTPUT"
  echo "top-dir-markdown=| Directory | Files |\n|-----------|-------|\n" >> "$GITHUB_OUTPUT"
  echo "churn=0" >> "$GITHUB_OUTPUT"
  echo "net-change=0" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Compute churn & net-change
git diff --numstat "$BASE_BRANCH"..."$TARGET_REF" > numstat.txt || true
ADD=$(awk '{a+=$1} END {print a+0}' numstat.txt)
DEL=$(awk '{d+=$2} END {print d+0}' numstat.txt)
CHURN=$(( ADD + DEL ))
NET=$(( ADD - DEL ))

# Top extensions
awk -F. '{
  if (NF==1) ext="(noext)";
  else ext=$NF;
  count[ext]++
} END {
  for (e in count) print count[e], e
}' changed_files.txt | sort -nr | head -5 > top_ext.txt

# Top directories
awk -F/ '{
  d=$1;
  if (d=="." || d=="") d="(root)";
  count[d]++
} END {
  for (d in count) print count[d], d
}' changed_files.txt | sort -nr | head -5 > top_dir.txt

{
  echo '| Ext | Files |'
  echo '|-----|-------|'
  awk '{print "| " $2 " | " $1 " |"}' top_ext.txt
} > top_ext.md

{
  echo '| Directory | Files |'
  echo '|-----------|-------|'
  awk '{print "| " $2 " | " $1 " |"}' top_dir.txt
} > top_dir.md

{
  echo "top-ext-markdown<<EOF"
  cat top_ext.md
  echo "EOF"
  echo "top-dir-markdown<<EOF"
  cat top_dir.md
  echo "EOF"
} >> "$GITHUB_OUTPUT"

echo "churn=$CHURN" >> "$GITHUB_OUTPUT"
echo "net-change=$NET" >> "$GITHUB_OUTPUT"

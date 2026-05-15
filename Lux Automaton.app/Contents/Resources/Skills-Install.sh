#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="${HOME}/.claude/skills"
mkdir -p "${SKILLS_DIR}"

echo "Installing curated local-safe skill pack into ${SKILLS_DIR}"

declare -a SAFE_REPOS=(
  "forrestchang/andrej-karpathy-skills"
  "OneRedOak/claude-code-workflows"
  "Jeffallan/claude-skills"
  "dominikmartn/nothing-design-skill"
  "VoltAgent/awesome-agent-skills"
)

clone_or_pull() {
  local repo="$1"
  local slug
  slug="$(basename "${repo}")"
  slug="${slug%.git}"
  local target="${SKILLS_DIR}/${slug}"

  if [[ -d "${target}/.git" ]]; then
    echo "Updating ${slug}"
    git -C "${target}" pull --ff-only
  else
    echo "Installing ${slug}"
    git clone "https://github.com/${repo}.git" "${target}"
  fi
}

for repo in "${SAFE_REPOS[@]}"; do
  clone_or_pull "${repo}"
done

if [[ $# -gt 0 ]]; then
  echo
  echo "Installing custom skill repositories..."
  for custom in "$@"; do
    if [[ "${custom}" == http* ]]; then
      if [[ "${custom}" != *.git ]]; then
        custom="${custom}.git"
      fi
      slug="$(basename "${custom}")"
      slug="${slug%.git}"
      target="${SKILLS_DIR}/${slug}"
      if [[ -d "${target}/.git" ]]; then
        echo "Updating ${slug}"
        git -C "${target}" pull --ff-only
      else
        echo "Installing ${slug}"
        git clone "${custom}" "${target}"
      fi
    else
      clone_or_pull "${custom}"
    fi
  done
fi

echo
echo "Done. Installed skills:"
find "${SKILLS_DIR}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort

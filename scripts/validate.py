#!/usr/bin/env python3
"""Structural checks for the marketplace and every plugin in it.

Run from the repo root: python3 scripts/validate.py
"""

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MAX_DESCRIPTION = 1024
MAX_SKILL_LINES = 500

errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as e:
        fail(f"{path.relative_to(ROOT)}: {e}")
        return {}


def frontmatter(path: Path) -> dict | None:
    text = path.read_text()
    # A missing or unparseable block makes the skills CLI skip the skill silently.
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        fail(f"{path.relative_to(ROOT)}: no YAML frontmatter")
        return None
    try:
        data = yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        fail(f"{path.relative_to(ROOT)}: invalid YAML frontmatter: {e}")
        return None
    if not isinstance(data, dict):
        fail(f"{path.relative_to(ROOT)}: frontmatter is not a mapping")
        return None
    return data


def check_skill(skill_dir: Path) -> None:
    path = skill_dir / "SKILL.md"
    rel = path.relative_to(ROOT)
    if not path.is_file():
        fail(f"{skill_dir.relative_to(ROOT)}: missing SKILL.md")
        return
    data = frontmatter(path)
    if data is None:
        return
    if data.get("name") != skill_dir.name:
        fail(f"{rel}: name {data.get('name')!r} must equal directory {skill_dir.name!r}")
    description = data.get("description")
    if not isinstance(description, str) or not description.strip():
        fail(f"{rel}: missing description")
    elif len(description) > MAX_DESCRIPTION:
        fail(f"{rel}: description is {len(description)} chars (max {MAX_DESCRIPTION})")
    lines = len(path.read_text().splitlines())
    if lines >= MAX_SKILL_LINES:
        fail(f"{rel}: {lines} lines (keep under {MAX_SKILL_LINES}; move detail to references/)")


def check_plugin(plugin_dir: Path, expected_name: str) -> None:
    rel = plugin_dir.relative_to(ROOT)
    manifest = load_json(plugin_dir / ".claude-plugin" / "plugin.json")
    if manifest.get("name") != expected_name:
        fail(f"{rel}: plugin.json name {manifest.get('name')!r} != marketplace entry {expected_name!r}")

    skills_dir = plugin_dir / "skills"
    skills = sorted(p for p in skills_dir.iterdir() if p.is_dir()) if skills_dir.is_dir() else []
    for skill_dir in skills:
        check_skill(skill_dir)
    skill_names = {p.name for p in skills}

    agents = plugin_dir / "AGENTS.md"
    if not agents.is_file():
        return
    text = agents.read_text()

    # Every skill the core points to must ship with the plugin.
    referenced = set(re.findall(r"skill: `([a-z0-9-]+)`", text))
    referenced |= set(re.findall(r"the `([a-z0-9-]+)` skill", text))
    for name in sorted(referenced - skill_names):
        fail(f"{rel}/AGENTS.md: references skill {name!r}, which does not exist")

    # The version lives in plugin.json, the AGENTS.md header and the changelog.
    version = manifest.get("version")
    header = re.search(rf"{re.escape(expected_name)} v(\d+\.\d+\.\d+)", text)
    if not header:
        fail(f"{rel}/AGENTS.md: header comment has no '{expected_name} vX.Y.Z'")
    elif header.group(1) != version:
        fail(f"{rel}: AGENTS.md says v{header.group(1)}, plugin.json says {version}")
    changelog = plugin_dir / "CHANGELOG.md"
    if version and changelog.is_file() and f"## {version}" not in changelog.read_text():
        fail(f"{rel}/CHANGELOG.md: no entry for {version}")


def main() -> int:
    marketplace = load_json(ROOT / ".claude-plugin" / "marketplace.json")
    for entry in marketplace.get("plugins", []):
        name, source = entry.get("name"), entry.get("source")
        if not isinstance(source, str) or not source.startswith("./"):
            fail(f"marketplace.json: plugin {name!r} needs a relative './' source")
            continue
        plugin_dir = (ROOT / source).resolve()
        if not plugin_dir.is_dir():
            fail(f"marketplace.json: source {source!r} for {name!r} does not exist")
            continue
        check_plugin(plugin_dir, name)

    if errors:
        print("\n".join(f"✘ {e}" for e in errors))
        return 1
    print(f"✔ {len(marketplace.get('plugins', []))} plugin(s) valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())

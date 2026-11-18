#!/usr/bin/env python3
"""Read-only SDD graph preflight. Does not call an LLM, merge, or deploy."""
from pathlib import Path
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
NAME = os.environ.get("SPEC_NAME", "001-indicadores-v2")
if not re.fullmatch(r"[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*", NAME):
    sys.exit("Invalid spec name")

spec_dir = ROOT / "specs" / NAME
required = [spec_dir / n for n in ("spec.md", "plan.md", "tasks.md")]
required.append(ROOT / "docs" / "architecture" / "adr" / "0001-modernizacao-incremental.md")
missing = [str(p.relative_to(ROOT)) for p in required if not p.is_file()]
if missing:
    sys.exit("Missing required files: " + ", ".join(missing))

tasks = (spec_dir / "tasks.md").read_text(encoding="utf-8")
ids = re.findall(r"\*\*(T\d{3})\s*[—-]", tasks)
if not ids or len(ids) != len(set(ids)):
    sys.exit("Task IDs are missing or duplicated")
dependencies = tasks.split("## Dependências", 1)
if len(dependencies) != 2:
    sys.exit("Missing dependencies section")
refs = set(re.findall(r"\bT\d{3}\b", dependencies[1]))
unknown = refs - set(ids)
if unknown:
    sys.exit("Unknown dependency task(s): " + ", ".join(sorted(unknown)))

print("Spec:", NAME)
print("Tasks:", ", ".join(ids))
print("Dependency references:", ", ".join(sorted(refs)) or "none")
print("Preflight passed (static references only; not a DAG cycle check).")

#!/usr/bin/env python3
"""Read-only comparison of an exported source tree with a Git checkout.

Never runs exported code, follows symlinks, or reads credentials. Emits metadata
and hashes only. Absence is a byte/path finding, not a semantic feature verdict.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

SOURCE_ROOTS = {"src", "client", "server", "api", "shared", "tests", "specs", "docs"}
SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", "data", "fixtures", "mock", "mocks"}
SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".css", ".md", ".sql"}


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], stderr=subprocess.DEVNULL)


def eligible(path):
    lower = path.name.lower()
    return (path.parts[0] in SOURCE_ROOTS and not set(path.parts) & SKIP_DIRS
            and path.suffix in SUFFIXES and not lower.startswith(".env")
            and not any(word in lower for word in ("secret", "credential", "token", "private-key")))


def compare(repo, export):
    repo, export = Path(repo).resolve(), Path(export).resolve()
    if not export.is_dir():
        raise ValueError("Export source directory does not exist")
    origin = git(repo, "remote", "get-url", "origin").decode().strip()
    allowed = {"https://github.com/Altus-Realty-Group/ECC-APM", "https://github.com/Altus-Realty-Group/ECC-APM.git", "git@github.com:Altus-Realty-Group/ECC-APM.git"}
    if origin not in allowed:
        raise ValueError("Checkout origin is not canonical ECC-APM")
    if git(repo, "status", "--porcelain").strip():
        raise ValueError("Canonical checkout must be clean")
    head = git(repo, "rev-parse", "HEAD").decode().strip()
    tree = {}
    by_hash = {}
    for record in git(repo, "ls-tree", "-r", "-z", "HEAD").split(b"\0"):
        if not record:
            continue
        meta, raw_path = record.split(b"\t", 1)
        mode, kind, sha = meta.decode().split()
        if kind != "blob" or mode == "120000":
            continue
        path = raw_path.decode("utf-8")
        tree[path] = sha
        by_hash.setdefault(sha, []).append(path)
    rows = []
    for path in sorted(export.rglob("*")):
        rel = path.relative_to(export)
        if not eligible(rel) or path.is_symlink() or not path.is_file():
            continue
        if any(parent.is_symlink() for parent in path.parents if parent != export):
            continue
        size = path.stat().st_size
        if size > 2_000_000:
            continue
        content = path.read_bytes()
        sha = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
        name = rel.as_posix()
        status = "same_path_identical" if tree.get(name) == sha else "same_path_different" if name in tree else "identical_elsewhere" if sha in by_hash else "absent_from_current_tree"
        rows.append({"path": name, "bytes": len(content), "blob_sha": sha, "comparison": status, "identical_paths": by_hash.get(sha, [])})
    return {"schema_version": 1, "repository": "Altus-Realty-Group/ECC-APM", "baseline_sha": head, "scope": "Eligible source files; no semantic, historical or runtime acceptance", "files": rows}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--export", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(compare(args.repo, args.export), indent=2))
    except (ValueError, OSError, subprocess.CalledProcessError):
        parser.exit(1, "Comparison failed: verify canonical origin, clean checkout and readable source directory.\n")

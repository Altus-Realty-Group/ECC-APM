"""Inventory retained visual-source ZIP members without extracting or executing them."""
import csv
import hashlib
from pathlib import Path
from zipfile import ZipFile

root = Path.cwd()
out = root / 'docs/ui-recovery'
out.mkdir(parents=True, exist_ok=True)
rows = []
archives = []
for index, archive in enumerate(sorted((root / 'snapshots').glob('*.zip')), 1):
    archive_id = f'A{index:02}'
    archives.append([archive_id, str(archive.relative_to(root)), archive.stat().st_size, hashlib.sha256(archive.read_bytes()).hexdigest()])
    with ZipFile(archive) as zipped:
        for member in zipped.infolist():
            if member.is_dir() or not member.filename.endswith(('.tsx', '.jsx', '.css')):
                continue
            if '/node_modules/' in member.filename:
                continue
            if member.file_size > 2 * 1024 * 1024:
                raise ValueError('Visual member exceeds inventory bound')
            content = zipped.read(member)
            current = root / member.filename
            safe = current.resolve().is_relative_to(root.resolve())
            current_digest = hashlib.sha256(current.read_bytes()).hexdigest() if safe and current.is_file() else ''
            rows.append([archive_id, member.filename, len(content), hashlib.sha256(content).hexdigest(), current_digest, 'same' if current_digest == hashlib.sha256(content).hexdigest() else 'changed' if current_digest else 'not at original path', 'bytes inventoried; not rendered or approved'])
variants = {}
for row in rows:
    key = tuple(row[1:])
    variants.setdefault(key, []).append(row[0])
with (out / 'historical-snapshot-members.csv').open('w', newline='') as handle:
    writer = csv.writer(handle)
    writer.writerow(['member', 'bytes', 'historical_sha256', 'current_same_path_sha256', 'comparison', 'evidence_limit', 'archive_ids'])
    writer.writerows([list(key) + [';'.join(ids)] for key, ids in sorted(variants.items())])
with (out / 'snapshot-archives.csv').open('w', newline='') as handle:
    writer = csv.writer(handle)
    writer.writerow(['archive_id', 'archive', 'bytes', 'archive_sha256'])
    writer.writerows(archives)
print({'archives': len(archives), 'visual_members': len(rows), 'unique_visual_contents': len({r[3] for r in rows}), 'path_content_variants': len(variants)})

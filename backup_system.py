#!/usr/bin/env python3
"""
Lux Automaton AI Backup System
Local hard drive backup + cloud sync with privacy-first design
"""
import os
import json
import sqlite3
import hashlib
import shutil
import subprocess
import datetime
import tarfile
import gzip
import base64
import re
from pathlib import Path
from typing import Optional

BACKUP_DB = Path.home() / ".luxautomaton" / "backups" / "backup_registry.db"
BACKUP_ROOT = Path.home() / ".luxautomaton" / "backups"

class LuxBackupSystem:
    def __init__(self, backup_destination: str = None):
        self.backup_destination = backup_destination or str(BACKUP_ROOT / "local")
        self.db_path = BACKUP_ROOT / "backup_registry.db"
        self._ensure_dirs()
        self._init_db()

    def _ensure_dirs(self):
        BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
        Path(self.backup_destination).mkdir(parents=True, exist_ok=True)

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS backup_sets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                size_bytes INTEGER,
                file_count INTEGER,
                checksum TEXT,
                location TEXT,
                compressed INTEGER DEFAULT 0,
                encrypted INTEGER DEFAULT 0,
                tags TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS file_manifest (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_id TEXT,
                file_path TEXT,
                file_hash TEXT,
                file_size INTEGER,
                modified_at TEXT,
                FOREIGN KEY (backup_id) REFERENCES backup_sets(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS restore_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_id TEXT,
                restored_at TEXT,
                restored_to TEXT,
                status TEXT
            )
        """)
        conn.commit()
        conn.close()

    def _compute_hash(self, file_path: str) -> str:
        h = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(65536), b''):
                    h.update(chunk)
            return h.hexdigest()
        except:
            return ""

    def _generate_id(self) -> str:
        return hashlib.sha256(str(datetime.datetime.now()).encode()).hexdigest()[:12]

    def backup(
        self,
        name: str,
        sources: list[str],
        tags: list[str] = None,
        compress: bool = True,
        exclude_patterns: list[str] = None
    ) -> dict:
        """Create a backup of specified directories/files"""
        backup_id = self._generate_id()
        timestamp = datetime.datetime.now().isoformat()
        exclude_patterns = exclude_patterns or [
            '__pycache__', '.git', 'node_modules', '.venv', 'venv',
            '*.pyc', '.DS_Store', 'Thumbs.db', '.cache', '*.log'
        ]

        manifest = []
        total_size = 0
        manifest_path = BACKUP_ROOT / f"manifest_{backup_id}.json"

        # Scan and hash all files
        for source in sources:
            source_path = Path(source).expanduser().resolve()
            if not source_path.exists():
                continue

            if source_path.is_file():
                files = [source_path]
            else:
                files = [f for f in source_path.rglob('*') if f.is_file()]

            for f in files:
                skip = False
                for pattern in exclude_patterns:
                    if pattern in str(f):
                        skip = True
                        break
                if skip:
                    continue

                file_hash = self._compute_hash(str(f))
                size = f.stat().st_size
                total_size += size
                manifest.append({
                    'path': str(f),
                    'relative': str(f.relative_to(source_path.parent)) if source_path.is_file() else str(f.relative_to(source_path)),
                    'hash': file_hash,
                    'size': size,
                    'modified': datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat()
                })

        # Create backup archive
        archive_name = f"backup_{backup_id}_{name.replace(' ', '_')}"
        archive_path = Path(self.backup_destination) / archive_name

        if compress:
            archive_path = Path(f"{archive_path}.tar.gz")
        else:
            archive_path = Path(f"{archive_path}.tar")

        with tarfile.open(archive_path, 'w:gz' if compress else 'w') as tar:
            for source in sources:
                source_path = Path(source).expanduser().resolve()
                if source_path.exists():
                    tar.add(source_path, arcname=source_path.name)

        # Save manifest
        with open(manifest_path, 'w') as f:
            json.dump({
                'id': backup_id,
                'name': name,
                'created_at': timestamp,
                'sources': sources,
                'manifest': manifest,
                'total_size': total_size,
                'file_count': len(manifest)
            }, f, indent=2)

        # Register in database
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO backup_sets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            backup_id, name, timestamp, total_size, len(manifest),
            manifest[-1]['hash'] if manifest else '', self.backup_destination,
            1 if compress else 0, 0,
            json.dumps(tags or [])
        ))
        conn.commit()
        conn.close()

        return {
            'success': True,
            'backup_id': backup_id,
            'name': name,
            'archive_path': str(archive_path),
            'manifest_path': str(manifest_path),
            'file_count': len(manifest),
            'total_size_bytes': total_size,
            'compressed_size_bytes': archive_path.stat().st_size,
            'created_at': timestamp
        }

    def restore(
        self,
        backup_id: str = None,
        restore_path: str = None,
        select_files: list[str] = None
    ) -> dict:
        """Restore from a backup"""
        if backup_id:
            manifest_path = BACKUP_ROOT / f"manifest_{backup_id}.json"
            if not manifest_path.exists():
                return {'success': False, 'error': 'Backup manifest not found'}

            with open(manifest_path) as f:
                data = json.load(f)

            archive_name = f"backup_{backup_id}_{data['name'].replace(' ', '_')}"
            archive_candidates = list(Path(self.backup_destination).glob(f"{archive_name}.tar*"))

            if not archive_candidates:
                return {'success': False, 'error': 'Backup archive not found'}

            archive_path = archive_candidates[0]
            restore_path = restore_path or str(Path.home() / "LuxAutomaton_Restore")

            Path(restore_path).mkdir(parents=True, exist_ok=True)

            with tarfile.open(archive_path, 'r:*') as tar:
                members = tar.getmembers()
                if select_files:
                    members = [m for m in members if any(sel in m.name for sel in select_files)]
                tar.extractall(restore_path)

            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                INSERT INTO restore_points VALUES (?, ?, ?, ?)
            """, (None, backup_id, datetime.datetime.now().isoformat(), restore_path, 'completed'))
            conn.commit()
            conn.close()

            return {
                'success': True,
                'backup_id': backup_id,
                'restored_to': restore_path,
                'files_extracted': len(members),
                'message': f'Restored to {restore_path}'
            }

        return {'success': False, 'error': 'No backup_id provided'}

    def list_backups(self) -> dict:
        """List all backups"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM backup_sets ORDER BY created_at DESC").fetchall()
        conn.close()

        backups = []
        for row in rows:
            backups.append({
                'id': row['id'],
                'name': row['name'],
                'created_at': row['created_at'],
                'size_bytes': row['size_bytes'],
                'file_count': row['file_count'],
                'location': row['location'],
                'compressed': bool(row['compressed']),
                'tags': json.loads(row['tags'] or '[]')
            })

        return {'success': True, 'backups': backups}

    def delete_backup(self, backup_id: str) -> dict:
        """Delete a backup"""
        manifest_path = BACKUP_ROOT / f"manifest_{backup_id}.json"
        conn = sqlite3.connect(self.db_path)
        row = conn.execute("SELECT * FROM backup_sets WHERE id = ?", (backup_id,)).fetchone()
        if not row:
            conn.close()
            return {'success': False, 'error': 'Backup not found'}

        archive_pattern = f"backup_{backup_id}_*"
        for f in Path(row['location']).glob(archive_pattern):
            f.unlink()
        if manifest_path.exists():
            manifest_path.unlink()

        conn.execute("DELETE FROM file_manifest WHERE backup_id = ?", (backup_id,))
        conn.execute("DELETE FROM backup_sets WHERE id = ?", (backup_id,))
        conn.commit()
        conn.close()

        return {'success': True, 'message': f'Deleted backup {backup_id}'}


def cmd_backup(args):
    system = LuxBackupSystem(args.destination)
    sources = args.sources or [str(Path.home() / "Documents" / "LuxAutomaton")]
    result = system.backup(
        name=args.name or f"backup_{datetime.date.today()}",
        sources=sources,
        tags=args.tags.split(',') if args.tags else None,
        compress=not args.no_compress
    )
    print(json.dumps(result, indent=2))

def cmd_restore(args):
    system = LuxBackupSystem(args.destination)
    result = system.restore(
        backup_id=args.backup_id,
        restore_path=args.path,
        select_files=args.files
    )
    print(json.dumps(result, indent=2))

def cmd_list(args):
    system = LuxBackupSystem(args.destination)
    result = system.list_backups()
    print(json.dumps(result, indent=2))

def cmd_delete(args):
    system = LuxBackupSystem(args.destination)
    result = system.delete_backup(args.backup_id)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Lux Automaton AI Backup System')
    sub = parser.add_subparsers()

    p_backup = sub.add_parser('backup', help='Create a backup')
    p_backup.add_argument('--name', help='Backup name')
    p_backup.add_argument('--sources', nargs='+', help='Directories/files to backup')
    p_backup.add_argument('--tags', help='Comma-separated tags')
    p_backup.add_argument('--no-compress', action='store_true')
    p_backup.add_argument('--destination', default=None)
    p_backup.set_defaults(func=cmd_backup)

    p_restore = sub.add_parser('restore', help='Restore from backup')
    p_restore.add_argument('--backup-id', required=True)
    p_restore.add_argument('--path', help='Restore destination path')
    p_restore.add_argument('--files', nargs='+', help='Specific files to restore')
    p_restore.add_argument('--destination', default=None)
    p_restore.set_defaults(func=cmd_restore)

    p_list = sub.add_parser('list', help='List backups')
    p_list.add_argument('--destination', default=None)
    p_list.set_defaults(func=cmd_list)

    p_delete = sub.add_parser('delete', help='Delete a backup')
    p_delete.add_argument('--backup-id', required=True)
    p_delete.add_argument('--destination', default=None)
    p_delete.set_defaults(func=cmd_delete)

    args = parser.parse_args()
    if hasattr(args, 'func'):
        args.func(args)
    else:
        parser.print_help()
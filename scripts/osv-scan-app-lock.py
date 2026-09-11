#!/usr/bin/env python3
"""Extract the social-app YAML document from root pnpm-lock.yaml and scan it.

pnpm 11 writes two concatenated YAML documents in one lockfile:

- Document 0 (first): env / package-manager lock (~19 packages).
- Document 1 (last): project / social-app lock (thousands of packages).

osv-scanner v2 unmarshals only the first document, so ``osv-scanner -r .``
understates dependency risk. This script copies the last document out-of-tree
(the committed lockfile is not rewritten) and runs osv-scanner against that
copy so the social-app tree is visible.

See docs/security/osv-scanner.md and https://github.com/johnwarden/bluenotes/issues/48.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LOCKFILE = ROOT / 'pnpm-lock.yaml'

# Resolution entries in the first (env) document stay in the tens. The app
# document has thousands. These floors fail closed if extract/scan regresses
# to the 19-package first document.
MIN_APP_LOCK_PACKAGES = 500
MIN_SCANNED_PACKAGES = 200


def split_yaml_documents(text: str) -> list[str]:
    """Split a YAML stream on document-start markers without parsing YAML.

    A line that is only ``---`` (optional surrounding whitespace) starts a new
    document. A leading marker does not create an empty first document. The
    last non-empty document is the pnpm project lockfile.
    """
    documents: list[list[str]] = []
    current: list[str] = []
    seen_marker = False

    for line in text.splitlines(keepends=True):
        if line.strip() == '---':
            if current:
                documents.append(current)
                current = []
            seen_marker = True
            continue
        current.append(line)

    if current:
        documents.append(current)
    elif seen_marker and not documents:
        documents.append(current)

    return [''.join(doc) for doc in documents if ''.join(doc).strip()]


def count_lockfile_packages(text: str) -> int:
    """Count pnpm v9 ``resolution:`` entries (one per packages: key)."""
    return sum(1 for line in text.splitlines() if 'resolution:' in line)


def write_extracted_docs(lockfile: Path, out_dir: Path) -> dict:
    """Write env (if present) and app lock documents under out_dir.

    Returns a coverage summary. App lock is always written as
    ``app/pnpm-lock.yaml`` so osv-scanner infers the pnpm parser.
    """
    text = lockfile.read_text(encoding='utf-8')
    documents = split_yaml_documents(text)
    if not documents:
        raise SystemExit(f'no YAML documents in {lockfile}')

    out_dir.mkdir(parents=True, exist_ok=True)
    app_dir = out_dir / 'app'
    app_dir.mkdir(parents=True, exist_ok=True)
    app_path = app_dir / 'pnpm-lock.yaml'
    app_path.write_text(documents[-1], encoding='utf-8')

    env_path = None
    if len(documents) > 1:
        env_dir = out_dir / 'env'
        env_dir.mkdir(parents=True, exist_ok=True)
        env_path = env_dir / 'pnpm-lock.yaml'
        env_path.write_text(documents[0], encoding='utf-8')

    doc_summaries = []
    for index, document in enumerate(documents):
        kind = 'app' if index == len(documents) - 1 else 'env'
        if len(documents) == 1:
            kind = 'app'
        doc_summaries.append(
            {
                'index': index,
                'kind': kind,
                'packages': count_lockfile_packages(document),
            }
        )

    return {
        'lockfile': str(lockfile),
        'documents': len(documents),
        'docs': doc_summaries,
        'app_lock': str(app_path),
        'env_lock': str(env_path) if env_path else None,
        'app_packages': count_lockfile_packages(documents[-1]),
        'env_packages': count_lockfile_packages(documents[0])
        if len(documents) > 1
        else 0,
    }


def assert_app_lock_coverage(
    summary: dict,
    min_app_packages: int = MIN_APP_LOCK_PACKAGES,
) -> None:
    """Fail if the extracted app document is still the tiny env lock."""
    app_packages = summary['app_packages']
    if app_packages < min_app_packages:
        raise SystemExit(
            f'extracted app lock has {app_packages} packages; '
            f'expected at least {min_app_packages}. '
            'osv-scanner is probably still looking at the first YAML document.'
        )


def count_osv_packages(results: dict) -> tuple[int, int, int]:
    """Return (packages, packages_with_vulns, vulnerability_ids)."""
    packages = 0
    packages_with_vulns = 0
    vulnerability_ids = 0
    for result in results.get('results') or []:
        for package in result.get('packages') or []:
            packages += 1
            vulns = package.get('vulnerabilities') or []
            if vulns:
                packages_with_vulns += 1
                vulnerability_ids += len(vulns)
    return packages, packages_with_vulns, vulnerability_ids


def run_osv_scanner(
    lockfile: Path,
    output_file: Path,
    osv_scanner: str,
) -> dict:
    """Run osv-scanner on one lockfile and return the JSON report."""
    output_file.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        osv_scanner,
        'scan',
        'source',
        '--lockfile',
        str(lockfile),
        '--all-packages',
        '--format',
        'json',
        '--output-file',
        str(output_file),
        '--verbosity',
        'error',
    ]
    try:
        completed = subprocess.run(cmd, check=False)
    except FileNotFoundError as exc:
        raise SystemExit(
            f'{osv_scanner} not found. Install osv-scanner v2 '
            '(https://google.github.io/osv-scanner/) or pass --osv-scanner.'
        ) from exc

    if not output_file.is_file():
        raise SystemExit(
            f'osv-scanner exited {completed.returncode} without writing {output_file}'
        )
    try:
        report = json.loads(output_file.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        raise SystemExit(f'osv-scanner wrote invalid JSON to {output_file}: {exc}') from exc
    return report


def print_report(lines: list[str]) -> None:
    print('\n'.join(lines), flush=True)


def cmd_extract(args: argparse.Namespace) -> int:
    summary = write_extracted_docs(args.lockfile, args.out_dir)
    print_report(
        [
            f'lockfile: {summary["lockfile"]}',
            f'documents: {summary["documents"]}',
            f'env packages: {summary["env_packages"]}',
            f'app packages: {summary["app_packages"]}',
            f'app lock: {summary["app_lock"]}',
        ]
    )
    if args.json:
        print(json.dumps(summary, indent=2))
    return 0


def cmd_coverage(args: argparse.Namespace) -> int:
    out_dir = args.out_dir or Path(tempfile.mkdtemp(prefix='osv-app-lock-'))
    summary = write_extracted_docs(args.lockfile, out_dir)
    assert_app_lock_coverage(summary, args.min_app_packages)
    print_report(
        [
            '== pnpm-lock.yaml documents ==',
            f'  documents: {summary["documents"]}',
            f'  env packages (first document): {summary["env_packages"]}',
            f'  app packages (last document): {summary["app_packages"]}',
            f'  extracted app lock: {summary["app_lock"]}',
            f'  coverage: OK (>= {args.min_app_packages})',
        ]
    )
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    out_dir = args.out_dir or Path(tempfile.mkdtemp(prefix='osv-app-lock-'))
    summary = write_extracted_docs(args.lockfile, out_dir)
    assert_app_lock_coverage(summary, args.min_app_packages)

    naive_packages = None
    if args.compare_naive:
        naive_report = run_osv_scanner(
            args.lockfile,
            out_dir / 'osv-naive.json',
            args.osv_scanner,
        )
        naive_packages, _, _ = count_osv_packages(naive_report)

    app_report = run_osv_scanner(
        Path(summary['app_lock']),
        out_dir / 'osv-app.json',
        args.osv_scanner,
    )
    scanned, with_vulns, vuln_ids = count_osv_packages(app_report)
    if scanned < args.min_scanned_packages:
        raise SystemExit(
            f'osv-scanner parsed {scanned} packages from the extracted app lock; '
            f'expected at least {args.min_scanned_packages}. '
            'The social-app tree is still not visible.'
        )

    coverage_path = out_dir / 'coverage.json'
    coverage = {
        **summary,
        'naive_osv_packages': naive_packages,
        'scanned_app_packages': scanned,
        'packages_with_vulnerabilities': with_vulns,
        'vulnerability_ids': vuln_ids,
        'report': str(out_dir / 'osv-app.json'),
    }
    coverage_path.write_text(json.dumps(coverage, indent=2) + '\n', encoding='utf-8')

    lines = [
        '== pnpm-lock.yaml documents ==',
        f'  documents: {summary["documents"]}',
        f'  env packages (first document): {summary["env_packages"]}',
        f'  app packages (last document): {summary["app_packages"]}',
        '',
        '== osv-scanner coverage ==',
    ]
    if naive_packages is not None:
        lines.append(f'  in-tree lockfile (first document only): {naive_packages} packages')
    lines.extend(
        [
            f'  extracted app lock: {scanned} packages',
            f'  coverage: OK (>= {args.min_scanned_packages})',
            '',
            '== vulnerabilities (advisory; not a merge gate) ==',
            f'  packages with known vulns: {with_vulns}',
            f'  vulnerability IDs: {vuln_ids}',
            f'  report: {out_dir / "osv-app.json"}',
        ]
    )
    print_report(lines)

    if args.strict and with_vulns:
        raise SystemExit(
            f'--strict: {with_vulns} packages have known vulnerabilities'
        )
    return 0


class SplitYamlDocumentsTests(unittest.TestCase):
    def test_dual_document_with_leading_marker(self) -> None:
        text = '---\nlockfileVersion: "9.0"\nenv: true\n---\nlockfileVersion: "9.0"\napp: true\n'
        docs = split_yaml_documents(text)
        self.assertEqual(len(docs), 2)
        self.assertIn('env: true', docs[0])
        self.assertIn('app: true', docs[1])
        self.assertNotIn('---', docs[0])
        self.assertNotIn('---', docs[1])

    def test_single_document_without_marker(self) -> None:
        text = 'lockfileVersion: "9.0"\npackages:\n  foo@1.0.0:\n    resolution: {integrity: x}\n'
        docs = split_yaml_documents(text)
        self.assertEqual(len(docs), 1)
        self.assertIn('foo@1.0.0', docs[0])

    def test_last_document_is_app_lock(self) -> None:
        env = 'lockfileVersion: "9.0"\npackages:\n  pnpm@1.0.0:\n    resolution: {integrity: a}\n'
        app = (
            'lockfileVersion: "9.0"\npackages:\n'
            '  react@19.0.0:\n    resolution: {integrity: b}\n'
            '  expo@54.0.0:\n    resolution: {integrity: c}\n'
        )
        docs = split_yaml_documents(f'---\n{env}---\n{app}')
        self.assertEqual(count_lockfile_packages(docs[0]), 1)
        self.assertEqual(count_lockfile_packages(docs[-1]), 2)


class ExtractCoverageTests(unittest.TestCase):
    def test_extract_writes_app_lock_without_marker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            lockfile = Path(tmp) / 'pnpm-lock.yaml'
            lockfile.write_text(
                '---\nlockfileVersion: "9.0"\npackages:\n  pnpm@1.0.0:\n    resolution: {integrity: a}\n'
                '---\nlockfileVersion: "9.0"\npackages:\n  react@19.0.0:\n    resolution: {integrity: b}\n',
                encoding='utf-8',
            )
            out_dir = Path(tmp) / 'out'
            summary = write_extracted_docs(lockfile, out_dir)
            app_text = Path(summary['app_lock']).read_text(encoding='utf-8')
            self.assertTrue(app_text.startswith('lockfileVersion:'))
            self.assertIn('react@19.0.0', app_text)
            self.assertNotIn('pnpm@1.0.0', app_text)
            self.assertEqual(summary['env_packages'], 1)
            self.assertEqual(summary['app_packages'], 1)
            self.assertIsNotNone(summary['env_lock'])
            env_text = Path(summary['env_lock']).read_text(encoding='utf-8')
            self.assertIn('pnpm@1.0.0', env_text)

    def test_coverage_rejects_tiny_app_document(self) -> None:
        summary = {'app_packages': 19}
        with self.assertRaises(SystemExit):
            assert_app_lock_coverage(summary, min_app_packages=500)

    def test_real_root_lockfile_has_app_scale_last_document(self) -> None:
        if not DEFAULT_LOCKFILE.is_file():
            self.skipTest('root pnpm-lock.yaml not present')
        with tempfile.TemporaryDirectory() as tmp:
            summary = write_extracted_docs(DEFAULT_LOCKFILE, Path(tmp))
        self.assertGreaterEqual(summary['documents'], 2)
        self.assertLess(summary['env_packages'], 50)
        self.assertGreaterEqual(summary['app_packages'], MIN_APP_LOCK_PACKAGES)
        assert_app_lock_coverage(summary)


def cmd_selftest(_args: argparse.Namespace) -> int:
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


def build_parser() -> argparse.ArgumentParser:
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument(
        '--lockfile',
        type=Path,
        default=DEFAULT_LOCKFILE,
        help='Path to a pnpm-lock.yaml (default: repo root)',
    )
    shared.add_argument(
        '--out-dir',
        type=Path,
        default=None,
        help='Directory for extracted lockfiles and JSON reports',
    )
    shared.add_argument(
        '--osv-scanner',
        default=os.environ.get('OSV_SCANNER', 'osv-scanner'),
        help='osv-scanner binary (default: OSV_SCANNER or osv-scanner on PATH)',
    )
    shared.add_argument(
        '--min-app-packages',
        type=int,
        default=MIN_APP_LOCK_PACKAGES,
        help=f'Minimum resolution entries in the last document (default: {MIN_APP_LOCK_PACKAGES})',
    )
    shared.add_argument(
        '--min-scanned-packages',
        type=int,
        default=MIN_SCANNED_PACKAGES,
        help=f'Minimum packages osv-scanner must parse from the app lock (default: {MIN_SCANNED_PACKAGES})',
    )
    shared.add_argument(
        '--compare-naive',
        action='store_true',
        help='Also scan the in-tree lockfile to show the first-document-only gap',
    )
    shared.add_argument(
        '--strict',
        action='store_true',
        help='Exit non-zero when the app-lock scan reports vulnerabilities',
    )
    shared.add_argument(
        '--json',
        action='store_true',
        help='With extract, also print the summary as JSON',
    )

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('extract', parents=[shared], help='Write env/app documents out-of-tree')
    sub.add_parser(
        'coverage',
        parents=[shared],
        help='Extract and require an app-scale last document',
    )
    sub.add_parser(
        'scan',
        parents=[shared],
        help='Extract, scan the app document, require coverage',
    )
    sub.add_parser('selftest', parents=[shared], help='Run unit tests for document splitting')
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.out_dir is None and args.command == 'extract':
        parser.error('extract requires --out-dir')

    if args.command == 'extract':
        return cmd_extract(args)
    if args.command == 'coverage':
        return cmd_coverage(args)
    if args.command == 'scan':
        return cmd_scan(args)
    if args.command == 'selftest':
        return cmd_selftest(args)
    parser.error(f'unknown command {args.command}')
    return 2


if __name__ == '__main__':
    sys.exit(main())

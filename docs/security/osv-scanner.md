# OSV-Scanner and the dual-document `pnpm-lock.yaml`

Root `pnpm-lock.yaml` is two YAML documents concatenated in one file (pnpm 11):

| Document | What it is | Scale |
| --- | --- | --- |
| First | Env / package-manager lock (`configDependencies`, `packageManagerDependencies`) | Tens of packages (~19) |
| Last | Project / social-app lock (`importers`, app `packages`) | Thousands of packages |

osv-scanner v2 unmarshals only the first document. A default recursive scan
(`osv-scanner scan source -r .`) therefore reports the package-manager set and
misses the social-app tree. That is a coverage gap, not a clean bill of health.

## Command

Extract the last document out-of-tree (do not rewrite the committed lockfile)
and scan that copy:

```bash
python3 scripts/osv-scan-app-lock.py selftest
python3 scripts/osv-scan-app-lock.py coverage
python3 scripts/osv-scan-app-lock.py scan --compare-naive --out-dir /tmp/osv-app-lock
```

`just osv-scan` runs the `scan` command. CI is `.github/workflows/osv-scanner.yml`.

The script fails if the extracted app document or osv-scanner's parse is still
first-document-sized. Vulnerability findings are printed and written to
`osv-app.json` but are **advisory** (not a merge gate). `--strict` fails on
findings once triage from issue #43 decides what to gate.

## Why not point osv-scanner at the in-tree file?

`--lockfile=pnpm-lock.yaml` still parses only document 0. The workaround is a
single-document copy of the last document, named `pnpm-lock.yaml` so the pnpm
parser is used.

## Other lockfiles

`bskyogcard/pnpm-lock.yaml` and `dev-env/pnpm-lock.yaml` use the same two-document
shape. Pass `--lockfile` to scan one of those the same way. `bskyembed/pnpm-lock.yaml`
is a single document and can be scanned directly.

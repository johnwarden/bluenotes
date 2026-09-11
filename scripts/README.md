# Tool Scripts

## osv-scan-app-lock.py

Extract the last YAML document from root `pnpm-lock.yaml` (the social-app lock)
and scan it with osv-scanner. The committed lockfile is two documents; osv-scanner
v2 only sees the first. See `docs/security/osv-scanner.md`.

## updateExtensions.sh

Updates the extensions in `/modules` with the current iOS/Android project changes.

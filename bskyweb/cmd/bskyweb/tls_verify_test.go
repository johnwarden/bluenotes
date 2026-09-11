package main

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const insecureSkipVerifyIdent = "InsecureSkipVerify"

func isSkippedTLSGuardPath(rel string) bool {
	base := filepath.Base(rel)
	if strings.HasSuffix(base, "_test.go") {
		return true
	}
	// Debug-only constructors may live in dedicated files.
	if strings.HasSuffix(base, "_debug.go") || strings.HasPrefix(base, "debug_") {
		return true
	}
	return false
}

func findInsecureSkipVerify(root string) ([]string, error) {
	var hits []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			switch d.Name() {
			case ".git", "vendor", "node_modules", "dist", "build":
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			rel = path
		}
		if isSkippedTLSGuardPath(rel) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if bytes.Contains(data, []byte(insecureSkipVerifyIdent)) {
			hits = append(hits, filepath.ToSlash(rel))
		}
		return nil
	})
	return hits, err
}

func repoRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "../../.."))
}

func TestProductionGoDoesNotSkipTLSVerify(t *testing.T) {
	hits, err := findInsecureSkipVerify(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) > 0 {
		t.Fatalf("InsecureSkipVerify found outside test/debug Go files: %s", strings.Join(hits, ", "))
	}
}

func TestTLSGuardAllowsTestAndDebugFiles(t *testing.T) {
	dir := t.TempDir()
	mustWrite := func(name, contents string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dir, name), []byte(contents), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	mustWrite("prod.go", "package p\nconst x = 1\n")
	mustWrite("bad.go", "package p\nvar cfg = struct{ InsecureSkipVerify bool }{InsecureSkipVerify: true}\n")
	mustWrite("ok_test.go", "package p\nvar cfg = struct{ InsecureSkipVerify bool }{InsecureSkipVerify: true}\n")
	mustWrite("client_debug.go", "package p\nvar cfg = struct{ InsecureSkipVerify bool }{InsecureSkipVerify: true}\n")
	mustWrite("debug_tls.go", "package p\nvar cfg = struct{ InsecureSkipVerify bool }{InsecureSkipVerify: true}\n")

	hits, err := findInsecureSkipVerify(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 || hits[0] != "bad.go" {
		t.Fatalf("hits = %v, want [bad.go]", hits)
	}
}

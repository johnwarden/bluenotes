package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

/**
 * Product-home strings that the 1.133 rebase restored from upstream. A
 * regression here shows Bluesky on the splash and in link-preview cards.
 */
var forbiddenProductBranding = []string{
	`content="Bluesky"`,
	`content="Bluesky Social"`,
	" on Bluesky",
	"Learn more about Bluesky",
	"Join this group chat on Bluesky",
	"| Bluesky Feed",
	" - Bluesky",
	"{%- block head_title -%}Bluesky",
	"{% block head_title %}Bluesky",
	"https://bsky.social\">bsky.social",
	"<!-- Bluesky SVG -->",
}

func readRepoFile(t *testing.T, rel string) string {
	t.Helper()
	path := filepath.Join("..", "..", "..", rel)
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", rel, err)
	}
	return string(b)
}

func TestBskywebTemplatesUseBluenotesProductBranding(t *testing.T) {
	dir := filepath.Join("..", "..", "templates")
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read templates: %v", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".html") {
			continue
		}
		rel := filepath.Join("bskyweb", "templates", entry.Name())
		content := readRepoFile(t, rel)
		for _, needle := range forbiddenProductBranding {
			if strings.Contains(content, needle) {
				t.Errorf("%s still contains Bluesky product branding %q", rel, needle)
			}
		}
	}

	base := readRepoFile(t, "bskyweb/templates/base.html")
	for _, want := range []string{
		`content="Bluenotes"`,
		`content="Bluenotes Social"`,
		`name="apple-mobile-web-app-title" content="Bluenotes"`,
		"Learn more about Bluenotes",
		"https://bluenotes.social",
		`viewBox="0 0 500 441"`,
	} {
		if !strings.Contains(base, want) {
			t.Errorf("base.html missing Bluenotes branding %q", want)
		}
	}
}

func TestWebIndexUsesBluenotesSplash(t *testing.T) {
	content := readRepoFile(t, "web/index.html")
	for _, needle := range []string{
		`content="Bluesky"`,
		"<!-- Bluesky SVG -->",
		`viewBox="0 0 64 57"`,
	} {
		if strings.Contains(content, needle) {
			t.Errorf("web/index.html still contains Bluesky splash branding %q", needle)
		}
	}
	for _, want := range []string{
		`name="application-name" content="Bluenotes"`,
		`name="apple-mobile-web-app-title" content="Bluenotes"`,
		`viewBox="0 0 500 441"`,
		"https://bluenotes.social",
	} {
		if !strings.Contains(content, want) {
			t.Errorf("web/index.html missing Bluenotes splash branding %q", want)
		}
	}
}

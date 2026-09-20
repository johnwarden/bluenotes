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
	" — Bluesky",
	"{%- block head_title -%}Bluesky",
	"{% block head_title %}Bluesky",
	"https://bsky.social\">bsky.social",
	"<!-- Bluesky SVG -->",
	`content="Bluenotes"`,
	`content="Bluenotes Social"`,
	" on Bluenotes",
	"Learn more about Bluenotes",
	"Join this group chat on Bluenotes",
	"| Bluenotes Feed",
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
		`content="Blue Notes"`,
		`content="Blue Notes Social"`,
		`name="apple-mobile-web-app-title" content="Blue Notes"`,
		"Learn more about Blue Notes",
		"https://bluenotes.social",
		`viewBox="0 0 500 441"`,
	} {
		if !strings.Contains(base, want) {
			t.Errorf("base.html missing Blue Notes branding %q", want)
		}
	}
}

func TestWebIndexUsesBluenotesSplash(t *testing.T) {
	content := readRepoFile(t, "web/index.html")
	for _, needle := range []string{
		`content="Bluesky"`,
		`content="Bluenotes"`,
		"<!-- Bluesky SVG -->",
		`viewBox="0 0 64 57"`,
	} {
		if strings.Contains(content, needle) {
			t.Errorf("web/index.html still contains Bluesky splash branding %q", needle)
		}
	}
	for _, want := range []string{
		`name="application-name" content="Blue Notes"`,
		`name="apple-mobile-web-app-title" content="Blue Notes"`,
		`viewBox="0 0 500 441"`,
		"https://bluenotes.social",
	} {
		if !strings.Contains(content, want) {
			t.Errorf("web/index.html missing Blue Notes splash branding %q", want)
		}
	}
}

func TestAppNameAndWebNameAreSpacedBlueNotes(t *testing.T) {
	constants := readRepoFile(t, "src/lib/constants.ts")
	if !strings.Contains(constants, `export const APP_NAME = 'Blue Notes'`) {
		t.Error("APP_NAME must be the spaced display name 'Blue Notes'")
	}
	if strings.Contains(constants, `export const APP_NAME = 'Bluenotes'`) {
		t.Error("APP_NAME still uses one-word Bluenotes")
	}

	config := readRepoFile(t, "app.config.js")
	if !strings.Contains(config, `name: 'Blue Notes'`) {
		t.Error("app.config.js web.name must be 'Blue Notes'")
	}
	if strings.Contains(config, `name: 'Bluenotes'`) {
		t.Error("app.config.js still uses one-word Bluenotes")
	}
}

func TestDocumentTitleUsesSpacedBlueNotes(t *testing.T) {
	headings := readRepoFile(t, "src/lib/strings/headings.ts")
	if !strings.Contains(headings, "APP_NAME") {
		t.Error("bskyTitle must use APP_NAME so signed-in tab titles stay Blue Notes")
	}
	if strings.Contains(headings, "— Bluesky") {
		t.Error("headings.ts still suffixes tab titles with Bluesky")
	}
	if strings.Contains(headings, "— Bluenotes") {
		t.Error("headings.ts still suffixes tab titles with one-word Bluenotes")
	}
}

package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func oauthStaticDir(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Join(filepath.Dir(thisFile), "../../static")
	if _, err := os.Stat(filepath.Join(dir, "oauth-client-metadata.json")); err != nil {
		t.Fatalf("oauth metadata missing under %s: %v", dir, err)
	}
	return dir
}

func TestOAuthClientMetadataRoutesServeFromFS(t *testing.T) {
	// Same FileServer pattern production uses (embed FS in the Fly image,
	// local DirFS in debug). Do not use c.File — that reads process CWD.
	staticHandler := http.FileServer(http.FS(os.DirFS(oauthStaticDir(t))))

	e := echo.New()
	e.GET("/oauth-client-metadata.json", serveOAuthClientMetadata(staticHandler))
	e.GET("/oauth-client-metadata.native.json", serveOAuthClientMetadata(staticHandler))

	cases := []struct {
		path     string
		clientID string
	}{
		{"/oauth-client-metadata.json", "https://bluenotes.social/oauth-client-metadata.json"},
		{"/oauth-client-metadata.native.json", "https://bluenotes.social/oauth-client-metadata.native.json"},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status %d, body %s", rec.Code, rec.Body.String())
			}
			if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
				t.Fatalf("Content-Type %q, want application/json", ct)
			}
			if rec.Header().Get("Cache-Control") != "public, max-age=300" {
				t.Fatalf("Cache-Control %q", rec.Header().Get("Cache-Control"))
			}

			var meta struct {
				ClientID string `json:"client_id"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &meta); err != nil {
				t.Fatalf("invalid JSON: %v", err)
			}
			if meta.ClientID != tc.clientID {
				t.Fatalf("client_id = %q, want %q", meta.ClientID, tc.clientID)
			}
		})
	}
}

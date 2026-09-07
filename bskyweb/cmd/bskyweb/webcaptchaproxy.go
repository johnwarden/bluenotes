package main

import(
	"github.com/labstack/echo/v4"
	"net/http"
	"net/url"
	"io"
	"strings"
	"time"
)

func (srv *Server) WebCaptchaProxy(c echo.Context) error {
	// Proxy to Bluesky's captcha service
	targetURL := "https://bsky.social" + c.Request().URL.Path
	if c.Request().URL.RawQuery != "" {
		targetURL += "?" + c.Request().URL.RawQuery
	}

	// Create request to Bluesky's service
	req, err := http.NewRequest(c.Request().Method, targetURL, c.Request().Body)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to create proxy request")
	}

	// Copy headers from original request
	for name, values := range c.Request().Header {
		// Skip hop-by-hop headers
		if name == "Connection" || name == "Upgrade" || name == "Proxy-Connection" {
			continue
		}
		for _, value := range values {
			req.Header.Add(name, value)
		}
	}

	// Make request to Bluesky
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Don't follow redirects automatically - we'll handle them manually
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return c.String(http.StatusBadGateway, "Failed to reach captcha service")
	}
	defer resp.Body.Close()

	// Handle redirects by rewriting the Location header
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		location := resp.Header.Get("Location")
		if location != "" {
			// Parse the redirect URL
			redirectURL, err := url.Parse(location)
			if err == nil {
				// If it's redirecting to bsky.app, change it to our domain
				if redirectURL.Host == "bsky.app" {
					// In development, redirect to the React Native app port (19006)
					// In production, redirect to the same host
					originalScheme := "http"
					if c.Request().TLS != nil {
						originalScheme = "https"
					}
					redirectURL.Scheme = originalScheme

					// Check if this is development (localhost:8100) and redirect to React Native app
					if strings.Contains(c.Request().Host, "localhost:8100") {
						redirectURL.Host = "localhost:19006"
					} else {
						redirectURL.Host = c.Request().Host
					}
					resp.Header.Set("Location", redirectURL.String())
				}
			}
		}
	}

	// Copy response headers (excluding frame options)
	for name, values := range resp.Header {
		// Skip hop-by-hop headers and frame options
		if name == "Connection" || name == "Upgrade" || name == "Transfer-Encoding" || name == "X-Frame-Options" {
			continue
		}
		for _, value := range values {
			c.Response().Header().Add(name, value)
		}
	}

	// Set status code
	c.Response().WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(c.Response().Writer, resp.Body)
	return err
}

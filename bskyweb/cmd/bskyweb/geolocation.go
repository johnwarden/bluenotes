package main

import (
	"encoding/json"
	"fmt"
	"github.com/labstack/echo/v4"
)


// GeolocationResponse represents the response format for geolocation data
type GeolocationResponse struct {
	CountryCode       string                   `json:"countryCode"`
	RegionCode        string                   `json:"regionCode,omitempty"`
	AgeRestrictedGeos []GeolocationRestriction `json:"ageRestrictedGeos"`
	AgeBlockedGeos    []GeolocationRestriction `json:"ageBlockedGeos"`
}

type GeolocationRestriction struct {
	CountryCode string  `json:"countryCode"`
	RegionCode  *string `json:"regionCode"`
}

// WebGeolocationConfig provides geolocation configuration based on user's IP
func (srv *Server) WebGeolocationConfig(c echo.Context) error {
	userIP := c.RealIP()
	log.Debugf("Getting geolocation for IP: %s", userIP)

	// Get country and region from IP
	countryCode, regionCode := srv.getLocationFromIP(userIP)

	// Define age-restricted and blocked geos (same as Bluesky's current config)
	ageRestrictedGeos := []GeolocationRestriction{
		{CountryCode: "GB", RegionCode: nil},
		{CountryCode: "US", RegionCode: stringPtr("SD")},
		{CountryCode: "US", RegionCode: stringPtr("WY")},
	}

	ageBlockedGeos := []GeolocationRestriction{
		{CountryCode: "US", RegionCode: stringPtr("MS")},
	}

	response := GeolocationResponse{
		CountryCode:       countryCode,
		RegionCode:        regionCode,
		AgeRestrictedGeos: ageRestrictedGeos,
		AgeBlockedGeos:    ageBlockedGeos,
	}

	log.Debugf("Geolocation result for IP %s: %s/%s", userIP, countryCode, regionCode)
	return c.JSON(200, response)
}

// getLocationFromIP returns country and region code for an IP address
func (srv *Server) getLocationFromIP(ip string) (countryCode, regionCode string) {
	// For now, use a simple IP-to-country service
	// In production, you'd want to use MaxMind GeoLite2 or similar

	// Try ipapi.co first (free tier: 30,000 requests/month)
	if country, region := srv.queryIPAPI(ip); country != "" {
		return country, region
	}

	// Fallback to ip-api.com (free tier: 1000 requests/hour)
	if country, region := srv.queryIPAPIcom(ip); country != "" {
		return country, region
	}

	// Default fallback
	return "", ""
}

// queryIPAPI queries ipapi.co for geolocation data
func (srv *Server) queryIPAPI(ip string) (countryCode, regionCode string) {
	url := fmt.Sprintf("https://ipapi.co/%s/json/", ip)

	resp, err := srv.ipccClient.Get(url)
	if err != nil {
		log.Debugf("ipapi.co error: %v", err)
		return "", ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", ""
	}

	var result struct {
		CountryCode string `json:"country_code"`
		Region      string `json:"region"`
		RegionCode  string `json:"region_code"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Debugf("ipapi.co decode error: %v", err)
		return "", ""
	}

	return result.CountryCode, result.RegionCode
}

// queryIPAPIcom queries ip-api.com for geolocation data
func (srv *Server) queryIPAPIcom(ip string) (countryCode, regionCode string) {
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,countryCode,region", ip)

	resp, err := srv.ipccClient.Get(url)
	if err != nil {
		log.Debugf("ip-api.com error: %v", err)
		return "", ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", ""
	}

	var result struct {
		Status      string `json:"status"`
		CountryCode string `json:"countryCode"`
		Region      string `json:"region"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Debugf("ip-api.com decode error: %v", err)
		return "", ""
	}

	if result.Status != "success" {
		return "", ""
	}

	return result.CountryCode, result.Region
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	return &s
}
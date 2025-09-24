# Community Notes Deployment Plan

## Overview

This document outlines the deployment plan for "Bluenotes" - a fork of the Bluesky social app with Community Notes functionality - to be deployed on Fly.io as an open beta.

## Architecture Analysis

### Current Infrastructure
- **Frontend**: React Native Web app built with Expo
- **Backend**: Go-based web server (`bskyweb`) that serves static files and handles server-side rendering
- **Build Process**: Multi-stage Docker build (Node.js + Go)
- **AT Protocol Integration**: Uses Bluesky's production infrastructure
- **Community Notes Service**: Custom service at `https://api.c10t.es`

### Key Findings
1. **AT Protocol Services**: App defaults to `https://public.api.bsky.app` (production Bluesky infrastructure)
2. **Localhost Switching**: When users choose localhost PDS, it automatically switches to localhost AppView
3. **Community Notes Integration**: Already configured with service URL switching based on environment
4. **OGCard Service**: Uses Bluesky's OGCard service (confirmed cross-domain compatible via `<img>` tags)
5. **Data Persistence**: Sessions stored in browser localStorage/MMKV - no server-side persistence needed initially

## Deployment Strategy

### Phase 1: Minimal Viable Deployment ✅
1. **Rebrand to Bluenotes** - Change app name, keep same logo initially
2. **Configure Fly.io** - Single machine deployment in SJC region
3. **Environment Setup** - Production environment variables and secrets
4. **Deploy** - Get basic version running on `bluenotes.social`

### Phase 2: Production Hardening (Later TODOs)
1. **Monitoring** - Add Sentry error reporting
2. **CI/CD** - Automated GitHub deployment pipeline
3. **CDN** - Cloudflare integration for static assets
4. **Scaling** - Multi-region deployment if needed

## Technical Decisions

### Bundle Identifiers
Bundle identifiers are unique app identifiers used by mobile platforms:
- **iOS**: `xyz.blueskyweb.app` → `social.bluenotes.app`
- **Android**: `xyz.blueskyweb.app` → `social.bluenotes.app`
- **Extensions**: Various iOS extensions (Share, Notifications, App Clip)

### Infrastructure Reuse
- ✅ **AT Protocol Services**: Use Bluesky's production infrastructure (`https://public.api.bsky.app`)
- ✅ **Community Notes Service**: Use existing service at `https://api.c10t.es`
- ❓ **OGCard Service**: Investigate if Bluesky's OGCard service allows cross-domain requests
- ✅ **Link Service**: Optional, can be left empty initially

### Data Persistence
- **Sessions**: Stored client-side (localStorage/MMKV)
- **User Data**: Stored in AT Protocol infrastructure
- **Community Notes**: Stored in Community Notes service
- **No server-side persistence required** for initial deployment

### Single Service Deployment
- **Single Fly.io instance** running the `bskyweb` Go server
- **No additional services needed** - all external dependencies are already hosted
- **Port 8100** internally (configurable via `HTTP_ADDRESS`)

## Environment Configuration

### Required Environment Variables

#### AT Protocol Services
```bash
# Production Bluesky infrastructure (default)
ATP_APPVIEW_HOST=https://public.api.bsky.app

# Optional: OGCard service (investigate cross-domain support)
OGCARD_HOST=https://ogcard.bsky.app

# Optional: Link service (can be empty)
LINK_HOST=

# Community Notes service (already configured)
# Automatically determined based on ATP_APPVIEW_HOST
```

#### Web Server Configuration
```bash
# Server binding
HTTP_ADDRESS=:8100

# CORS configuration for bluenotes.social
CORS_ALLOWED_ORIGINS=https://bluenotes.social,https://www.bluenotes.social

# Debug mode (false for production)
DEBUG=false

# No basic auth needed
BASIC_AUTH_PASSWORD=

# CDN configuration (for later)
STATIC_CDN_HOST=

# Canonical instance flag
BSKY_CANONICAL_INSTANCE=false

# Robots.txt (allow crawling for open beta)
ROBOTS_DISALLOW_ALL=false
```

#### Build-time Variables
```bash
# Environment designation
EXPO_PUBLIC_ENV=production

# Release version
EXPO_PUBLIC_RELEASE_VERSION=1.107.0

# Bundle identifier for tracking
EXPO_PUBLIC_BUNDLE_IDENTIFIER=bluenotes-production

# Bundle date (auto-generated)
EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")
```

### Secrets (Fly.io Secrets)
```bash
# Sentry (for later monitoring phase)
SENTRY_AUTH_TOKEN=<sentry-token>
EXPO_PUBLIC_SENTRY_DSN=<sentry-dsn>
```

### Domain Configuration
- **Primary Domain**: `bluenotes.social`
- **SSL**: Automatic via Fly.io
- **DNS**: Point to Fly.io's edge network

## Rebranding Checklist

### App Configuration (`app.config.js`)
- [ ] `name: 'Bluesky'` → `name: 'Bluenotes'`
- [ ] `slug: 'bluesky'` → `slug: 'bluenotes'`
- [ ] `scheme: 'bluesky'` → `scheme: 'bluenotes'`
- [ ] `owner: 'blueskysocial'` → `owner: 'johnwarden'` (or appropriate)
- [ ] `bundleIdentifier: 'xyz.blueskyweb.app'` → `social.bluenotes.app`
- [ ] `package: 'xyz.blueskyweb.app'` → `social.bluenotes.app`
- [ ] Update intent filters: `host: 'bsky.app'` → `host: 'bluenotes.social'`
- [ ] `CFBundleSpokenName: 'Blue Sky'` → `CFBundleSpokenName: 'Blue Notes'`

### Package Configuration (`package.json`)
- [ ] `"name": "bsky.app"` → `"name": "bluenotes.social"`

### Web Configuration (`web/index.html`)
- [ ] Update `<title>%WEB_TITLE%</title>` template
- [ ] Update preconnect domains if needed

### Go Server (`bskyweb/cmd/bskyweb/main.go`)
- [ ] Update CLI app description
- [ ] Update default CORS origins

### Docker Labels (`Dockerfile`)
- [ ] Update image source and description labels

### Logo Assets (23+ files to replace)
- [ ] **App Icons** - Replace all variants in `assets/app-icons/`:
  - [ ] `ios_icon_default_light.png` (primary iOS app icon)
  - [ ] `ios_icon_default_dark.png` (iOS dark mode)
  - [ ] `android_icon_default_light.png` (primary Android app icon)
  - [ ] `android_icon_default_dark.png` (Android dark mode)
  - [ ] `icon_default_next.png` (beta/next variant)
  - [ ] 18 themed variants (aurora, bonfire, sunrise, sunset, midnight, flat variants, etc.)

- [ ] **Splash Screen Assets**:
  - [ ] `assets/splash.png` (light mode splash background)
  - [ ] `assets/splash-dark.png` (dark mode splash background)
  - [ ] `assets/splash-android-icon.png` (Android splash icon)
  - [ ] `assets/splash-android-icon-dark.png` (Android dark splash icon)

- [ ] **Web Assets**:
  - [ ] `assets/favicon.png` (browser favicon)
  - [ ] `assets/logo.png` (general logo file)
  - [ ] `web/index.html` - Update inline SVG in splash div (line 150)

- [ ] **Kawaii Mode Assets** (if keeping feature):
  - [ ] `assets/kawaii.png` (large kawaii variant)
  - [ ] `assets/kawaii_smol.png` (small kawaii variant)

### Logo Code Components (SVG paths to update)
- [ ] `src/view/icons/Logo.tsx` - Update SVG path and accessibility label
- [ ] `src/view/icons/Logomark.tsx` - Update SVG path for logo mark only
- [ ] `src/view/icons/Logotype.tsx` - Update SVG path for "Bluenotes" text
- [ ] `src/Splash.tsx` - Update Logo component SVG path (line 42-45)

### Accessibility Labels
- [ ] `src/view/icons/Logo.tsx` line 41: `accessibilityLabel="Bluesky"` → `accessibilityLabel="Bluenotes"`
- [ ] Review all logo components for any remaining "Bluesky" accessibility references

## OGCard Service Integration ✅

### Confirmed Compatibility
1. **Cross-domain support**: ✅ Works from `bluenotes.social` via `<img>` tags (no CORS needed)
2. **Usage method**: Server-side rendering for social media cards and starter pack images
3. **Implementation**: Already integrated and working in current build

### Service Details
- **Endpoint**: `https://ogcard.cdn.bsky.app`
- **Method**: Used via `<img src="...">` tags, no CORS restrictions
- **Functionality**: Social sharing images, starter pack image generation
- **Status**: Ready for production use

## Community Notes Service Integration

### Current Configuration
The app already has sophisticated Community Notes service integration:

```typescript
// Automatic service URL determination
export function COMMUNITY_NOTES_SERVICE(serviceUrl: string) {
  if (IS_PROD_SERVICE(serviceUrl)) {
    return PROD_COMMUNITY_NOTES_SERVICE  // https://api.c10t.es
  }
  if (serviceUrl === STAGING_SERVICE) {
    return STAGING_COMMUNITY_NOTES_SERVICE  // https://api.c10t.es
  }
  return LOCAL_DEV_COMMUNITY_NOTES_SERVICE  // localhost:2595
}
```

### Localhost Notes Service
When users choose localhost PDS (development), the app should automatically switch to localhost Community Notes service. This is already implemented and will work correctly.

## Deployment Steps

### 1. Pre-deployment Setup
```bash
# Create app (don't deploy yet)
fly apps create bluenotes-web --region sjc
```

### 2. Rebranding
- Execute rebranding checklist above
- Test locally to ensure no breaking changes

### 3. Environment Configuration
```bash
# Set production secrets
fly secrets set SENTRY_AUTH_TOKEN=<token> -a bluenotes-web
fly secrets set EXPO_PUBLIC_SENTRY_DSN=<dsn> -a bluenotes-web

# Deploy configuration
fly deploy --no-cache -a bluenotes-web
```

### 4. Domain Setup
```bash
# Add custom domain
fly certs create bluenotes.social -a bluenotes-web
fly certs create www.bluenotes.social -a bluenotes-web

# Configure DNS (point to Fly.io)
# A record: bluenotes.social → <fly-ip>
# CNAME: www.bluenotes.social → bluenotes.social
```

### 5. Health Checks
- [ ] App loads correctly
- [ ] Login/logout functionality works
- [ ] Community Notes features work
- [ ] Cross-domain requests succeed
- [ ] Performance is acceptable

## Monitoring & Observability

### Health Checks
- **Endpoint**: `/health` (if available in bskyweb)
- **Metrics**: Response time, error rates
- **Alerts**: Downtime, high error rates

### Logging
- **Fly.io Logs**: `fly logs -a bluenotes-web`
- **Application Logs**: Go server logs
- **Error Tracking**: Sentry integration (Phase 2)

## Scaling Considerations

### Initial Deployment
- **Single machine**: 1 CPU, 1GB RAM
- **Auto-scaling**: Enabled for traffic spikes
- **Region**: SJC (San Jose) for US West Coast users

### Future Scaling
- **Multi-region**: Add regions based on user geography
- **Resource scaling**: Increase CPU/memory based on usage
- **CDN**: Cloudflare for static asset delivery

## Risk Assessment

### Medium Risk
- **Performance**: Single machine may not handle high traffic
- **Domain migration**: Users may be confused by domain change

### Low Risk
- **AT Protocol compatibility**: Using production Bluesky infrastructure
- **Build process**: Already containerized and tested

## Success Metrics

### Technical Metrics
- **Uptime**: >99.5%
- **Response time**: <2s for page loads
- **Error rate**: <1%

### User Metrics
- **Daily active users**: Track adoption
- **Community Notes engagement**: Notes created, ratings submitted
- **User retention**: Weekly/monthly retention rates

## Rollback Plan

### Emergency Rollback
1. **DNS change**: Point domain back to previous service
2. **Fly.io rollback**: `fly releases rollback -a bluenotes-web`
3. **Communication**: Notify users of temporary issues

### Gradual Rollback
1. **Feature flags**: Disable Community Notes features
2. **Traffic splitting**: Route percentage of traffic to old service
3. **Monitoring**: Watch metrics during transition

## Next Steps

1. **Execute rebranding** (Phase 1)
2. **Set up Fly.io configuration** (Phase 1)
3. **Deploy and test** (Phase 1)
4. **Investigate OGCard service** (Phase 1)
5. **Set up monitoring** (Phase 2)
6. **Implement CI/CD** (Phase 2)

---

*This deployment plan will be updated as we progress through implementation and discover additional requirements.*

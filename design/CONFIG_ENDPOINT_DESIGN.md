# Community Notes Configuration Endpoint Design

## Overview

This document describes the design and implementation of a dynamic configuration system for Community Notes that eliminates hardcoded environment-specific values and enables centralized configuration management.

## Problem Statement

Currently, the Community Notes integration has several issues:

1. **Hardcoded feed generator DIDs** in the frontend for different environments
2. **Hardcoded labeler DIDs** that require frontend updates to change
3. **Environment detection logic** scattered across the codebase
4. **Deployment complexity** when changing backend service configurations
5. **Development environment issues** with production feed URIs

## Solution: Dynamic Configuration via getConfig Endpoint

### Architecture

The Community Notes service will provide a `getConfig` XRPC endpoint that returns environment-specific configuration. The frontend will fetch this configuration at session initialization and use it throughout the app.

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Frontend      │    │  Community Notes     │    │  Environment        │
│   (Bluesky App) │    │  Service             │    │  Configuration      │
├─────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│ Session Init    │───▶│ getConfig endpoint   │───▶│ • Feed Generator    │
│ Config Query    │    │                      │    │   DIDs              │
│ Label Checking  │    │ Returns:             │    │ • Labeler DID       │
│ Feed Loading    │    │ • Feed URIs          │    │ • Version           │
│                 │    │ • Labeler DID        │    │                     │
└─────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## XRPC Endpoint Specification

### `org.opencommunitynotes.getConfig`

```typescript
{
  "lexicon": 1,
  "id": "org.opencommunitynotes.getConfig",
  "defs": {
    "main": {
      "type": "query",
      "description": "Get Community Notes service configuration including feed generator DID and labeler information",
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["feedGeneratorDid", "labelerDid", "version"],
          "properties": {
            "version": {
              "type": "string",
              "description": "Configuration version for cache invalidation (ISO 8601 timestamp)"
            },
            "labelerDid": {
              "type": "string",
              "format": "did",
              "description": "DID of the Community Notes labeler service"
            },
            "feedGeneratorDid": {
              "type": "string",
              "format": "did",
              "description": "DID of the Community Notes feed generator service"
            }
          }
        }
      }
    }
  }
}
```

### Example Responses

**Production Environment:**
```json
{
  "version": "2024-01-15T10:30:00Z",
  "labelerDid": "did:plc:community-notes-prod-labeler",
  "feedGeneratorDid": "did:plc:community-notes-prod-feeds"
}
```

**Development Environment:**
```json
{
  "version": "2024-01-15T10:30:00Z",
  "labelerDid": "did:plc:community-notes-dev-labeler",
  "feedGeneratorDid": "did:plc:community-notes-dev-feeds"
}
```

## Frontend Implementation

### 1. Configuration Query Hook

```typescript
// src/state/queries/community-notes-config.ts
export interface CommunityNotesConfig {
  version: string
  labelerDid: string
  feedGeneratorDid: string
  feeds?: {
    uri: string
  }[]
}

export function useCommunityNotesConfig() {
  const agent = useAgent()
  
  return useQuery({
    queryKey: ['community-notes-config'],
    queryFn: async () => {
      const serviceUrl = agent ? agent.service.toString() : 'https://bsky.social'
      const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrl)
      
      const response = await fetch(
        `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getConfig`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch Community Notes config')
      }
      
      return response.json() as CommunityNotesConfig
    },
    staleTime: STALE.MINUTES.FIVE, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
  })
}
```

### 2. Session Integration

```typescript
// src/state/session/index.tsx
export function SessionProvider({children}: React.PropsWithChildren<{}>) {
  // ... existing session code
  
  // Load Community Notes config when session is available
  const {data: communityNotesConfig} = useCommunityNotesConfig()
  
  // Update global labeler DID when config loads
  useEffect(() => {
    if (communityNotesConfig?.labelerDid) {
      updateCommunityNotesLabelerDid(communityNotesConfig.labelerDid)
    }
  }, [communityNotesConfig])
  
  // ... rest of component
}
```

### 3. Dynamic Labeler DID

```typescript
// src/lib/community-notes/labels.ts
let currentLabelerDid = COMMUNITY_NOTES_LABELER_DID.DEV // fallback

export function updateCommunityNotesLabelerDid(did: string) {
  currentLabelerDid = did
}

export function getCurrentCommunityNotesLabelerDid(): string {
  return currentLabelerDid
}

// Update label checking to use dynamic DID
function isCommunityNotesLabeler(labelerDid: string): boolean {
  return labelerDid === getCurrentCommunityNotesLabelerDid()
}
```

### 4. Community Notes Screen Updates

```typescript
// src/screens/CommunityNotes/CommunityNotesScreen.tsx
export function CommunityNotesScreen() {
  const {data: config, isLoading: configLoading} = useCommunityNotesConfig()
  
  // Get feed URI based on selected tab and config
  const getFeedUri = useCallback((tab: TabStatus) => {
    if (!config?.feeds) return null
    
    // Map tab status to feed rkey patterns (from integration guide)
    const rkeyPatterns = {
      needs_your_help: 'needs_your_help',
      new: 'new',
      rated_helpful: 'rated_helpful'
    }

    // Find the matching feed URI from the describeFeedGenerator response
    const targetRkey = rkeyPatterns[tab]
    const matchingFeed = config.feeds.find(feed =>
      feed.uri.endsWith(`/app.bsky.feed.generator/${targetRkey}`)
    )

    return matchingFeed?.uri || null
  }, [config])
  
  const feedUri = getFeedUri(selectedTab)
  const feedDescriptor = feedUri ? `feedgen|${feedUri}` : null
  
  const {data: feedData, isLoading, error} = usePostFeedQuery(
    feedDescriptor!,
    undefined,
    {enabled: !!feedDescriptor}
  )
  
  if (configLoading || !config) {
    return <LoadingScreen />
  }
  
  // ... rest of component
}
```

## Backend Implementation

### Environment-Specific Configuration

```typescript
// Community Notes Service - getConfig endpoint
interface EnvironmentConfig {
  labelerDid: string
  feedGeneratorDid: string
}

const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  production: {
    labelerDid: 'did:plc:community-notes-prod-labeler',
    feedGeneratorDid: 'did:plc:community-notes-prod-feeds'
  },
  staging: {
    labelerDid: 'did:plc:community-notes-staging-labeler',
    feedGeneratorDid: 'did:plc:community-notes-staging-feeds'
  },
  development: {
    labelerDid: 'did:plc:community-notes-dev-labeler',
    feedGeneratorDid: 'did:plc:your-dev-feed-generator'
  }
}

export async function getConfig(req: Request): Promise<CommunityNotesConfig> {
  const environment = process.env.NODE_ENV || 'development'
  const config = ENVIRONMENT_CONFIGS[environment] || ENVIRONMENT_CONFIGS.development
  
  return {
    version: new Date().toISOString(),
    ...config
  }
}
```

## Cache Strategy and Update Timeline

### Cache Configuration
- **Stale Time**: 5 minutes (balance between freshness and performance)
- **Refetch on Focus**: Yes (immediate updates when user returns)
- **Retry Policy**: 3 attempts with exponential backoff

### Update Timeline
| Platform | Scenario | Update Time |
|----------|----------|-------------|
| **Web** | Active user | 5 minutes (stale time) |
| **Web** | User switches tabs back | Immediate (refetchOnWindowFocus) |
| **Mobile** | App in foreground | 5 minutes |
| **Mobile** | App backgrounded/resumed | Immediate |
| **Mobile** | App killed/restarted | Immediate |

## Benefits

### ✅ **Centralized Configuration**
- All environment-specific settings in one place
- No hardcoded DIDs in frontend code
- Easy to update without client deployments

### ✅ **Environment Isolation**
- Each environment has its own feed generators and labelers
- No cross-environment contamination
- Safe testing and development

### ✅ **Consistent with Bluesky Patterns**
- Follows the same service resolution logic as existing services
- Uses established React Query patterns
- Integrates with existing session management

### ✅ **Operational Benefits**
- Change DIDs without frontend deployments
- Immediate rollback capability
- Version tracking for configuration changes
- Graceful fallback handling

### ✅ **Developer Experience**
- No more environment-specific configuration in frontend
- Automatic environment detection
- Clear error handling and debugging

## Migration Strategy

### Phase 1: Backend Implementation
1. Add `getConfig` endpoint to Community Notes service
2. Deploy to all environments with current DIDs
3. Test endpoint functionality

### Phase 2: Frontend Integration
1. Add configuration query hook
2. Integrate with session initialization
3. Update Community Notes screen to use dynamic feeds
4. Update label checking to use dynamic labeler DID

### Phase 3: Cleanup
1. Remove hardcoded DIDs from frontend
2. Remove environment detection logic
3. Remove fallback feed logic

### Phase 4: Validation
1. Test configuration changes in development
2. Verify cache invalidation works correctly
3. Test mobile app background/foreground behavior
4. Validate cross-environment isolation

## Error Handling

### Configuration Fetch Failures
```typescript
const {data: config, error: configError} = useCommunityNotesConfig()

if (configError) {
  // Fallback to hardcoded values or show error state
  console.warn('Failed to load Community Notes config, using fallback')
  return <ErrorState />
}
```

### Invalid Configuration
- Validate feed URIs are well-formed AT-URIs
- Validate labeler DID format
- Log configuration errors for monitoring

### Network Issues
- Retry failed requests (3 attempts)
- Use cached configuration when available
- Graceful degradation to error state

## Security Considerations

### Configuration Integrity
- Validate all URIs and DIDs on the backend
- Sanitize configuration values
- Rate limit the getConfig endpoint

### Environment Isolation
- Ensure development configs don't leak to production
- Validate environment-specific DIDs exist
- Monitor for configuration tampering

## Monitoring and Observability

### Metrics to Track
- Configuration fetch success/failure rates
- Cache hit/miss ratios
- Configuration change frequency
- Client update latency

### Logging
- Configuration fetch attempts
- Configuration validation failures
- Environment detection results
- Cache invalidation events

## Future Enhancements

### Conditional Configuration
- A/B testing support
- User-specific configurations
- Feature flag integration

### Advanced Caching
- Background refresh strategies
- Predictive cache warming
- Cross-tab synchronization

### Configuration Validation
- Schema validation on backend
- Client-side configuration verification
- Automated configuration testing

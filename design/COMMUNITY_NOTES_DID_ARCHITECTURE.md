# Community Notes DID Architecture

## Overview

The Community Notes service uses a **multi-DID architecture** following AT Protocol best practices, where different DIDs serve distinct roles for feed generation, repository operations, and labeling.

## DID Roles and Architecture

### 1. Feed Generator Document DID (DOCUMENT ONLY)
**Role**: Service discovery for feed generator

**Responsibilities**:
- **Service Discovery**: Contains `BskyFeedGenerator` service endpoint in DID document
- **Feed Identification**: Used in feed generator records to identify the service
- **No Authentication**: Document-only DID, cannot authenticate or store records

**Why Document DID**: The feed generator document DID can be document-only because:
- It's only used for service discovery (finding the feed endpoint)
- Feed generator records are stored by the **repository account**, not the document DID
- Clients resolve the document DID to find the service endpoint, but don't need it to be an actor

**Environment Variables**:
```bash
# Production (did:web format)
FEEDGEN_DOCUMENT_DID=did:web:your-domain.com

# Development (PLC DID - auto-generated)
FEEDGEN_DOCUMENT_DID=did:plc:generated-by-dev-env
```

### 2. Repository Account DID (ACTOR)

**Role**: Single repository for all records

**Responsibilities**:
- **Feed Repository**: Stores `app.bsky.feed.generator` records for feed discovery
- **Notes Repository**: Stores `social.pmsky.proposal` and `social.pmsky.vote` records
- **PDS Authentication**: Authenticates with PDS for all record operations

**Environment Variables**:
```bash
REPO_DID=did:plc:your-repo-did
REPO_PASSWORD=your-repo-password
```

### 3. Labeler DID (ACTOR)
**Role**: Community Notes labeling service

**Responsibilities**:
- **Label Generation**: Creates Community Notes labels (`needs-context`, etc.)
- **Label Signing**: Signs labels with labeler signing key
- **Actor Account**: Must be an actor (DID with PDS account) for `getActors()` to work
- **Label Service**: Has `AtprotoLabeler` service in DID document
- **Label Configuration Record**: Has `app.bsky.labeler.service/self` record with label configuration

**Why Actor Required**: The labeler DID must be an **actor** (not just a document DID) because:
- Bsky's `getActors()` method only returns DIDs that exist in the `actor` table
- Labeler filtering in `createContext()` uses `getActors()` to validate labeler existence
- Document-only DIDs are not indexed in the actor table and will be filtered out

**Environment Variables**:
```bash
LABELER_DID=did:plc:your-labeler-actor-did
```

## Development Environment Setup

### DID Creation in Dev-Env

The dev-env automatically creates all required DIDs and accounts:

```typescript
// 1. Feed Generator Document DID (service discovery only)
const feedgenDocumentDid = await createFeedGeneratorDid(plcUrl, port)
// Creates document DID with BskyFeedGenerator service

// 2. Repository Account (for both feed records and notes records in dev-env)
const repoAccount = await createRepoAccount(pdsUrl, keypair)
// Creates actor account in PDS for repository operations

// 3. Labeler Actor (must be actor for getActors() to work)
const labelerDid = await createLabelerActor(pdsUrl, plcUrl, port)
// Creates actor account with AtprotoLabeler service
```

### Why Separate Repository and Document DIDs?

**Repository DIDs** (actors) and **Document DIDs** serve different purposes:

- **Repository DIDs**: Store records, authenticate, have PDS accounts
  - Used for: Storing feed generator records, proposal records, vote records
  - Must be actors with authentication capabilities

- **Document DIDs**: Service discovery, contain service endpoints
  - Used for: Clients finding feed endpoints, labeler endpoints
  - Can be document-only, no authentication needed

**Separation Benefits**:
- **Security**: Repository keys can be rotated without changing service discovery
- **Flexibility**: Service endpoints can move without affecting stored records
- **Scalability**: Multiple repositories can serve the same service
- **AT Protocol Compliance**: Follows standard patterns for service architecture

**Key Architectural Insight**:
- **Labeler must be actor**: Required for `getActors()` validation in labeler filtering
- **Feed generator can be document**: Only used for service discovery, not validation
- **Repository accounts are actors**: Need authentication to store records

This follows the same pattern as other feed generators in dev-env:
- **Alice's feed generator**: Alice's DID stores feed records pointing to separate feed generator DID

## Technical Implementation Details

### Actor vs Document DID Requirements

**Actors (DIDs with PDS accounts)**:
- Created via `createAccount()` on PDS
- Indexed in bsky's `actor` table
- Found by `getActors()` method
- Can authenticate and store records
- **Required for**: Labelers (validation), Repository accounts (record storage)

**Document DIDs (PLC-only DIDs)**:
- Created via PLC operations only
- Not in bsky's `actor` table
- Not found by `getActors()`
- Cannot authenticate or store records
- **Sufficient for**: Service discovery endpoints

### Labeler Filtering Technical Flow

```typescript
// In bsky's hydrator createContext():
const labelerActors = await this.actor.getActors(nonServiceLabelers)
// getActors() queries: SELECT * FROM actor WHERE did IN (labelerDids)
// Document-only DIDs return empty, actors return data

const availableDids = labelers.filter(
  (did) => this.serviceLabelers.has(did) || !!labelerActors.get(did)
)
// Only actors or service labelers pass this filter
```

**Result**: Document-only labeler DIDs are filtered out, breaking labeler functionality.

## Production Deployment

### Feed Generator DID: did:web Pattern

In production, set `FEEDGEN_DOCUMENT_DID=did:web:your-domain.com` where `your-domain.com` is your service domain.

**How it works**:
1. Set environment variable: `FEEDGEN_DOCUMENT_DID=did:web:your-domain.com`
2. The service automatically serves the DID document at `https://your-domain.com/.well-known/did.json`
3. The DID document contains the `BskyFeedGenerator` service endpoint
4. No manual DID creation or PLC operations needed

**Development vs Production**:
- **Development**: Uses PLC DIDs (auto-generated) because `did:web:localhost` won't resolve
- **Production**: Uses `did:web:domain` format with automatic DID document serving

### 1. Create Repository Account

```bash
# Create single repository account for all records
curl -X POST https://your-pds.com/xrpc/com.atproto.server.createAccount \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "repo.your-domain.com",
    "email": "repo@your-domain.com",
    "password": "secure-password"
  }'
```

## Code Architecture

### Repository Account Usage

```typescript
// All repository operations (feed records, proposals, votes)
const repoAgent = await createAuthenticatedPdsAgent(ctx, ctx.repoAccount)
```


## API Integration

### getConfig Endpoint

Returns only DIDs needed by frontend:

```typescript
// GET /xrpc/org.opencommunitynotes.getConfig
{
  "version": "2025-01-01T00:00:00.000Z",
  "feedGeneratorDid": "did:plc:repo-did",      // Repository DID for constructing feed URIs
  "labelerDid": "did:plc:labeler-actor-did"    // Labeler actor DID for headers
}
```

### Frontend Usage

```javascript
// Get configuration
const config = await fetch('/xrpc/org.opencommunitynotes.getConfig')

// Construct feed URIs using repository DID
const feedUri = `at://${config.feedGeneratorDid}/app.bsky.feed.generator/new`

// Call Bsky with labeler header
const feed = await fetch(`/xrpc/app.bsky.feed.getFeed?feed=${feedUri}`, {
  headers: {
    'atproto-accept-labelers': config.labelerDid
  }
})
```

### Introspection Service

Dev-env introspection exposes all DIDs for debugging:

```json
{
  "notes": {
    "url": "http://localhost:2595",
    "feedgenDocumentDid": "did:web:your-domain.com",
    "repoDid": "did:plc:repo-did", 
    "labelerDid": "did:plc:labeler-actor-did"
  }
}
```

## Standard AT Protocol Endpoints

### describeFeedGenerator

```bash
curl https://your-domain.com/xrpc/app.bsky.feed.describeFeedGenerator
```

Returns:
```json
{
  "did": "did:web:your-domain.com",
  "feeds": [
    {"uri": "at://did:plc:repo-did/app.bsky.feed.generator/new"},
    {"uri": "at://did:plc:repo-did/app.bsky.feed.generator/needs_your_help"},
    {"uri": "at://did:plc:repo-did/app.bsky.feed.generator/rated_helpful"}
  ]
}
```

Note: The `did` field returns the **document DID** (service host), while feed URIs use the **repository DID** (record storage).

### getFeedSkeleton

```bash
curl "https://your-domain.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:repo-did/app.bsky.feed.generator/new"
```


## Architecture Benefits

### Clear Separation of Concerns
- **Document DID**: Service discovery only (no authentication needed)
- **Repository Account**: Record storage and authentication (single account simplicity)
- **Labeler Actor**: Label generation and validation (must be actor for `getActors()`)

### Simplified Architecture
- **Single Repository**: One account handles all record operations
- **Actor Requirements**: Only labeler needs to be actor, document DIDs can be lightweight
- **Reduced Complexity**: Fewer accounts to manage and authenticate

### AT Protocol Compliance
- Follows standard feed generator patterns used throughout the ecosystem
- Compatible with existing Bsky App View feed discovery mechanisms
- Respects actor vs document DID distinctions for proper validation

### Development vs Production Flexibility
- **Development**: Same patterns work in dev-env with proper actor creation
- **Production**: Can scale to separate accounts if needed
- **Migration Path**: Easy to split repository account later if requirements change

This architecture balances simplicity with AT Protocol compliance, ensuring labeler functionality works correctly while minimizing operational complexity.

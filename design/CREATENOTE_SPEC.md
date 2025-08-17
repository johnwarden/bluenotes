# CreateNote Endpoint Specification

## Overview

The `social.pmsky.createNote` endpoint allows authenticated users to create community notes (proposals) that add context or fact-checking information to any AT Protocol content. This endpoint is part of the Community Notes service that acts as both an App View and a record creator in the AT Protocol ecosystem.

## Architecture

### Service Role

The Community Notes service has a unique dual role:

1. **App View**: Maintains local database for fast query responses via `getNotesForSubject`
2. **Record Creator**: Creates `social.pmsky.proposal` records in AT Protocol using a service account

### State Management Strategy

To ensure immediate consistency for creators:

1. **Write to Local DB First**: Store note immediately in service's local database
2. **Then Write to AT Protocol**: Create proposal record using service account
3. **Update Local Record**: Link local record with AT Protocol URI/CID

This "write-before-read" pattern ensures `getNotesForSubject` immediately shows new notes to their creators, unlike typical app views that use "read-after-write" from the firehose.

## API Specification

### Endpoint

```
POST /xrpc/social.pmsky.createNote
```

### Authentication

- **Required**: Bearer token in `Authorization` header
- **Verification**: Delegated to user's PDS via `getSession` endpoint
- **Permission Check**: User must have sufficient "writing impact score"

### Input Schema

```json
{
  "typ": "post_label",
  "uri": "at://did:example/app.bsky.feed.post/123",
  "cid": "bafy...", // Optional - specific version
  "val": "needs-context",
  "note": "This claim requires additional context. The photo was actually taken in 2015...",
  "reasons": ["factual_error", "outdated_information"]
}
```

#### Fields

- **`typ`** (required): Type of moderation action ("post_label")
- **`uri`** (required): AT-URI of content being annotated
- **`cid`** (optional): CID for specific version of target
- **`val`** (required): Proposed label value (e.g., "needs-context")
- **`note`** (required): Full context text (max 2800 chars)
- **`reasons`** (optional): Array of reason codes

#### Valid Reason Codes

- `factual_error`
- `altered_media`
- `outdated_information`
- `misrepresentation_or_missing_context`
- `unverified_claim_as_fact`
- `joke_or_satire`
- `other`

### Output Schema

```json
{
  "uri": "at://service-did/social.pmsky.proposal/abc123",
  "cid": "bafy...",
  "proposal": {
    "uri": "at://service-did/social.pmsky.proposal/abc123",
    "cid": "bafy...",
    "author": {
      "aid": "social.pmsky:abc123",
      "pseudonym": "Thoughtful Beaver"
    },
    "typ": "post_label",
    "targetUri": "at://did:example/app.bsky.feed.post/123",
    "targetCid": "bafy...", // Optional
    "val": "needs-context",
    "note": "This claim requires additional context...",
    "reasons": ["factual_error", "outdated_information"],
    "cts": "2025-01-30T12:00:00.000Z",
    "status": "needs_more_ratings"
  }
}
```

### Error Responses

- **401 AuthenticationRequired**: Missing or invalid authentication
- **403 InsufficientPermissions**: User lacks sufficient writing impact score
- **400 InvalidTarget**: Target URI is invalid, note validation failed, or user has already created a note for this subject
- **429 RateLimited**: Too many notes created recently

## Implementation Architecture

### Database Schema

Following **Bsky App-View patterns** with a generic record table:

```typescript
// Generic record table (like Bsky App-View)
interface RecordTable {
  uri: string // AT Protocol URI (primary key)
  cid: string // AT Protocol CID
  did: string // Service account DID (all records created by service)
  collection: string // 'social.pmsky.proposal'
  rkey: string // Record key
  record: object // Full JSON record content (JSONB for efficient querying)
  indexedAt: string // For sorting/pagination
}
```

**Architecture Decision**: We follow **Bsky's App-View pattern** rather than PDS actor-store because:

- ✅ **Centralized service**: Single database aggregating all users' notes
- ✅ **Queryable JSON storage**: JSONB enables efficient cross-user queries
- ✅ **Proven scalability**: Bsky successfully uses this pattern at scale
- ❌ **PDS actor-store**: Per-actor isolation incompatible with our app-view needs

### Database Indices

Optimized for our query patterns:

```typescript
// Core indices
CREATE INDEX record_collection_idx ON record (collection);
CREATE INDEX record_indexed_at_idx ON record (indexedAt);

// Query-specific indices
CREATE INDEX record_target_uri_idx ON record ((record->>'uri')); // getNotesForSubject
CREATE INDEX record_aid_idx ON record ((record->>'aid')); // User-specific queries

// Composite indices for performance
CREATE INDEX record_aid_target_uri_idx ON record (collection, (record->>'aid'), (record->>'uri')); // Duplicate prevention
CREATE INDEX record_target_uri_cid_idx ON record ((record->>'uri'), (record->>'cid')); // Version-specific queries
```

These indices optimize:

- **Duplicate checking**: Fast AID + target URI lookup
- **Note retrieval**: Efficient target URI queries
- **User queries**: Quick AID-based lookups

### Service Account

- **DID**: `did:plc:community-notes-service` (to be created)
- **Handle**: `notes.bsky.social`
- **Purpose**: Signs all community note proposal records
- **Credentials**: Stored securely in service configuration

### PDS Integration

```typescript
class CommunityNotesService {
  private pdsClient: AtpAgent // Authenticated with service account

  async createProposalRecord(input: CreateNoteInput, userAid: string) {
    return this.pdsClient.com.atproto.repo.createRecord({
      repo: this.serviceAccount.did,
      collection: 'social.pmsky.proposal',
      record: {
        $type: 'social.pmsky.proposal',
        typ: input.typ,
        src: this.serviceAccount.did,
        uri: input.uri,
        cid: input.cid,
        val: input.val,
        note: input.note,
        reasons: input.reasons,
        aid: userAid,
        cts: new Date().toISOString(),
      },
    })
  }
}
```

### Authentication Flow

1. Extract bearer token from `Authorization` header
2. Parse PDS URL from token (simplified: use default for dev)
3. Call `com.atproto.server.getSession` on user's PDS
4. Extract user DID from session response
5. Generate anonymous ID: `social.pmsky:${sha256(userDid).substring(0,12)}`
6. Check user's writing impact score (placeholder: always allow)

### Request Flow

```typescript
async function createNote(input, req) {
  // 1. Authenticate user
  const authResult = await verifyBearerToken(req.headers.authorization)
  const userDid = authResult.did
  const userAid = generateAidFromDid(userDid)

  // 2. Validate permissions
  await checkWritingImpactScore(userDid, 'create_note')

  // 3. Validate target and check for duplicates
  await validateTarget(input.uri) // TODO: Implement
  const existingNote = await checkExistingNoteByUser(
    ctx,
    userAid,
    input.uri,
    input.cid,
  ) // ✅ IMPLEMENTED
  if (existingNote) {
    throw new Error('You have already created a note for this subject')
  }

  // 4. Create AT Protocol record first
  const atProtoRecord = await createProposalRecord(input, userAid)

  // 5. Store in local DB with full record
  await storeRecordInLocalDB({
    uri: atProtoRecord.uri,
    cid: atProtoRecord.cid,
    did: serviceAccount.did,
    collection: 'social.pmsky.proposal',
    rkey: atProtoRecord.rkey,
    record: atProtoRecord.record,
    indexedAt: new Date().toISOString(),
  })

  // 6. Return formatted response
  return formatCreateNoteResponse(atProtoRecord)
}
```

## Database Migration

Using generic record table (following PDS patterns):

```typescript
// packages/notes/src/db/migrations/20250130T120000000Z-init.ts
export async function up(db: Kysely<unknown>): Promise<void> {
  // Generic record table (like PDS)
  await db.schema
    .createTable('record')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('did', 'varchar', (col) => col.notNull())
    .addColumn('collection', 'varchar', (col) => col.notNull())
    .addColumn('rkey', 'varchar', (col) => col.notNull())
    .addColumn('record', 'jsonb', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .execute()

  // Indexes for common queries
  await db.schema
    .createIndex('record_collection_idx')
    .on('record')
    .column('collection')
    .execute()

  await db.schema
    .createIndex('record_indexed_at_idx')
    .on('record')
    .column('indexedAt')
    .execute()

  // Index for target URI queries (JSON path) - for getNotesForSubject
  await db.schema
    .createIndex('record_target_uri_idx')
    .on('record')
    .expression(`(record->>'uri')`)
    .where('collection', '=', 'social.pmsky.proposal')
    .execute()
}
```

This generic approach eliminates custom schema needs and follows PDS patterns exactly.

## Configuration

### Environment Variables

```bash
# Database
COMMUNITY_NOTES_DB_POSTGRES_URL=postgresql://...
COMMUNITY_NOTES_DB_POSTGRES_SCHEMA=community_notes

# Service Account (to be created in dev)
SERVICE_ACCOUNT_DID=did:plc:community-notes-service
SERVICE_ACCOUNT_HANDLE=notes.bsky.social
SERVICE_ACCOUNT_PASSWORD=...
SERVICE_ACCOUNT_ACCESS_JWT=...
SERVICE_ACCOUNT_REFRESH_JWT=...
SERVICE_ACCOUNT_USER_DID=...

# Default PDS for token verification (dev)
DEFAULT_PDS_URL=http://localhost:2583

# Vote PDS Sync (optional)
SYNC_VOTES_TO_PDS=true  # Enable syncing vote records to PDS
```

### Vote PDS Sync Feature

Vote records can optionally be synced to the PDS in addition to being stored in the database:

- **DB-First**: Votes are always saved to the database first
- **PDS Sync**: If `SYNC_VOTES_TO_PDS=true`, votes are then synced to PDS
- **CID Validation**: Our calculated CID is validated against PDS-returned CID
- **Error on Failure**: API returns 500 error if PDS sync fails or CIDs don't match
- **Simple Architecture**: No sync status tracking in DB (yet)

This ensures vote data integrity while providing optional AT Protocol integration.

## Future Enhancements (TODOs)

### Rate Limiting

Following PDS patterns:

```typescript
// TODO: Implement rate limiting
rateLimit: [
  {
    name: 'create-note-hour',
    calcKey: ({ auth }) => auth.credentials.did,
    calcPoints: () => 5, // 5 points per note
  },
  {
    name: 'create-note-day',
    calcKey: ({ auth }) => auth.credentials.did,
    calcPoints: () => 5,
  },
]
```

### Input Validation

```typescript
// TODO: Implement comprehensive validation
- Target URI accessibility check
- Content moderation for note text
- Spam detection
- Maximum note length enforcement
- Reason code validation
```

### Enhanced Permissions

```typescript
// TODO: Implement impact score checking
async function checkWritingImpactScore(userDid: string): Promise<boolean> {
  // Check user's historical note quality
  // New users: limited notes per day
  // Established users: higher limits
  // Users with poor ratings: restricted
}
```

### Duplicate Detection

```typescript
// ✅ IMPLEMENTED: Exact duplicate prevention
async function checkExistingNoteByUser(
  ctx: AppContext,
  creatorAid: string,
  targetUri: string,
  targetCid?: string,
): Promise<{ uri: string } | null> {
  // Query database for existing notes by this user for this target
  const query = ctx.db.db
    .selectFrom('record')
    .select(['uri'])
    .where('collection', '=', 'social.pmsky.proposal')
    .where(sql`record->>'uri'`, '=', targetUri)
    .where(sql`record->>'aid'`, '=', creatorAid)
    .where(
      targetCid ? sql`record->>'cid'` : sql`TRUE`,
      '=',
      targetCid || sql`TRUE`,
    )

  return (await query.limit(1).executeTakeFirst()) || null
}

// Prevents:
// ✅ Exact target URI + user combination
// TODO: Similar content detection
// TODO: Edit vs new note differentiation
```

## Security Considerations

1. **Anonymous ID Generation**: SHA256 ensures one-way mapping from DID to AID
2. **Service Account Security**: Private keys stored securely, rotated regularly
3. **Input Sanitization**: All user input sanitized before storage
4. **Rate Limiting**: Prevents spam and abuse
5. **Permission Checking**: Users must earn the right to create notes

## Testing Strategy

1. **Unit Tests**: Individual functions and validation logic
2. **Integration Tests**: Full endpoint flow with mocked PDS
3. **E2E Tests**: Real PDS integration in dev environment
4. **Performance Tests**: Database query optimization
5. **Security Tests**: Authentication bypass attempts

## Monitoring & Observability

1. **Metrics**: Note creation rate, success/failure ratios, response times
2. **Logging**: Structured logs for all operations with user AIDs (not DIDs)
3. **Alerts**: Service account authentication failures, database errors
4. **Dashboard**: Real-time service health and usage statistics

---

This specification provides a comprehensive foundation for implementing the `createNote` endpoint while following established AT Protocol patterns and ensuring robust operation as both an App View and record creator.

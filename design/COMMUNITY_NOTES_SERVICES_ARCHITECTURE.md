# Community Notes Services Architecture

This document describes the architecture for the Community Notes services implemented in this repo.

## Overview

Three main services:

- **Notes Service**: Endpoints used by the front-end app for creating, rating, and reading proposals. Internal /score endpoing called by scoring service
- **Labeler**: Provides AT Protocol labeler endpoints. Internal /label endpoint called by notes service
- **Scoring Service**: Runs algorithms to score proposals and calls Scoring Service to create labels

## Core Architecture Principles

### Service Responsibilities

#### Notes Service
- **User-facing API**: `createProposal`, `rateProposal`, and `getProposals` endpoints
- **Owns Data**: Creates and migrates notes db *except* for labeler database
- **Record sync**: Manages sync of local records to AT Protocol PDS
- **Internal API**: Internal `/score` endpoint called by algorithm service

#### Labeler
- **Label management**: Creates labels via skyware labeler
- **AT Protocol labeler**: Provides `queryLabels` and `subscribeLabels` endpoints
- **Internal API**: Accepts `/label` calls from Notes Service

#### Scoring Service
- **Algorithm execution**: Processes ratings and determines label scores and statuses
- **Data analysis**: Reads from `notes.db` to analyze proposals and ratings
- **Score submission**: Calls Notes Service's `/score` API to update score tables and create labels
- **Background processing**: Runs on scheduled intervals (e.g., every 6 hours)

## Event-Sourced Label Architecture

### Core Tables

The system uses an event-sourcing pattern for label management:

```sql

-- Immutable source of truth for algorithm decisions
scoreEvent (scoreEventId, proposalUri, targetUri, status, score, labelValue, createdAt)

-- Current state derived from events
score (proposalUri, targetUri, status, score, labelValue, updatedAt)

-- Labels pending sync to labeler
pendingLabels (id, scoreEventId, targetUri, labelValue, negative, createdAt)
```

### Event-Driven Flow

1. **Scoring Service decision** → Call Notes Service `score` API
2. **Notes Service** → Insert `scoreEvent` record
3. **Database trigger** → Update `score` table + create `pendingLabels` entry
4. **Label sync** → Create labels in skyware labeler + Bsky database (dev-env only)
5. **Success** → Delete `pendingLabels` record

### Benefits of Event Sourcing

- **Audit trail**: Complete history of all algorithm decisions
- **Replay capability**: Can reconstruct label state from events
- **Eventual consistency**: Labels sync asynchronously without blocking algorithm
- **Reliability**: Failed syncs can be retried without data loss
- **Debugging**: Full visibility into label creation process

## Label Lifecycle

### Proposed Labels (Immediate)

When a proposal is first created:
1. User creates proposal → auto-rating generated (note authors automatically rate their own note as helpful)
2. Algorithm Service detects new proposal → calls `score(status: "needs_more_ratings")`
3. Trigger creates `proposal:label:needs-context` label
4. Community Notes-enabled frontends add "Readers Added Context..." prompt to posts with this label.

### Approved Labels (Algorithmic)

When algorithm has sufficient data:
1. Algorithm Service processes ratings → calls `score(status: "rated_helpful")`
2. Trigger creates label (positive). For community notes, label is 'needs-context'.
3. Both proposed and final labels coexist
4. If algorithm later changes status (e.g. to rated_not_helpful), negative label is emitted.

### Status Change Logic

Labels are only created when **status changes**:
- **To helpful**: Any status → `rated_helpful` → `${val}` (positive)
- **From helpful**: `rated_helpful` → other → `${val}` (negative)

This prevents duplicate labels and ensures efficient label creation.

### Label Sync

Set `/score` endpoint attempts to sync `pendingLabels` to labeler after each call.

Pending labels are deleted only when this is successful:

## Mock Labeler

In the dev-env, the Mock labeler does not provide ATproto labeler endpoints. Instead, inserts/deletes records directly in bsky database.

### Record Management

The system uses AT Protocol's generic record pattern using the social.pmsky schema:
- **Proposals**: `social.pmsky.proposal` records
- **Ratings**: `social.pmsky.rating` records
- **Sync strategy**: Local database as source of truth, PDS as sync target

This approach:
- **Matches Bsky app pattern**: Consistent with existing AT Protocol apps
- **Enables offline operation**: Local database works without PDS connectivity
- **Supports future changes**: Generic records adapt to schema evolution
- **Provides reliability**: Failed PDS syncs don't block user operations

## Service Communication

### Internal API

The Notes Service exposes an internal API for algorithm integration:

```http
POST /score
{
  "proposalUri": "at://...",
  "targetUri": "at://...",
  "status": "rated_helpful",
  "score": 0.85,
  "labelValue": "needs-context"
}
```

This endpoint immediately runs label sync after inserting a score event. This endpoint can be used by integration tests to simulate behavior of the algorithm without having to wait for eventual label sync.


## Integration

### Bsky App Integration

The system integrates with Bluesky's existing infrastructure:

2. **Bsky AppView** ingests labels from labeler. Hydrates posts with labels automatically.
3. **Users see labels** without additional frontend changes.

However, to see labels, users must either 1) subscribe to the Community Notes labeler 2) Use a Community Notes-enabled App.

### Community-Notes Enabled Apps

When users see a community-notes-enabled client:

- Client passes `atproto-accept-labelers` header to bsky app view on all requests to get posts. Effectively, all users of the app are automatically subscribed to the community notes labeler.

### Label Display

- **Proposed labels**: `proposal:label:needs-context` → "Rate proposed community notes" prompt
- **Final labels**: `needs-context` → Shows "Readers added context heading" with actual note text.
-
## Deployment Architecture

## Development vs Production

### Development Environment
- **Both services run locally** with test databases
- **Immediate label sync** to bsky database in integration tests for fast test feedback

### Production Environment
- **Services deployed separately** with persistent databases
- **No Bsky database sync** (labels served via AT Protocol)
- **Eventual consistency** of labels. Acceptable for real-world usage
- **Scoring Service** processes ratings asynchronously on scheduled intervals
# Community Notes Services Architecture

This document describes the architecture for the Community Notes services implemented in this repo.

## Overview

Three main services:

- **Notes Service**: Endpoints used by the front-end app for creating, rating, and reading proposals. Internal /score endpoing called by scoring service
- **Labeler**: Provides AT Protocol labeler endpoints. Internal /label endpoint called by notes service
- **Scoring Service**: Runs algorithms to score proposals and calls Scoring Service to create labels

## Core Architecture Principles

### Service Responsibilities

#### Notes Service
- **User-facing API**: `createProposal`, `rateProposal`, and `getProposals` endpoints
- **Owns Data**: Creates and migrates both database *except* for labeler database
- **Record sync**: Manages sync of local records to AT Protocol PDS

#### Labeler
- **Label management**: Creates labels via skyware labeler
- **AT Protocol labeler**: Provides `queryLabels` and `subscribeLabels` endpoints
- **Internal API**: Accepts `label` calls from NOtes Service

#### Scoring Service
- **Algorithm execution**: Processes ratings and determines label scores and statuses
- **Data analysis**: Reads from `notes.db` to analyze proposals and ratings
- **Score submission**: Calls Notes Service's `score` API to update score tables and create labels
- **Background processing**: Runs on scheduled intervals (e.g., every 6 hours)

## Event-Sourced Label Architecture

### Core Tables

The system uses an event-sourcing pattern for label management:

```sql

-- Immutable source of truth for algorithm decisions
scoreEvent (scoreEventId, proposalUri, targetUri, status, score, labelValue, createdAt)

-- Current state derived from events
score (proposalUri, targetUri, status, score, labelValue, updatedAt)

-- Labels pending sync to labeler
pendingLabels (id, scoreEventId, targetUri, labelValue, negative, createdAt)
```

### Event-Driven Flow

1. **Scoring Service decision** → Call Notes Service `score` API
2. **Notes Service** → Insert `scoreEvent` record
3. **Database trigger** → Update `score` table + create `pendingLabels` entry
4. **Background sync** → Create labels in skyware labeler + Bsky database (dev-env only)
5. **Success** → Delete `pendingLabels` record

### Benefits of Event Sourcing

- **Audit trail**: Complete history of all algorithm decisions
- **Replay capability**: Can reconstruct label state from events
- **Eventual consistency**: Labels sync asynchronously without blocking algorithm
- **Reliability**: Failed syncs can be retried without data loss
- **Debugging**: Full visibility into label creation process

## Label Lifecycle

### Proposed Labels (Immediate)

When a proposal is first created:
1. User creates proposal → auto-rating generated (note authors automatically rate their own note as helpful)
2. Algorithm Service detects new proposal → calls `score(status: "needs_more_ratings")`
3. Trigger creates `proposal:label:needs-context` label
4. Community Notes-enabled frontends add "Readers Added Context..." prompt to posts with this label.

### Approved Labels (Algorithmic)

When algorithm has sufficient data:
1. Algorithm Service processes ratings → calls `score(status: "rated_helpful")`
2. Trigger creates label (positive). For community notes, label is 'needs-context'.
3. Both proposed and final labels coexist
4. If algorithm later changes status (e.g. to rated_not_helpful), negative label is emitted.

### Status Change Logic

Labels are only created when **status changes**:
- **To helpful**: Any status → `rated_helpful` → `${val}` (positive)
- **From helpful**: `rated_helpful` → other → `${val}` (negative)

This prevents duplicate labels and ensures efficient label creation.

### Label Sync

Set `/score` endpoint attempts to sync `pendingLabels` to labeler after each call.

Pending labels are deleted only when this is successful:

## Mock Labeler

In the dev-env, the Mock labeler does not provide ATproto labeler endpoints. Instead, inserts/deletes records directly in bsky database.

### Record Management

The system uses AT Protocol's generic record pattern:
- **Proposals**: `social.pmsky.proposal` records
- **Ratings**: `social.pmsky.rating` records
- **Sync strategy**: Local database as source of truth, PDS as sync target

This approach:
- **Matches Bsky app pattern**: Consistent with existing AT Protocol apps
- **Enables offline operation**: Local database works without PDS connectivity
- **Supports future changes**: Generic records adapt to schema evolution
- **Provides reliability**: Failed PDS syncs don't block user operations

## Service Communication

### Internal API

The Notes Service exposes an internal API for algorithm integration:

```http
POST /score
{
  "proposalUri": "at://...",
  "targetUri": "at://...",
  "status": "rated_helpful",
  "score": 0.85,
  "labelValue": "needs-context"
}
```

This endpoint immediately runs label sync after inserting a score event. This endpoint can be used by integration tests to simulate behavior of the algorithm without having to wait for eventual label sync.


## Integration

### Bsky App Integration

The system integrates with Bluesky's existing infrastructure:

1. **Labeler** acts as AT Protocol labeler
2. **Bsky AppView** ingests labels from labeler. Hydrates posts with labels automatically.
3. **Users see labels** without additional frontend changes.

However, to see labels, users must either 1) subscribe to the Community Notes labeler 2) Use a Community Notes-enabled App.

### Community-Notes Enabled Apps

When users see a community-notes-enabled client:

- Client passes `atproto-accept-labelers` header to bsky app view on all requests to get posts. Effectively, all users of the app are automatically subscribed to the community notes labeler.

### Label Display

- **Proposed labels**: `proposal:label:needs-context` → "Rate proposed community notes" prompt
- **Final labels**: `needs-context` → Shows "Readers added context heading" with actual note text.
-
## Deployment Architecture

### Service Startup Order

**Production deployment requires specific order**:
1. **Labeler starts first** → Ready to create labelers
2. **Notes Service starts next** → Creates/migrates notes services DB
3. **Algorithm Service starts third** → Connects to Notes Service database (read-only). Calls Notes Service `/score` API

This ensures database initialization happens before any label operations.

## Development vs Production

### Development Environment
- **Both services run locally** with test databases
- **Immediate label sync** to bsky database in integration tests for fast test feedback

### Production Environment
- **Services deployed separately** with persistent databases
- **No Bsky database sync** (labels served via AT Protocol)
- **Eventual consistency** of labels. Acceptable for real-world usage
- **Scoring Service** processes ratings asynchronously on scheduled intervals

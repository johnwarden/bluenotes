# Community Notes Feeds API

This document describes the Community Notes feed generator API endpoints that provide AT Protocol-compatible feeds for posts with Community Notes.

## Overview

The Community Notes service provides three feed generators that surface posts with Community Notes in different states:

- **New Feed**: Posts with the newest Community Notes
- **Needs Your Help Feed**: Posts that need more ratings on their Community Notes  
- **Rated Helpful Feed**: Posts with Community Notes rated as helpful

## Feed Generator Discovery

### `app.bsky.feed.describeFeedGenerator`

Returns metadata about available Community Notes feeds.

**Endpoint:** `GET /xrpc/app.bsky.feed.describeFeedGenerator`

**Response:**
```json
{
  "did": "did:plc:example123",
  "feeds": [
    {
      "uri": "at://did:plc:example123/app.bsky.feed.generator/new"
    },
    {
      "uri": "at://did:plc:example123/app.bsky.feed.generator/needs_your_help"
    },
    {
      "uri": "at://did:plc:example123/app.bsky.feed.generator/rated_helpful"
    }
  ]
}
```

## Feed Skeleton Generation

### `app.bsky.feed.getFeedSkeleton`

Returns a feed skeleton containing post URIs for the requested feed type.

**Endpoint:** `GET /xrpc/app.bsky.feed.getFeedSkeleton`

**Parameters:**
- `feed` (required): AT-URI of the feed generator
- `limit` (optional): Maximum number of posts to return (default: 50, max: 100)
- `cursor` (optional): Pagination cursor for retrieving additional results

**Authentication:** Optional. When authenticated, the "Needs Your Help" feed excludes posts the user has already rated.

**Response:**
```json
{
  "feed": [
    {
      "post": "at://did:plc:user123/app.bsky.feed.post/abc123"
    },
    {
      "post": "at://did:plc:user456/app.bsky.feed.post/def456"
    }
  ],
  "cursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjAwOjAwWiJ9"
}
```

## Feed Types

### New Feed
- **URI Pattern:** `at://{service-did}/app.bsky.feed.generator/new`
- **Description:** Posts with the newest Community Notes
- **Ordering:** Most recent Community Notes first
- **Authentication:** Not required, but affects personalization

### Needs Your Help Feed  
- **URI Pattern:** `at://{service-did}/app.bsky.feed.generator/needs_your_help`
- **Description:** Posts that need more ratings on their Community Notes
- **Ordering:** Posts with Community Notes in "needs_more_ratings" status
- **Authentication:** Recommended - excludes posts the user has already rated

### Rated Helpful Feed
- **URI Pattern:** `at://{service-did}/app.bsky.feed.generator/rated_helpful`  
- **Description:** Posts with Community Notes rated as helpful
- **Ordering:** Most recently rated helpful first
- **Authentication:** Not required

## Authentication

Authentication is handled via standard AT Protocol JWT tokens in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

When authenticated:
- User's DID is extracted from the token
- "Needs Your Help" feed excludes posts the user has already rated
- All feeds respect user's blocking and muting preferences

## Error Handling

### Standard Errors

**Invalid Feed URI:**
```json
{
  "error": "UnknownFeed",
  "message": "unknown feed"
}
```

**Invalid Parameters:**
```json
{
  "error": "InvalidRequest", 
  "message": "limit must be between 1 and 100"
}
```

**Authentication Errors:**
```json
{
  "error": "InvalidToken",
  "message": "Invalid or expired token"
}
```

## Rate Limiting

Feed endpoints are subject to standard Community Notes service rate limiting:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## Pagination

Feeds support cursor-based pagination:

1. Initial request returns up to `limit` posts and a `cursor` (if more results available)
2. Subsequent requests include the `cursor` parameter to get the next page
3. Continue until no `cursor` is returned in the response

**Example pagination flow:**
```
GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=...&limit=10
→ Returns 10 posts + cursor

GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=...&limit=10&cursor=abc123
→ Returns next 10 posts + cursor (if more available)
```

## Performance Considerations

- Feed results are computed in real-time from the Community Notes database
- Queries are optimized with database indexes on key columns
- Consider implementing client-side caching for better user experience
- Feed updates reflect the latest Community Notes scoring within seconds

## Integration with Bsky

These feeds are designed to integrate seamlessly with the Bluesky ecosystem:

1. **Feed Generator Records:** Automatically created in the service's AT Protocol repository
2. **Discovery:** Feeds appear in Bluesky's feed discovery interface
3. **Hydration:** Bsky App View hydrates post skeletons with full post data and metadata
4. **Labels:** Posts include Community Notes labels for client-side rendering

## Development and Testing

For development and testing:

- Use the integration test suite: `just integration-test-notes`
- Test individual feeds: `./tests/feeds-test.sh`
- Monitor feed performance: `just recent-logs notes`

## Service Information

- **Service DID:** Available via `/xrpc/app.bsky.feed.describeFeedGenerator`
- **Health Check:** `GET /_ping`
- **Version:** Check service logs for current version information

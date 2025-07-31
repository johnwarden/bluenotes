# createNote API Integration Spec

## Overview
Integrate the `createNote` API endpoint to allow users to submit community notes for posts.

## API Details

### Endpoint
`POST /xrpc/org.opencommunitynotes.createNote`

### Request Format
```json
{
  "typ": "post_label",
  "uri": "at://did:plc:zvp4eaun3i27ulmozkohz6bg/app.bsky.feed.post/3lvc43lfnlk2j",
  "val": "needs-context", 
  "note": "This is my test note",
  "reasons": ["factual_error", "missing_context"]
}
```

### Success Response
```json
{
  "uri": "at://did:plc:oalcgrvlpc7hglnop6vimbg6/org.opencommunitynotes.proposal/note_1753998246942_t00hd7",
  "cid": "bafyreicckyzs3ajvlglvjws6fbzalni54seixpt67hrweiomntxenuyspy",
  "proposal": {
    "uri": "...",
    "cid": "...",
    "author": {
      "aid": "org.opencommunitynotes:fb9f68d2a518",
      "pseudonym": "Careful Beaver"
    },
    "typ": "post_label",
    "targetUri": "...",
    "val": "needs-context",
    "note": "This is my test note",
    "reasons": ["factual_error", "missing_context"],
    "cts": "2025-07-31T21:44:06.942Z",
    "status": "needs_more_ratings"
  }
}
```

### Error Response
```json
{
  "error": "DuplicateNote",
  "message": "You have already created a note for this subject"
}
```

## Implementation Plan

### 1. API Function (`src/lib/api/community-notes.ts`)

Add new types:
```typescript
export interface CreateNoteRequest {
  typ: 'post_label'
  uri: string // target post URI
  val: 'needs-context'
  note: string
  reasons: string[]
}

export interface CreateNoteResponse {
  uri: string
  cid: string
  proposal: CommunityNoteAPIResponse
}
```

Add `createNote` function following the same pattern as `rateNote`.

### 2. State Management (Simple Strategy)

**WriteNoteDialog component changes:**
- Add submission state: `isSubmitting`, `submissionError`
- No shadow cache needed (notes service will have updated list)
- No mutation queue needed (single operation, errors handled directly)

### 3. Data Flow

**Form Data Sources:**
- `postUri` - from component prop (already available)
- `selectedReasons` - from component state
- `noteText` - from component state
- `hasReliableSources` - from component state (not used in API yet)

**Submit Flow:**
1. User clicks Submit button
2. Set `isSubmitting = true`, clear any previous errors
3. Call `createNote` API with form data
4. On success: close WriteNoteDialog, open NoteSubmittedDialog with note URI
5. On error: set `submissionError` with user-friendly message
6. Always: set `isSubmitting = false`

### 4. Error Handling

Map API errors to user-friendly messages:
- `DuplicateNote` → "You have already created a note for this post"
- `401` → "Authentication required. Please log in again."
- `403` → "You do not have permission to create notes."
- Network errors → "Network error. Please check your connection."
- Default → Use API error message or fallback

### 5. Component Updates

**WriteNoteDialog:**
- Add `isSubmitting` and `submissionError` state
- Update `handleSubmit` to call API
- Disable submit button when `isSubmitting`
- Show error in Admonition component when `submissionError` exists

**NoteSubmittedDialog:**
- Add `noteUri?: string` prop
- Display note URI for debugging (temporary)
- Remove hardcoded test error

### 6. Files to Change

1. `src/lib/api/community-notes.ts` - Add createNote function and types
2. `src/components/CommunityNotes/WriteNoteDialog.tsx` - Add submission logic
3. `src/components/CommunityNotes/NoteSubmittedDialog.tsx` - Add noteUri prop

### 7. Future TODOs

- Form validation (check required fields before API call)
- Query invalidation to refresh notes list after creation
- Use note URI to display actual note in submitted dialog
- Handle `hasReliableSources` field in API request

## Implementation Order

1. Add API function and types
2. Update WriteNoteDialog with submission logic
3. Update NoteSubmittedDialog to accept noteUri
4. Test success and error flows
5. Remove temporary test error message
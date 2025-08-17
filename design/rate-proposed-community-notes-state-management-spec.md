# Community Notes Rating: State Management Specification

This document outlines the technical specification for implementing the client-side state management for creating, updating, and deleting `social.pmsky.rating` records.

The architecture is designed to provide a robust, optimistic UI experience by mirroring the state management patterns used for "likes" and other post interactions. It relies on a combination of a mutation queue, a shadow cache for optimistic updates, and fetching server-confirmed state from the AppView.

## 1. Core Data Models

### 1.1. `NoteRatingState`

This object represents the complete state of a user's rating on a single note and is the payload managed by the mutation queue.

```typescript
// src/state/queries/community-notes.ts
export interface NoteRatingState {
  uri?: string; // AT-URI of the social.pmsky.rating record. Present after creation.
  val: 'helpful' | 'somewhat_helpful' | 'not_helpful' | null;
  reasons: string[];
}
```
A `val` of `null` signifies the rating has been deleted or was never created.

### 1.2. `CommunityNoteView`

This is the main data model used by UI components. It combines the base note data (from the AppView) with the user's current rating state (from the shadow cache).

```typescript
// src/state/queries/community-notes.ts
export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: NoteRatingState;
  }
}
```

### 1.3. `NoteShadow`

This object is stored in the client-side shadow cache to enable optimistic UI updates.

```typescript
// src/state/cache/community-notes-shadow.ts
export interface NoteShadow {
  rating: NoteRatingState;
}
```

## 2. State Management Architecture

The architecture consists of three main parts: a query to fetch data, a mutation queue to handle writes, and a shadow cache to provide optimistic updates.

### 2.1. File Breakdown

-   **`src/state/queries/community-notes.ts`:**
    -   `useNotesQuery()`: A query hook to fetch note data from the AppView's `getNotes` endpoint, including the `viewer` state. Currently returns mock data from `fetchNotes()`.
    -   `useNoteRatingMutationQueue()`: A mutation queue to manage all rating actions (create, update, delete) sequentially and atomically.

-   **`src/state/cache/community-notes-shadow.ts`:**
    -   Defines the `NoteShadow` interface.
    -   `useNoteShadow()`: A hook used by UI components to get a "live" view of a note, merging cached server data with optimistic updates from the shadow cache.
    -   `updateNoteShadow()`: A function used by the mutation queue to apply optimistic changes to the shadow cache.

-   **`src/lib/api/community-notes.ts`:**
    -   Contains wrappers (`createNoteRating`, etc.) that construct the `social.pmsky.rating` record and call the appropriate PDS `createRecord`, `putRecord`, or `deleteRecord` methods.

### 2.2. UI Flow and User Interactions

The rating UI follows a two-stage process:

1.  **Rating Selection (React State Only):** When the user clicks "Helpful," "Somewhat," or "No," this updates only local React state within the `NoteCard` component. This opens the reasons selection interface. No mutations are triggered at this stage.

2.  **Submission (Triggers Mutation):** Only when the user clicks "Submit" does the `NoteCard` construct the complete `NoteRatingState` object and enqueue it using `useNoteRatingMutationQueue`. This triggers the optimistic update and PDS write.

3.  **Edit/Delete Actions:** The existing context menu functionality for "Edit" and "Delete" must be preserved. These actions should integrate with the mutation queue system:
    -   **Edit:** Resets the UI to the rating selection state, pre-populated with the current rating values.
    -   **Delete:** Constructs a `NoteRatingState` with `val: null` and enqueues it for deletion.

### 2.3. Data Flow and API Synchronization

1.  **Fetch:** The `RateNotesScreen` uses `useNotesQuery()` to fetch the list of notes for a given post. Currently, this returns mock data from `fetchNotes()`. When AppView integration is added, this query will pass the user's `aid` to receive the initial `viewer.rating` state for each note. The response is stored in the React Query cache.

2.  **Display:** The `NoteCard` component uses `useNoteShadow(note)` to get the `CommunityNoteView`. Initially, this will be the mock note data from the cache.

3.  **Rating Selection:** User interactions with "Helpful," "Somewhat," "No" buttons update local React state only. This reveals the reasons selection interface.

4.  **Submit (Mutate):** When the user clicks "Submit," the `NoteCard` constructs the complete `NoteRatingState` object and enqueues it using `useNoteRatingMutationQueue`.

5.  **Optimistic Update:** The mutation queue immediately calls `updateNoteShadow()`, which updates the in-memory shadow for the note. The `useNoteShadow` hook detects this change, and the UI re-renders instantly to show the submitted rating state (success banner with Edit/Delete options).

6.  **PDS Write:** In the background, the mutation queue's `runMutation` function executes. It compares the previous state with the new state to determine whether to call `createRecord`, `putRecord`, or `deleteRecord` on the user's PDS.

7.  **Reconciliation:** On a successful write to the PDS, the `onSuccess` callback of the mutation queue invalidates the `useNotesQuery` data. With mock data, this simply refreshes the mock data. When AppView integration is added, this will trigger a refetch from the AppView to ensure the client is in sync with the backend.

### 2.4. `useNoteRatingMutationQueue` Logic

The queue manages the C-U-D logic based on the transition between states:

-   **Create:** `prevState.val` is `null`, `nextState.val` is not `null`. Call `createNoteRating`.
-   **Update:** `prevState.val` is not `null`, `nextState.val` is not `null`. Call `updateNoteRating`.
-   **Delete:** `prevState.val` is not `null`, `nextState.val` is `null`. Call `deleteNoteRating`.

### 2.5. Mock Data Considerations

Currently, the system operates with mock data from `fetchNotes()`. The shadow cache will store viewer rating states that are created through UI interactions, overlaying them on top of the mock note data. This allows for full testing of the optimistic update flow and mutation queue behavior before AppView integration is complete.

This approach provides a robust, efficient, and user-friendly state management system for community note ratings.
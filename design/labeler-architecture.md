# Community Notes Label Architecture

The Community Notes app will piggyback on Bluesky labelers for displaying helpful notes, as well as the "rate proposed community notes" promptys.

## Community-Notes-Enabled Social Apps

Community-Notes-Enabled Social Apps will:

- Display helpful community notes below posts
- Show "rate proposed community notes" prompts below notes that need ratings
- Have a "Write a Community Note" menu option

These apps should be able to use existing Bluesky App Views and PDSs. To find posts with helpful notes or notes needing ratings, the app view will rely on labels.

### App Labeler Approach

The Community Notes labeler will be configured as an **App Labeler** rather than requiring individual user subscriptions:

- The Community Notes labeler DID will be added to `BskyAgent.appLabelers` configuration
- This ensures all users automatically receive Community Notes labels without any subscription process
- Labels from app labelers are automatically sent in PostView objects returned by the bsky service (the app view)
- For posts with a 'proposed-note' label, the front-end will display a "rate proposed community notes" prompt
- For posts with a 'note' label, the front-end will lookup the notes by calling getNotesForSubjects in the Community Notes service

This approach:
- ✅ Requires no user action or subscription management
- ✅ Provides consistent experience across all users
- ✅ Follows the same pattern as Bluesky's core moderation services
- ✅ Eliminates complex subscription logic and error handling


## Community Notes Service: getNotesForSubjects endpoint

- The Community Notes Service will also implement the getNotesForSubjects endpoint, which will take one or more URIs of subjects (e.g. posts) that have "note" labels, and return the notes.
	- This service will need to have access to two shared tables:
		- the labelStatus table from the labeler service
		- the proposals table with all proposed notes
	- getNotesForSubjects will do a joint and return up to one helpful note per subject

## Community Notes Labeler Service

- The community notes labeler service will implement the /xrpc/com.atproto.label.queryLabels endpoint and publish "note" and "proposed-note" labels
- These labels will not contain the text of the note (Bsky app views will ignore these). The getNotesForSubject endpoint will provide this instead.
- There will be a database with labelStatusEvent table. 
- The labelStatusEvent will include a note URI and status "created", "needs ratings", "rated helpful" and "rated not helpful". Possibly also "deleted". These should also have some score metadata so that when there is more than one helpful note the most helpful can be selected.
- The aggregator service will run the algorithm and bulk-insert labelStatusEvents into the DB -- sharing the DB table.
- A sql trigger, perhaps, maintains a labelStatus table, with the latest label status
- The getNotesForSubject endpoint will read the labelStatus table.
- Another trigger will update the "label" table, inserting "note" and "proposed-note" labels, and "neg" labels with status changes. The queryLabels endpoint will return the content of the label table.


## Dev-env Setup

Changes to dev-env
	- The actually code for subscribing to labelers and importing labels is *not* implemented by the open source app view in the atproto repo (the bsky package)
	- Instead, there is a database with labels, and labelers are inserted during mock data setup.
	- To start, let's have the mock data setup insert some mock note proposals for some of the mock posts, a couple that have the "proposed-note" label, a couple with the "note" label, and a couple with both.
	- Maybe eventually we make the labeler service directly insert into the bsky app view DB table in dev environments?

## Implementation Plan

### Phase 1: Label Detection & Conditional Display
**Goal**: Make Community Notes prompts conditional based on labels instead of always showing

**Tasks**:
1. **Add label detection utilities**
   - Create helper functions to check for `note` and `proposed-note` labels in PostView objects
   - Add TypeScript types for Community Notes labels

2. **Make RateCommunityNotesPrompt conditional**
   - Modify `RateCommunityNotesPromptDefault` and `RateCommunityNotesPromptEmbedded` components
   - Only show prompts when posts have `proposed-note` labels
   - Remove current always-visible behavior

3. **Add mock labels to dev environment**
   - Update mock data setup to include Community Notes labels on test posts
   - Create variety of test cases: posts with `note` labels, `proposed-note` labels, and both

**Files to modify**:
- `src/components/CommunityNotes/RateCommunityNotesPrompt.tsx`
- `src/lib/community-notes/labels.ts` (new file)
- Mock data setup files

### Phase 2: Helpful Notes Display
**Goal**: Display helpful Community Notes inline with posts that have `note` labels

**Tasks**:
1. **Create HelpfulCommunityNote component**
   - Design component to display helpful notes below posts
   - Include note text, author pseudonym, and timestamp
   - Add "Show more details" functionality

2. **Integrate with posts that have `note` labels**
   - Add conditional rendering in post components
   - Fetch note content using existing `getNotesForSubjects` API
   - Handle loading and error states

3. **Handle multiple helpful notes per post**
   - Display most helpful note by default
   - Add UI to cycle through multiple notes if present

**Files to modify**:
- `src/components/CommunityNotes/HelpfulCommunityNote.tsx` (new file)
- `src/view/com/posts/PostFeedItem.tsx`
- `src/screens/PostThread/components/ThreadItemAnchor.tsx`
- `src/view/com/post/Post.tsx`

### Phase 3: App Labeler Integration
**Goal**: Configure Community Notes labeler as an App Labeler for automatic label delivery

**Tasks**:
1. **Add Community Notes labeler to app configuration**
   - Modify `configureAdditionalModerationAuthorities()` to include Community Notes labeler DID
   - Add environment-specific labeler DIDs (dev/staging/prod)
   - Ensure labeler is included in `atproto-accept-labelers` headers

2. **Add proper error handling for labeler failures**
   - Handle cases where Community Notes labeler is unavailable
   - Graceful degradation when labels are missing
   - Add logging for labeler-related issues

3. **Test with real labeler service**
   - Verify label delivery from actual Community Notes labeler service
   - Test label updates and real-time behavior
   - Validate performance impact

**Files to modify**:
- `src/state/session/additional-moderation-authorities.ts`
- `src/lib/constants.ts` (add labeler DIDs)
- Error handling in Community Notes components

### Phase 4: Production Readiness
**Goal**: Ensure robust, production-ready Community Notes label integration

**Tasks**:
1. **Add proper loading states**
   - Show loading indicators while fetching note content
   - Implement skeleton screens for note components
   - Handle slow network conditions gracefully

2. **Implement fallback behavior**
   - Define behavior when labeler service is unavailable
   - Add retry logic for failed label/note fetches
   - Provide clear error messages to users

3. **Add analytics and monitoring**
   - Track Community Notes engagement metrics
   - Monitor labeler service performance
   - Add error reporting for debugging

4. **Performance optimization**
   - Optimize note fetching and caching
   - Minimize impact on post rendering performance
   - Add proper memoization for label detection

**Files to modify**:
- All Community Notes components (loading states)
- `src/lib/analytics/` (add Community Notes events)
- Performance monitoring integration

### Success Criteria

**Phase 1 Complete**: Community Notes prompts only appear on posts with `proposed-note` labels
**Phase 2 Complete**: Helpful notes display inline with posts that have `note` labels  
**Phase 3 Complete**: Labels are automatically delivered via App Labeler configuration
**Phase 4 Complete**: Production-ready with proper error handling, loading states, and monitoring

### Dependencies

- **Community Notes Labeler Service**: Must be deployed and publishing labels
- **Community Notes Service**: `getNotesForSubjects` endpoint must be available
- **Labeler DID**: Community Notes labeler DID must be known for each environment

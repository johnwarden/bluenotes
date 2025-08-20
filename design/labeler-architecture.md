# Community Notes Label Architecture

The Community Notes app will piggyback on Bluesky labelers for displaying helpful proposals, as well as the "rate proposed community notes" prompts.

## Community-Notes-Enabled Social Apps

Community-Notes-Enabled Social Apps will:

- Display helpful community notes below posts
- Show "rate proposed community notes" prompts below proposals that need ratings
- Have a "Write a Community Note" menu option

These apps should be able to use existing Bluesky App Views and PDSs. To find posts with helpful notes or notes needing ratings, the app view will rely on labels.

### App Labeler Approach

The Community Notes labeler will be configured as an **App Labeler** rather than requiring individual user subscriptions:

- The Community Notes labeler DID will be added to `BskyAgent.appLabelers` configuration
- This ensures all users automatically receive Community Notes labels without any subscription process
- Labels from app labelers are automatically sent in PostView objects returned by the bsky service (the app view)
- For posts with a 'proposed-label:needs-context' label, the front-end will display a "rate proposed community notes" prompt
- For posts with a 'needs-context' label, the front-end will lookup the proposals by calling getProposalsForSubjects in the Community Notes service

This approach:
- ✅ Requires no user action or subscription management
- ✅ Provides consistent experience across all users
- ✅ Follows the same pattern as Bluesky's core moderation services
- ✅ Eliminates complex subscription logic and error handling


## Community Notes Service: getProposalsForSubjects endpoint

- The Community Notes Service implements the getProposalsForSubjects endpoint, which takes one or more URIs of subjects (e.g. posts) and returns proposals with optional filtering.
	- This service has access to two shared tables:
		- the status table from the labeler service
		- the proposals table with all proposed notes
	- getProposalsForSubjects supports filtering by status (needs_more_ratings, rated_helpful, rated_not_helpful) and label (needs-context, etc.)
	- By default returns ALL proposals - frontend must explicitly filter for rated_helpful if only approved proposals are desired

## Community Notes Labeler Service

- The community notes labeler service will implement the /xrpc/com.atproto.label.queryLabels endpoint and publish "needs-context" and "proposed-label:needs-context" labels
- These labels will not contain the text of the proposal (Bsky app views will ignore these). The getProposalsForSubjects endpoint will provide this instead.
- There will be a database with statusEvent table.
- The statusEvent will include a proposal URI and status "created", "needs_more_ratings", "rated_helpful" and "rated_not_helpful". Possibly also "deleted". These should also have some score metadata so that when there is more than one helpful proposal the most helpful can be selected.
- The aggregator service will run the algorithm and bulk-insert statusEvents into the DB -- sharing the DB table.
- A sql trigger, perhaps, maintains a status table, with the latest label status
- The getProposalsForSubjects endpoint will read the status table.
- Another trigger will update the "label" table, inserting "needs-context" and "proposed-label:needs-context" labels, and "neg" labels with status changes. The queryLabels endpoint will return the content of the label table.


## Dev-env Setup

Changes to dev-env
	- The actually code for subscribing to labelers and importing labels is *not* implemented by the open source app view in the atproto repo (the bsky package)
	- Instead, there is a database with labels, and labelers are inserted during mock data setup.
	- The mock data setup inserts proposals for some of the mock posts, with "proposed-label:needs-context" labels for proposals needing ratings, "needs-context" labels for approved proposals, and some posts with both.
	- Maybe eventually we make the labeler service directly insert into the bsky app view DB table in dev environments?

## Implementation Plan

### Phase 1: Label Detection & Conditional Display
**Goal**: Make Community Notes prompts conditional based on labels instead of always showing

**Tasks**:
1. **Add label detection utilities**
   - Create helper functions to check for `needs-context` and `proposed-label:needs-context` labels in PostView objects
   - Add TypeScript types for Community Notes labels

2. **Make RateCommunityNotesPrompt conditional**
   - Modify `RateCommunityNotesPromptDefault` and `RateCommunityNotesPromptEmbedded` components
   - Only show prompts when posts have `proposed-label:needs-context` labels
   - Remove current always-visible behavior

3. **Add mock labels to dev environment**
   - Update mock data setup to include Community Notes labels on test posts
   - Create variety of test cases: posts with `needs-context` labels, `proposed-label:needs-context` labels, and both

**Files to modify**:
- `src/components/CommunityNotes/RateCommunityNotesPrompt.tsx`
- `src/lib/community-notes/labels.ts` (new file)
- Mock data setup files

### Phase 2: Helpful Proposals Display
**Goal**: Display helpful Community Notes inline with posts that have `needs-context` labels

**Tasks**:
1. **Create HelpfulCommunityNote component**
   - Design component to display helpful proposals below posts
   - Include proposal text, author pseudonym, and timestamp
   - Add "Show more details" functionality

2. **Integrate with posts that have `needs-context` labels**
   - Add conditional rendering in post components
   - Fetch proposal content using `getProposalsForSubjects` API with `status=rated_helpful` filter
   - Handle loading and error states

3. **Handle multiple helpful proposals per post**
   - Display most helpful proposal by default
   - Add UI to cycle through multiple proposals if present

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

**Phase 1 Complete**: Community Notes prompts only appear on posts with `proposed-label:needs-context` labels
**Phase 2 Complete**: Helpful proposals display inline with posts that have `needs-context` labels
**Phase 3 Complete**: Labels are automatically delivered via App Labeler configuration
**Phase 4 Complete**: Production-ready with proper error handling, loading states, and monitoring

### Dependencies

- **Community Notes Labeler Service**: Must be deployed and publishing labels
- **Community Notes Service**: `getProposalsForSubjects` endpoint must be available
- **Labeler DID**: Community Notes labeler DID must be known for each environment

### API Changes Summary

- **REMOVED**: `getNotesForSubjects` endpoint
- **NEW**: `getProposalsForSubjects` endpoint with filtering capabilities
- **Label Values**: `"note"` → `"needs-context"`, `"proposed-note"` → `"proposed-label:needs-context"`
- **Record Keys**: `note_` prefix → `proposal_` prefix
- **Default Behavior**: New API returns ALL proposals by default (frontend must filter for `status=rated_helpful`)

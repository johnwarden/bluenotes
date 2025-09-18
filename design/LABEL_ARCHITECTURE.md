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
- For posts with a 'proposed-annotation' label, the front-end will display a "rate proposed community notes" prompt
- For posts with a 'annotation' label, the front-end will lookup the proposals by calling getProposals in the Community Notes service

This approach:
- ✅ Requires no user action or subscription management
- ✅ Provides consistent experience across all users
- ✅ Follows the same pattern as Bluesky's core moderation services
- ✅ Eliminates complex subscription logic and error handling


## Community Notes Service: getProposals endpoint

- The Community Notes Service implements the getProposals endpoint, which takes one or more URIs of subjects (e.g. posts) and returns proposals with optional filtering.
  - This service has access to:
    - the `score` table
    - the proposals table with all proposed notes
  - getProposals supports filtering by status (needs_more_ratings, rated_helpful, rated_not_helpful) and label (annotation, etc.)
  - By default returns ALL proposals - frontend must explicitly filter for rated_helpful if only approved proposals are desired

## Community Notes Labeler Service

- The community notes labeler service will implement the /xrpc/com.atproto.label.queryLabels endpoint and publish "annotation" and "proposed-annotation" labels
- These labels will not contain the text of the proposal (Bsky app views will ignore these). The getProposals endpoint will provide this instead.
- There will be a database with `scoreEvent` table.
- The `scoreEvent` will include a proposal URI and status "created", "needs_more_ratings", "rated_helpful" and "rated_not_helpful". Possibly also "deleted". These should also have some score metadata so that when there is more than one helpful proposal the most helpful can be selected.
- The aggregator service will run the algorithm and bulk-insert `scoreEvents` into the DB -- sharing the DB table.
- A sql trigger, perhaps, maintains a `score` table, with the latest label status
- The getProposals endpoint will read the `score` table.
- Another trigger will update the "label" table, inserting "annotation" and "proposed-annotation" labels, and "neg" labels when status changes *from* "rated_helpful". The queryLabels endpoint will return the content of the label table.


## Dev-env Setup

Changes to dev-env
  - The actually code for subscribing to labelers and importing labels is *not* implemented by the open source app view in the atproto repo (the bsky package)
  - Instead, there is a database with labels, and labelers are inserted during mock data setup.
  - The mock data setup inserts proposals for some of the mock posts, with "proposed-annotation" labels for proposals needing ratings, "annotation" labels for approved proposals, and some posts with both.
  - Maybe eventually we make the labeler service directly insert into the bsky app view DB table in dev environments?

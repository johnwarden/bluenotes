I want to add a Community Notes feature to this BlueSky web client, based on the architecture and lexicon defined in the proposals folder.

Since this project is an app view, it just needs features to 1) show notes under posts 2) browse proposed community notes 3) submit notes and 4) vote on notes.

To start with, we just want to implement the UI for #4. We want a screen/page where people can scroll through the proposed notes for a post, and vote on those notes (see screenshots).

For now let's add a static "Rate Proposed Community Notes" label under every post that leads to this "vote on notes" screen.

To focus just on the UI, we will use mock data. We want a stub that fetches a list of (mock) notes given a post ID, and a stub function that stores the user's votes (but doesn't do anything). Let's create a static file at src/lib/mock-data/community-notes.ts that exports a mock note object conforming to the org.opencommunitynotes.label lexicon.

After a user casts their vote, just show "You rated this note as ..." as shown in the screenshot after-rating.jpg.

Here are some design decisions:
1) Client-Managed "Anonymous IDs" (e.g. "opencommunitynotes.org:5684B38EB5…". Anonymous ID is based on SHA 256 hash of user's internal ID
2) Community Notes-enabled PDS with a single DID signing all transactions. 
3) Include a "Write Community Note" item in the ... menu for posts
4) User interface that looks as much as possible like X's Community Notes

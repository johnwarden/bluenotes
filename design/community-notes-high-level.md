# High Level Requirements: Community Notes Integration into BlueSky Web Client

I want to add a Community Notes feature to this BlueSky web client, based on the architecture and lexicon defined in proposals/001-architecture and proposals/002-lixicon

Since this project is an app view, it just needs features to 1) show notes under posts 2) browse proposed community notes 3) submit notes and 4) vote on notes.

Here are some design decisions:
1) Client-Managed "Anonymous IDs" (e.g. "opencommunitynotes.org:5684B38EB5…". Anonymous ID is based on SHA 256 hash of user's internal ID
2) Community Notes-enabled PDS with a single DID signing all transactions. 
3) Include a "Write Community Note" item in the ... menu for posts
4) User interface that looks as much as possible like X's Community Notes


# Can find list of files in: 

@src-directory-listing.txt 

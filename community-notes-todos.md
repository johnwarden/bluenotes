Signing page:
	Remove "Join the Conversation"
	Use logotype with "Bluenotes with Community NOtes" logo	
	"Sign Up with Bluesky"
	"Sign In with Bluesky Account"


 Update these:
 	<Link to="/community-notes/about" label="Learn more about our values">
 	label="Send us a DM @CommunityNotes">


possible bug:
	feed endpoint returns posts with "needs_more_ratings" status
	scoring service changes status to "rated_helpful"
	frontend calls getProposals?status=needs_more_ratings. Nothing returned
		Solution: simply omit that post from the community notes feed page .

enabel push notifications for mobile: proper google-services.json
/ipcc endpoint really working
code signing for enhanced features like push notifications, deep links 
i8n
About page
Disable the create account flow (we don't have email configured?)
Found a bug. 
	this post was i the new feed
		http://localhost:19006/profile/piyushmittal.bsky.social/post/3lyyx7mlh5s2h
		http://localhost:19006/community-notes/needs_your_help
	but it has been rated helpful. So there is a 'no community note fouhd' error	

Labeler doesn't support http:// URLs

Regular labels also appearing

When you create a note, you don't immediately see label.

Drew about schema for createProposal, rateProposal, etc.


Back button on post-with-notes wrong link
Please be sure to:

- Change all branding in the repository and UI to clearly differentiate from Bluesky.
- Change any support links (feedback, email, terms of service, etc) to your own systems.
- Replace any analytics or error-collection systems with your own so we don't get super confused.


- get rid of a lot of backend debug logging
- How we are handling CIDs in the databse and with all the lookups etc.
- "Please rate at least one note" functionality
	- already have showRatingWarning
- Check if user has already written note *before* going to write a note screen.

- view count (currently hardcoded)
- reasons (currently hardcoded with "Directly addresses the posts claim")
Links like "see examples"


STub algo in dev env. Why? Because if you add a note, it won't show up, because the proposed-: label won't be created. 

Change label values? from note to note?: What about disputes

Lower Prioirty UI:
	- Minimum Rating Impact
	- Sign up flow (can do later)
	- Don't prompt to rate note you created
	- "Is this proposed note helpful" for notes that don't have helpful status. I guess shown only to community notes members?

Must-Do Service
	- Actual alias logic

Must DO Aggregator
	- Logic for different status, including "needs ratings"

- How do appeals work?
- Bot that posts (helpful?) notes as replies.

- Bootstrapping:
	- Notes on Posts that are identical to posts in X
	- Notes on posts that are just URLs
	- Notes on images


## performance
make single call to getProposals on feed pages, cache results, NoteWidget gets details from cache

In the notes service,
	
	- ATP Agent Caching: The Community Notes service was creating multiple AtpAgent instances (one per API request), and each agent was independently managing AT Protocol sessions. When sessions refresh (which happens frequently for security), each agent would log a debug message.. For even better performance, we could implement agent caching to reuse AtpAgent instances instead of creating new ones for each request, but the current fix resolves the immediate logging issue effectively.


Get rid of .env in atprotoo. Setup tests and dev-env with labeler signing key.




- make DB source of truth for proposal and vote records
- getProposalsForSubjects => getProposals
- multipel calls to getProposalsForSubjects when pulling up a feed

- add logging to queryLabels and subscribeLabels endpoints in case we need to debug
- endpoint that exposes labeler did. have frontend query this.

- How we are handling CIDs in the databse and with all the lookups etc.

Must-Do UI
	- Test that we can use accept-labelers headings with live bsky app view

Lower Prioirty UI:
	- "Please rate at least one note" functionality
		- already have showRatingWarning
	- Check that user has already written note *before* going to write a note screen.
	- Minimum Rating Impact
	- Sign up flow (can do later)
	- Don't prompt to rate note you created
	- Change "note" to "proposal" where appropriate in code
	- "Is this proposed note helpful" for notes that don't have helpful status. I guess shown only to community notes members?
	this is shown on the post page.	

Must-Do Service
	- Labeler logic
	- Actual alias logic


Must DO Aggregator
	- Logic for different status, including "needs ratings"

Refactoring:
	- In getProposalsForSubject, it still returns a "notes" array. Also descriptiosn are about notes instead of proposals. same for other endpoints whose names changed.
	- NoteCard.tsx and other components -- rethink names

- How do appeals work?
- Bot that posts (helpful?) notes as replies.

In the notes service,
	
	- ATP Agent Caching: The Community Notes service was creating multiple AtpAgent instances (one per API request), and each agent was independently managing AT Protocol sessions. When sessions refresh (which happens frequently for security), each agent would log a debug message.. For even better performance, we could implement agent caching to reuse AtpAgent instances instead of creating new ones for each request, but the current fix resolves the immediate logging issue effectively.

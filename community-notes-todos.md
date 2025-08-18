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


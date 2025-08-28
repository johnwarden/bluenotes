- get rid of a lot of backend debug logging
- How we are handling CIDs in the databse and with all the lookups etc.
- "Please rate at least one note" functionality
	- already have showRatingWarning
- Check if user has already written note *before* going to write a note screen.

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


In the notes service,
	
	- ATP Agent Caching: The Community Notes service was creating multiple AtpAgent instances (one per API request), and each agent was independently managing AT Protocol sessions. When sessions refresh (which happens frequently for security), each agent would log a debug message.. For even better performance, we could implement agent caching to reuse AtpAgent instances instead of creating new ones for each request, but the current fix resolves the immediate logging issue effectively.

rateProposal calls syncToPds, createProposasl doesn't. Create proposal inserts a rating record. Review how this all works.


In rated helpful page, we should show the standard RatedHelpfulNote component. Underneaeth that (underneath the status button), "see all notes on this post >" should link to Post with NOtes


The status widget should show the actual status.

On the "needs your help" page, it should show "Rate proposed community notes", thenote, and "is this proposed note helpful? rate" underneath. Same with new.


ALso on this pages, the status lines (likes, etc.) is shown below the note

Top-of-page prompts for the three notes pages.

add label=needsContext to getProposals queries

view count (currently hardcoded)
reasons (currently hardcoded with "Directly addresses the posts claim")

make single call to getProposals on feed pages, cache results, NoteWidget gets details from cache



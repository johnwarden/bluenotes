# Community Notes Data Service Requirements

The Community Notes data service will be a new service under the atproto repo. The service will be used for reading and writing notes and ratings, and publishing labels (notes that have achieved status of helpful).

## Writing Note and Rating Records

The data service will store notes and ratings in an internal database. It will then publish notes and ratings to atproto: but there are some special requirements for how these records are published.

- Notes and ratings are anonymous. They are all signed using a single service account DID, with an additional anonymous IDs fields.
- Only users with the required rating impact score can propose notes (submit note records).
- Ratings are only published to atproto *after* the note has achieved a status of helpful or not helpful.

## Reading Note and Rating Records

The Community Notes app will also provide an API that returns notes needing ratings (e.g. given a post ID). And this API needs to return not just the Note, but the NoteView, which is a Note "hydrated" with additional information about the viewer (user) -- specifically, any existing rating for that user on that note. Hydration would typically function of an AppView in atproto -- this is how posts are hydrated along with information about whether the user has liked the post -- but since ratings aren't immediately published to atproto they won't be available to regular app views. Instead the API for getting NoteViews must be an authenticated request to the Community Notes app.

Finally, the app will publish useful notes (labels with text), as well as metadata about notes (needs more ratings, etc.). 
 
This all point to a single Community Notes service that has features of a PDS, App View, and Labeler. 

It must implement API endpoints for:

- Writing Notes
- Rating Notes. The same endpoint can be used to, create or update a rating (an upsert), or delete (setting the "val" of the ratings to "").
- Getting Notes. Returns NoteView objects which include Note plus the viewer's Rating, if any:
	- For subject (URI or URI+CID)
		- Returns all proposed note for the subject
		- With optional viewer parameter (requires auhentication)
	- Rated By Viewer 
		- all notes the viewer has rated, ordered by age
	- Needing Ratings By Viewer
		- notes the system would *like* the viewer to rate, ordered by priority


The CN Data Service will be a new service under a fork of the atproto repo.

Question:
	How does auth work. User authorizes with PDS, and then provides token that CN Data service can use to verify they have authority to write and rate notes?

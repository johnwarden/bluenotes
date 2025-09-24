# Welcome to the Bluenotes Beta

Thanks for participating in the Bluenotes beta.

Bluenotes is a clone of the Bluesky social app, with the addition of Community Notes feature.

The Community Notes feature itself is mostly a clone of X's implementation, down to the details of the user interface and the actual algorithm for rating notes.

## Testing Guidelines

There are three main UI features we want you to help us test during this beta:
	- Browsing Notes
	- Rating Notes
	- Writing Notes
	- Display of Helpful Notes

### Signing In

All these features require you to be signed in to Bluenotes.

#### Signing In Using Existing Account

If you already have a Bluesky/Atproto account, click "Sign in", and enter user your Bluesky/atproto username and password. Sorry about asking for passwords: hopefully, we'll replace the username/password login with a proper Oatuah for Atproto soon.

#### Creating a new account.

If you don't have a Bluesky/atproto account, click "Create account" and. Note if you do create a new account using Bluenotes, it will actually be hosted on Bluesky servers (e.g. you can login with your new account to [https://bsky.app/](https://bsky.app/))

### Browsing Notes

Once you've logged in, you can click the "Community Notes" item in the left navigation bar to browse community notes that other users have written. Note there are three tabs on this page, "Needs Your Help", "New" and "Rated Helpful".

### Rating Notes

Click the "Rate" button below a note to go to the note rating page, and submit your rating. Ideally, each tester will thoughtfully rate several notes, so there is enough data for the algorithm to produce meaningful results.

### Writing Notes

To write a note, click the context menu (the … icon) next to a post, and choose "Write a Community Note", then fill out the form.

### Display of Helpful Notes

Once the algorithm has rated a note as helpful, that note should be displayed wherever the corresponding post is displayed. To help test this, find posts that have notes that have been rated helpful (the "rated helpful" tab of the Community Notes page). Make sure that note is displayed wherever the post post is displayed: when the post appears in search results, feeds, quote posts, etc.

## FAQs

## The Algorithm

We're using the [open source Community Notes implementation](https://github.com/twitter/communitynotes) on the backend.

### Anonymity

All users are given an Anonymous ID. 

The Open Community Notes proposal specifies that notes and rating be stored as ATProto records. During the beta, this feature is switched off. 

During the beta, we aren't writing 

### Manipulation Resistance

Sybil Attacks



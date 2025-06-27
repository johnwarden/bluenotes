### Files for Reference and Modification

*   **`src/lib/routes/router.ts`** & **`view/shell/index.web.tsx`**
    *   **Summary:** `router.ts` seems to define the navigation routes for the mobile app, while `index.web.tsx` in `view/shell/` sets up the routes and navigation for the web version. They map URL paths to specific screen components.
    *   **Learnings:** To add our new "Rate Notes" screen, we will need to declare a new route in both the web and mobile navigation configurations. This is how the application will know which component to render when a user navigates to the community notes URL.

*   **`src/screens/PostThread/index.tsx`**
    *   **Summary:** This is the main component for the post thread screen. It fetches the post and its replies and renders the overall view.
    *   **Learnings:** This is the container for the `ThreadItemAnchor` component where you've added the "Readers Added Context" label. It shows how data is fetched and passed down to child components, which is a pattern we'll follow.

*   **`src/screens/PostThread/components/ThreadItemAnchor.tsx`**
    *   **Summary:** You correctly identified this as a key file. It renders the main post that a thread is anchored to. Your edit here to add the static label was the right place to start for this screen.
    *   **Learnings:** This is where we will replace your static text with a "Rate Proposed Community Notes" link that navigates to our new screen. Its structure will serve as a guide for how we will eventually display the "final" helpful note.

*   **`view/com/post/Post.tsx`**
    *   **Summary:** This component renders a post when it appears in a feed (as opposed to being the main post in a thread).
    *   **Learnings:** While your current focus is on the post thread view, we will also need to add the "Rate Proposed Community Notes" link to posts as they appear in feeds. This file is the place to do that.

*   **`src/components/PostControls/PostMenu/index.tsx`**
    *   **Summary:** This component defines the content of the "..." menu that appears on every post.
    *   **Learnings:** As per your design decisions, we will add a "Write Community Note" item here. This file shows how to add new actions to that menu.

*   **`src/screens/Post/PostLikedBy.tsx`** & **`src/screens/Profile/ProfileFollowers.tsx`**
    *   **Summary:** `PostLikedBy` displays a list of users who liked a post, and `ProfileFollowers` shows a list of a user's followers. Both are "list" screens that fetch and display data related to a primary object (a post or a profile).
    *   **Learnings:** These are excellent templates for our `RateNotesScreen.tsx`. They demonstrate the standard way this application builds screens that show a list of items, including fetching data, handling loading and error states, and rendering the list. We will use their structure as a guide.

### New Files We Will Create

*   **`src/lib/mock-data/community-notes.ts`**: To hold our mock notes and data-fetching stubs.
*   **`src/screens/CommunityNotes/RateNotesScreen.tsx`**: The main screen for rating notes, which will be structured like `PostLikedBy.tsx`.
*   **`src/components/CommunityNotes/NoteCard.tsx`**: A new component to display a single note and its voting controls.
*   **`view/screens/CommunityNotesRating.tsx`**: A web-specific wrapper for the `RateNotesScreen`.

### Implementation Summary and Learnings

*   **Initial Implementation:** We successfully created the initial UI for rating community notes. This involved creating a new screen (`RateNotesScreen`), a `NoteCard` component, and mock data (`community-notes.ts`). We also added the necessary routing and navigation links. Throughout this process, we prioritized using existing components and styling conventions to ensure visual consistency.

*   **Problem Identification:** When navigating to the "Rate Notes" screen, we observed that it was displaying the entire thread of replies below the parent post, pushing the community notes out of view. My investigation revealed that this was because we were using the `<PostThread />` component to display the parent post. This component is designed to render the full thread, which was not the desired behavior for this screen.

*   **Correction Plan:** The correct component for displaying a single post is `<Post />` from `view/com/post/Post.tsx`. The plan is to refactor `RateNotesScreen` to fetch the data for the parent post and render it using the `<Post />` component, which will ensure that only the post itself is displayed at the top of the screen.

*   **Design Decisions Recap:**
    *   **UI Mocking:** We started with mock data to focus on UI implementation first, as requested. This allowed for rapid prototyping without backend dependencies.
    *   **Component Reusability:** We created a dedicated `NoteCard` component to encapsulate the logic and styling for a single note, making the code cleaner and easier to maintain.
    *   **Routing and Navigation:** A new route was added for the "Rate Notes" screen, and a "Rate Proposed Community Notes" link was added to each post to provide a clear entry point for the feature.
    *   **Styling:** We used the existing design system (`usePalette`, `s`, `Button`, `Text`) to ensure a consistent look and feel with the rest of the application.

*   **Layout Correction:** The layout issue was resolved by wrapping the content of `RateNotesScreen` in the `<Layout.Center>` component. This component is used throughout the application to create the main content column and ensures that screen elements are properly constrained and do not overlap with side navigation panes. 
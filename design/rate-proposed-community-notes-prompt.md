# Requirements: Rate Proposed Community Notes Prompt

Whow the "rate proposed community notes" prompt underneath posts that have notes.

The prompt should look like the screenshot in rate-proposed-community-notes-prompt.jpg when the post is shown in a feed.

The prompt should look like rate-proposed-community-notes-embedded.jpg when the post is embedded in another post (e.g. quote tweet).

For now, show the prompt for all posts wherever they are shown (e.g. on a PostThread screen, in a feed, or embedded).  

---

## UI Specification

This specification is based on a visual analysis of the provided screenshots.

### Component: `RateCommunityNotesPrompt`

**Overall Structure & Placement**

*   **Description**: A full-width, clickable banner displayed directly below the post's engagement metrics (replies, reposts, likes, views).
*   **Action**: Tapping or clicking anywhere on the component should navigate the user to a screen where they can rate the proposed community notes for the post.

**Container Styling**

*   **Shape**: A rectangle with rounded corners.
*   **Dimensions**: Spans the full width of the parent post's content area.
*   **Margin**: `12px` top margin to create space from the engagement metrics bar above it.
*   **Border**:
    *   `width`: `1px`
    *   `style`: `solid`
    *   `color`: `rgb(179, 215, 255)`
*   **Border Radius**: `8px`.
*   **Background Color**: `rgb(235, 245, 255)`.
*   **Padding**:
    *   `top` & `bottom`: `12px`
    *   `left` & `right`: `16px`

**Content Details & Layout**

The content is arranged horizontally within the container using a flexbox layout, with all items vertically centered.

1.  **Community Notes Icon (Left)**
    *   **Icon**: A stylized representation of a building or group, signifying "Community Notes".
    *   **Color**: `rgb(29, 155, 240)`
    *   **Size**: `22px` x `22px`

2.  **Descriptive Text (Center)**
    *   **Text**: "Rate proposed Community Notes"
    *   **Font**: `Inter`
    *   **Size**: `15px`
    *   **Weight**: `700` (Bold)
    *   **Color**: `rgb(29, 155, 240)`
    *   **Spacing**: `12px` margin to the left, creating a gap from the icon.

3.  **Navigation Arrow (Right)**
    *   **Icon**: A right-facing arrow or chevron (`>`).
    *   **Color**: `rgb(29, 155, 240)`
    *   **Size**: `22px` x `22px`

**Layout Implementation Note**: A flex container with `justify-content: space-between` should be used. The Community Notes icon and the descriptive text should be grouped together on the left side, while the navigation arrow is pushed to the far right.


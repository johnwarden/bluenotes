# Community Notes Main Page Implementation Plan

## Overview

This document outlines the implementation plan for the Community Notes main page in the Bluesky app, following Twitter/X's design patterns.

## UI Design Analysis

### Layout Structure
The page follows a **three-column layout** similar to Twitter/X:

1. **Left Sidebar** (~240px width on desktop, collapsible on smaller screens)
2. **Main Content Area** (center column, responsive width)  
3. **Right Sidebar** (optional, for additional content)

### Left Sidebar Design
- **Background**: Uses theme background color (`t.atoms.bg`)
- **Padding**: `a.px_xl` (24px horizontal padding)
- **Navigation Items**:
  - **"Notes"** - Community Notes icon + text, current page highlighted
  - **"Your profile"** - User circle icon + text  
  - **"About"** - Info/question mark icon + text
- **Styling**: Each nav item uses `NavItem` component pattern:
  - `a.flex_row, a.align_center, a.p_md` (16px padding)
  - `a.rounded_sm` (small border radius)
  - Hover state: `t.atoms.bg_contrast_25` (light gray background)
  - Active state: Bold text (`a.font_heavy`)
  - Icons: 28px width (`NAV_ICON_WIDTH`)

### Main Content Header
- **Background**: Theme background (`t.atoms.bg`)
- **Tab Bar**: Uses existing `TabBar` component
  - **Tabs**: "Needs your help", "New", "Rated helpful"
  - **Typography**: `a.text_md, a.font_bold` (14px, bold)
  - **Active indicator**: 2px blue bottom border (`t.palette.primary_500`)
  - **Padding**: `ITEM_PADDING = 10px` horizontal, `10px` top, `10px` bottom
  - **Background**: Transparent with bottom border (`t.atoms.border_contrast_low`)

### Content Area
- **Instruction Prompt**:
  - **Background**: Light gray (`t.atoms.bg_contrast_25`)
  - **Border**: `a.border, t.atoms.border_contrast_low`
  - **Padding**: `a.p_md` (16px)
  - **Border radius**: `a.rounded_lg` (8px)
  - **Typography**: `a.text_md, t.atoms.text` (14px, theme text color)
  - **Content**: "Rate these notes chosen for you" + explanation text

### Post Display
- Uses existing `Post` component
- **Spacing**: `a.pb_xl` (32px bottom padding)
- Standard post styling with author, content, engagement metrics

### Rate Proposed Community Notes Section
- **Header**:
  - **Background**: Same as instruction prompt (`t.atoms.bg_contrast_25`)
  - **Padding**: `a.py_md, a.px_lg` (16px vertical, 24px horizontal)
  - **Icon**: Community Notes icon, primary blue color
  - **Text**: "Rate Proposed Community Notes", bold
  - **Layout**: `a.flex_row, a.align_center, a.justify_between`

### Note Display
- **Container**: 
  - **Background**: Theme background (`t.atoms.bg`)
  - **Border**: `a.border, t.atoms.border_contrast_low`
  - **Border radius**: `a.rounded_lg`
  - **Padding**: `a.p_md` (16px)
- **Note Text**:
  - **Typography**: `a.text_md, t.atoms.text` with `lineHeight: 20`
  - **Spacing**: `a.mb_sm` (8px bottom margin)

### Typography Scale
- **Headers**: `a.text_xl` (18px) or `a.text_lg` (16px)
- **Body text**: `a.text_md` (14px)
- **Small text**: `a.text_sm` (12px)
- **Line heights**: Typically 20px for body text
- **Font weights**: `a.font_bold` for emphasis, `a.font_heavy` for active states

### Color Scheme
- **Primary blue**: `t.palette.primary_500` (for icons, active states, buttons)
- **Text**: `t.atoms.text` (adapts to light/dark theme)
- **Muted text**: `t.atoms.text_contrast_medium`
- **Backgrounds**: `t.atoms.bg` (main), `t.atoms.bg_contrast_25` (highlighted sections)
- **Borders**: `t.atoms.border_contrast_low`

### Spacing System
- **Small**: `a.gap_sm` (8px), `a.p_sm` (8px), `a.m_sm` (8px)
- **Medium**: `a.gap_md` (16px), `a.p_md` (16px), `a.m_md` (16px)  
- **Large**: `a.gap_lg` (24px), `a.p_lg` (24px), `a.m_lg` (24px)
- **Extra Large**: `a.gap_xl` (32px), `a.p_xl` (32px), `a.m_xl` (32px)

## Component Architecture

### 1. Main Screen Component
```typescript
// src/screens/CommunityNotes/CommunityNotesScreen.tsx
```
- Uses `Layout.Screen` wrapper (like `RateNotesScreen`)
- Implements the three-column layout
- Manages tab state and data fetching
- Uses `Pager` component for tab content (like `Home.tsx`)

### 2. Sidebar Component
```typescript  
// src/components/CommunityNotes/CommunityNotesSidebar.tsx
```
- **Reuses**: `NavItem` component pattern from `DesktopLeftNav.tsx`
- **Navigation items**:
  - Notes (Community Notes icon)
  - Your profile (User Circle icon) 
  - About (Info icon)
- **Styling**: Matches existing sidebar patterns

### 3. Header with Tabs
```typescript
// src/components/CommunityNotes/CommunityNotesHeader.tsx  
```
- **Reuses**: `TabBar` component from `src/view/com/pager/TabBar.tsx`
- **Reuses**: `HomeHeaderLayout` pattern for mobile/desktop responsiveness
- **Tabs**: "Needs your help", "New", "Rated helpful"

### 4. Content Components
```typescript
// src/components/CommunityNotes/CommunityNotesContent.tsx
// src/components/CommunityNotes/PostWithNote.tsx
```
- **Reuses**: Existing `Post` component
- **Reuses**: `RateProposedNotesPrompt` styling patterns
- **New**: Instruction prompt component
- **Reuses**: `RateNoteForm` for note rating interface

## Data Management

### Initial Implementation (Phase 1)
For the initial implementation, we'll use the existing timeline API and filter for posts with the `proposed-label:needs-context` label:

```typescript
// Use existing useTimelineQuery and filter client-side
const timelineQuery = useTimelineQuery('following')
const postsWithProposedNotes = timelineQuery.data?.pages
  .flatMap(page => page.feed)
  .filter(item => hasProposedNotes(item.post))
```

### Future Implementation (Phase 2)
**API Endpoint** (to be implemented later):
```typescript
// Add to src/lib/api/community-notes.ts
export async function getPostsWithNotes(
  agent: BskyAgent,
  status: 'needs_your_help' | 'new' | 'rated_helpful',
  cursor?: string
): Promise<{posts: PostWithNotes[], cursor?: string}>
```

**Query Hook**:
```typescript
// Add to src/state/queries/community-notes.ts  
export function usePostsWithNotesQuery(status: string)
```

## Reusable Components

1. **`TabBar`** - For the "Needs your help" / "New" / "Rated helpful" tabs
2. **`Pager`** - For swipeable tab content (like Home screen)
3. **`NavItem`** - For sidebar navigation items
4. **`Post`** - For displaying posts
5. **`Layout.Screen`** - For screen wrapper
6. **`RateNoteForm`** - For note rating interface (already exists)
7. **`RateProposedNotesPrompt`** - For styling patterns

## File Structure
```
src/screens/CommunityNotes/
├── CommunityNotesScreen.tsx          # Main screen
├── index.ts                          # Exports

src/components/CommunityNotes/
├── CommunityNotesSidebar.tsx         # Left sidebar
├── CommunityNotesHeader.tsx          # Header with tabs  
├── CommunityNotesContent.tsx         # Tab content wrapper
├── PostWithNote.tsx                  # Post + note display
├── InstructionPrompt.tsx             # "Rate these notes..." prompt
└── [existing components...]          # RateNoteForm, etc.
```

## Navigation Integration

**Add route to `src/routes.ts`**:
```typescript
CommunityNotes: '/community-notes'
```

**Add to navigation** (`src/Navigation.tsx`):
```typescript
<Flat.Screen
  name="CommunityNotes"
  getComponent={() => CommunityNotesScreen}
/>
```

## Key Implementation Decisions

1. **Layout Strategy**: Use the same three-column layout as the main app
2. **Tab Implementation**: Reuse `Pager` + `TabBar` pattern from Home screen
3. **Sidebar**: Custom component but reuse `NavItem` styling patterns
4. **Data Flow**: Initially filter timeline, later add dedicated API endpoint
5. **Responsive Design**: Follow existing mobile/desktop patterns
6. **Theming**: Use existing design tokens and theme system

## Mobile Considerations

- **Sidebar**: Collapsible drawer (like main app)
- **Header**: Fixed header with tab bar
- **Content**: Scrollable with proper spacing
- **Navigation**: Bottom tab bar integration (if needed)

## Implementation Phases

### Phase 1: Basic Structure
1. Create main screen component
2. Implement sidebar navigation
3. Add tab header with basic content
4. Filter timeline for posts with proposed notes

### Phase 2: Enhanced Features
1. Implement dedicated API endpoint
2. Add infinite scroll and pagination
3. Enhance note display and rating interface
4. Add real-time updates

### Phase 3: Polish
1. Add loading states and error handling
2. Implement responsive design improvements
3. Add animations and micro-interactions
4. Performance optimizations

## API Requirements (Future)

### New API Endpoint Needed

```typescript
export interface PostWithNotes {
  post: AppBskyFeedDefs.PostView
  notes: CommunityNote[]
  status: 'needs_your_help' | 'new' | 'rated_helpful'
}

export interface GetPostsWithNotesResponse {
  posts: PostWithNotes[]
  cursor?: string
}
```

### Backend Requirements

The Community Notes service needs to implement:

```
GET /xrpc/com.example.communitynotes.getPostsWithNotes
Parameters:
- status: 'needs_your_help' | 'new' | 'rated_helpful'  
- cursor?: string
- limit?: number (default 25)

Response:
{
  posts: [
    {
      post: PostView,           // Full Bluesky post object
      notes: CommunityNote[],   // Associated notes
      status: string            // Why this post appears in this tab
    }
  ],
  cursor?: string
}
```

## Additional Decisions Needed

1. **Hydration Strategy**: Should posts be fully hydrated with engagement data?
2. **Note Ordering**: How should multiple notes per post be ordered?
3. **Filtering Logic**: What determines if a post appears in each tab?
4. **Rate Limiting**: How many posts to load per request?
5. **Real-time Updates**: Should we use WebSocket for live updates?

/**
 * Community Notes feed rkeys - these correspond to the feed generator rkeys
 */
export const CN_FEED_RKEYS = [
  'needs_your_help',
  'new',
  'rated_helpful',
] as const

/**
 * Type representing a Community Notes feed tab
 */
export type CommunityNotesFeedTab = (typeof CN_FEED_RKEYS)[number]

/**
 * Type representing any Community Notes tab (feeds or specific feed)
 */
export type CommunityNotesTab = CommunityNotesFeedTab | 'feeds'

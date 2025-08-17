import {type AppBskyFeedDefs, type ComAtprotoLabelDefs} from '@atproto/api'

// Community Notes label values
export const COMMUNITY_NOTES_LABELS = {
  NOTE: 'note',
  PROPOSED_NOTE: 'proposed-note',
} as const

export type CommunityNotesLabelValue =
  (typeof COMMUNITY_NOTES_LABELS)[keyof typeof COMMUNITY_NOTES_LABELS]

// Community Notes labeler DID (will be environment-specific)
export const COMMUNITY_NOTES_LABELER_DID = {
  PROD: 'did:web:community-notes.bsky.app',
  STAGING: 'did:web:community-notes.staging.bsky.dev',
  DEV: 'did:web:bluenotes.social',
} as const

/**
 * Check if a post has a specific Community Notes label
 */
export function hasLabel(
  post: AppBskyFeedDefs.PostView,
  labelValue: CommunityNotesLabelValue,
): boolean {
  if (!post.labels || post.labels.length === 0) {
    return false
  }

  return post.labels.some(
    (label: ComAtprotoLabelDefs.Label) =>
      label.val === labelValue && isCommunityNotesLabeler(label.src),
  )
}

/**
 * Check if a post has helpful Community Notes (note label)
 */
export function hasHelpfulNotes(post: AppBskyFeedDefs.PostView): boolean {
  return hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)
}

/**
 * Check if a post has proposed Community Notes that need rating (proposed-note label)
 */
export function hasProposedNotes(post: AppBskyFeedDefs.PostView): boolean {
  return hasLabel(post, COMMUNITY_NOTES_LABELS.PROPOSED_NOTE)
}

/**
 * Get all Community Notes labels for a post
 */
export function getCommunityNotesLabels(
  post: AppBskyFeedDefs.PostView,
): ComAtprotoLabelDefs.Label[] {
  if (!post.labels || post.labels.length === 0) {
    return []
  }

  return post.labels.filter(
    (label: ComAtprotoLabelDefs.Label) =>
      isCommunityNotesLabeler(label.src) &&
      Object.values(COMMUNITY_NOTES_LABELS).includes(
        label.val as CommunityNotesLabelValue,
      ),
  )
}

/**
 * Check if a labeler DID is a Community Notes labeler
 */
function isCommunityNotesLabeler(labelerDid: string): boolean {
  return Object.values(COMMUNITY_NOTES_LABELER_DID).includes(labelerDid as any)
}

/**
 * Get the current environment's Community Notes labeler DID
 */
export function getCommunityNotesLabelerDid(): string {
  // TODO: This should be determined by the current environment
  // For now, default to dev
  if (process.env.NODE_ENV === 'production') {
    return COMMUNITY_NOTES_LABELER_DID.PROD
  } else if (process.env.NODE_ENV === 'staging') {
    return COMMUNITY_NOTES_LABELER_DID.STAGING
  } else {
    return COMMUNITY_NOTES_LABELER_DID.DEV
  }
}

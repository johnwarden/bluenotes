import {type AppBskyFeedDefs, type ComAtprotoLabelDefs} from '@atproto/api'

// Community Notes label values
export const COMMUNITY_NOTES_LABELS = {
  NOTE: 'needs-context',
  PROPOSED_NOTE: 'proposed-label:needs-context',
} as const

export type CommunityNotesLabelValue =
  (typeof COMMUNITY_NOTES_LABELS)[keyof typeof COMMUNITY_NOTES_LABELS]

// Community Notes labeler DID (will be environment-specific)
export const COMMUNITY_NOTES_LABELER_DID = {
  PROD: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
  STAGING: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
  DEV: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
} as const

// Dynamic labeler DID management
let currentLabelerDid: string | null = null // null means no labeler configured

export function updateCommunityNotesLabelerDid(did: string | null) {
  currentLabelerDid = did
}

export function getCurrentCommunityNotesLabelerDid(): string | null {
  return currentLabelerDid
}

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
 * Check if a post has proposed Community Notes that need rating (proposed-label:needs-context label)
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
  const currentDid = getCurrentCommunityNotesLabelerDid()

  // If we have a dynamic labeler DID configured, use only that
  if (currentDid) {
    return labelerDid === currentDid
  }

  // If no dynamic labeler DID is configured, fallback to hardcoded values
  // This provides backward compatibility when the config endpoint is not available
  return Object.values(COMMUNITY_NOTES_LABELER_DID).includes(labelerDid as any)
}

/**
 * Get the current environment's Community Notes labeler DID
 * @deprecated Use getCurrentCommunityNotesLabelerDid() instead
 */
export function getCommunityNotesLabelerDid(): string | null {
  return getCurrentCommunityNotesLabelerDid()
}

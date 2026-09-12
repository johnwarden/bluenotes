import {
  COMMUNITY_NOTES_LABELER_DID,
  getCurrentCommunityNotesLabelerDid,
} from '#/lib/community-notes/labeler-did'
import {dangerousGetPostShadow} from '#/state/cache/post-shadow'
import {type app, type com} from '#/lexicons'

export {
  COMMUNITY_NOTES_LABELER_DID,
  getCommunityNotesLabelerDid,
  getCurrentCommunityNotesLabelerDid,
  isPinnedCommunityNotesLabelerDid,
  updateCommunityNotesLabelerDid,
} from '#/lib/community-notes/labeler-did'

/**
 * Notes service DID used as `com.atproto.server.getServiceAuth` aud.
 * Defined with the auth pin so `lib/api` does not import this module
 * (and its post-shadow dependency). Re-exported here next to the
 * labeler DID.
 */
export {COMMUNITY_NOTES_FEED_GENERATOR_DID} from '#/lib/api/community-notes-auth'

// Community Notes label values
export const COMMUNITY_NOTES_LABELS = {
  NOTE: 'annotation',
  PROPOSED_NOTE: 'proposed-annotation',
} as const

export type CommunityNotesLabelValue =
  (typeof COMMUNITY_NOTES_LABELS)[keyof typeof COMMUNITY_NOTES_LABELS]

/**
 * Check if a post has a specific Community Notes label
 */
export function hasLabel(
  post: app.bsky.feed.defs.PostView,
  labelValue: CommunityNotesLabelValue,
): boolean {
  if (!post.labels || post.labels.length === 0) {
    return false
  }

  return post.labels.some(
    (label: com.atproto.label.defs.Label) =>
      label.val === labelValue && isCommunityNotesLabeler(label.src),
  )
}

/**
 * Check if a post has helpful Community Notes (note label)
 */
export function hasHelpfulNotes(post: app.bsky.feed.defs.PostView): boolean {
  return hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)
}

/**
 * Check if a post has proposed Community Notes that need rating (proposed-annotation label)
 */
export function hasProposedNotes(post: app.bsky.feed.defs.PostView): boolean {
  // Check shadow cache first for optimistic state
  const shadow = dangerousGetPostShadow(post)
  if (shadow?.hasOptimisticProposedNote) {
    return true
  }

  // Fall back to actual labels
  return hasLabel(post, COMMUNITY_NOTES_LABELS.PROPOSED_NOTE)
}

/**
 * Get all Community Notes labels for a post
 */
export function getCommunityNotesLabels(
  post: app.bsky.feed.defs.PostView,
): com.atproto.label.defs.Label[] {
  if (!post.labels || post.labels.length === 0) {
    return []
  }

  return post.labels.filter(
    (label: com.atproto.label.defs.Label) =>
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
  return (Object.values(COMMUNITY_NOTES_LABELER_DID) as string[]).includes(
    labelerDid,
  )
}

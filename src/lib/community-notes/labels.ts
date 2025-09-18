import {type AppBskyFeedDefs, type ComAtprotoLabelDefs} from '@atproto/api'

import {dangerousGetPostShadow} from '#/state/cache/post-shadow'

// Community Notes label values
export const COMMUNITY_NOTES_LABELS = {
  NOTE: 'annotation',
  PROPOSED_NOTE: 'proposed-annotation',
} as const

export type CommunityNotesLabelValue =
  (typeof COMMUNITY_NOTES_LABELS)[keyof typeof COMMUNITY_NOTES_LABELS]

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

  const result = post.labels.some(
    (label: ComAtprotoLabelDefs.Label) =>
      label.val === labelValue && isCommunityNotesLabeler(label.src),
  )

  // Temporary debugging
  if (labelValue === COMMUNITY_NOTES_LABELS.PROPOSED_NOTE) {
    console.log('hasLabel check for PROPOSED_NOTE:', {
      postUri: post.uri,
      labelValue,
      labels: post.labels.map(l => ({val: l.val, src: l.src})),
      result,
    })
  }

  return result
}

/**
 * Check if a post has helpful Community Notes (note label)
 */
export function hasHelpfulNotes(post: AppBskyFeedDefs.PostView): boolean {
  return hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)
}

/**
 * Check if a post has proposed Community Notes that need rating (proposed-annotation label)
 */
export function hasProposedNotes(post: AppBskyFeedDefs.PostView): boolean {
  // Check shadow cache first for optimistic state
  const shadow = dangerousGetPostShadow(post)
  if (shadow?.hasOptimisticProposedNote) {
    return true
  }

  // Fall back to actual labels
  const hasActualLabel = hasLabel(post, COMMUNITY_NOTES_LABELS.PROPOSED_NOTE)

  // Temporary debugging for posts with actual labels
  if (hasActualLabel) {
    console.log(
      'Post has actual proposed note label:',
      post.uri,
      'returning true',
    )
  }

  return hasActualLabel
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
  } else {
    throw new Error("Coudln't get labeler did")
  }
}

/**
 * Get the current environment's Community Notes labeler DID
 * @deprecated Use getCurrentCommunityNotesLabelerDid() instead
 */
export function getCommunityNotesLabelerDid(): string | null {
  return getCurrentCommunityNotesLabelerDid()
}

// Community Notes labeler DID (will be environment-specific)
export const COMMUNITY_NOTES_LABELER_DID = {
  PROD: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
  STAGING: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
  DEV: 'did:plc:57fl6zy4wmpuknwpgtjqkvlz',
} as const

const PINNED_COMMUNITY_NOTES_LABELER_DIDS: readonly string[] = Object.values(
  COMMUNITY_NOTES_LABELER_DID,
)

/**
 * True when `did` has a `did:` prefix and equals a pinned
 * `COMMUNITY_NOTES_LABELER_DID` value.
 */
export function isPinnedCommunityNotesLabelerDid(did: string): boolean {
  return (
    did.startsWith('did:') && PINNED_COMMUNITY_NOTES_LABELER_DIDS.includes(did)
  )
}

/*
 * Seed the pinned DID so the first appview read (home timeline / Discover)
 * already sends `atproto-accept-labelers`. Waiting for getConfig + a later
 * useEffect left the first PostFeed query (staleTime: Infinity) without CN
 * labels, so home cards never mounted CommunityNoteWidget.
 */
let currentLabelerDid: string | null = COMMUNITY_NOTES_LABELER_DID.PROD

export function updateCommunityNotesLabelerDid(did: string | null) {
  currentLabelerDid = did
}

export function getCurrentCommunityNotesLabelerDid(): string | null {
  return currentLabelerDid
}

/**
 * Get the current environment's Community Notes labeler DID
 * @deprecated Use getCurrentCommunityNotesLabelerDid() instead
 */
export function getCommunityNotesLabelerDid(): string | null {
  return getCurrentCommunityNotesLabelerDid()
}

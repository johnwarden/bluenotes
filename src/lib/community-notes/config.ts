import {
  isPinnedCommunityNotesLabelerDid,
  updateCommunityNotesLabelerDid,
} from '#/lib/community-notes/labeler-did'

export interface CommunityNotesConfig {
  version: string
  labelerDid: string
  feedGeneratorDid: string
  feeds?: {
    uri: string
  }[]
}

/**
 * Thrown when unauthenticated `getConfig.labelerDid` is not a DID or is
 * not on the pinned Community Notes labeler allowlist.
 */
export class CommunityNotesLabelerDidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommunityNotesLabelerDidError'
  }
}

export function isCommunityNotesLabelerDidError(
  error: unknown,
): error is CommunityNotesLabelerDidError {
  return error instanceof CommunityNotesLabelerDidError
}

/**
 * Parse unauthenticated `org.opencommunitynotes.getConfig` JSON.
 * `labelerDid` must start with `did:` and match the pinned allowlist.
 */
export function parseCommunityNotesConfig(
  input: unknown,
): CommunityNotesConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid Community Notes config response')
  }
  const rec = input as Record<string, unknown>
  const {version, labelerDid, feedGeneratorDid, feeds} = rec
  if (
    typeof version !== 'string' ||
    typeof labelerDid !== 'string' ||
    typeof feedGeneratorDid !== 'string'
  ) {
    throw new Error('Invalid Community Notes config response')
  }
  if (!labelerDid.startsWith('did:')) {
    throw new CommunityNotesLabelerDidError('getConfig.labelerDid is not a DID')
  }
  if (!isPinnedCommunityNotesLabelerDid(labelerDid)) {
    throw new CommunityNotesLabelerDidError(
      'getConfig.labelerDid is not the pinned Community Notes labeler',
    )
  }

  return {
    version,
    labelerDid,
    feedGeneratorDid,
    ...(Array.isArray(feeds)
      ? {feeds: feeds as CommunityNotesConfig['feeds']}
      : {}),
  }
}

/**
 * Install a getConfig labeler DID only when it is pinned. Returns whether
 * `updateCommunityNotesLabelerDid` ran. Callers must not update on `false`.
 */
export function applyCommunityNotesLabelerDidFromConfig(did: string): boolean {
  if (!did.startsWith('did:') || !isPinnedCommunityNotesLabelerDid(did)) {
    return false
  }
  updateCommunityNotesLabelerDid(did)
  return true
}

/**
 * Retry policy for `useCommunityNotesConfig`. Pin/DID rejects and missing
 * endpoints are terminal; other failures retry up to three times.
 */
export function shouldRetryCommunityNotesConfig(
  failureCount: number,
  error: unknown,
): boolean {
  if (isCommunityNotesLabelerDidError(error)) {
    return false
  }
  const message = error instanceof Error ? error.message : ''
  if (message.includes('404') || message.includes('501')) {
    return false
  }
  return failureCount < 3
}

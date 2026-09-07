import {type CommunityNote} from '#/lib/community-notes/types'
import {COMMUNITY_NOTES_SERVICE, DEFAULT_SERVICE} from '#/lib/constants'
import {type NoteRatingState} from '#/state/cache/community-notes-shadow'

/**
 * Session bits CN XRPC calls need after 1.133 removed BskyAgent / useAgent.
 * `accessJwt` is required for write/vote; getProposals works without it.
 */
export type CommunityNotesAuth = {
  service: string
  accessJwt?: string
}

function serviceUrlOf(auth: CommunityNotesAuth | null | undefined) {
  return auth?.service ?? DEFAULT_SERVICE
}

function messageFromUnknownJson(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const rec = data as {message?: unknown; error?: unknown}
    if (typeof rec.message === 'string' && rec.message) return rec.message
    if (typeof rec.error === 'string' && rec.error) return rec.error
  }
  return fallback
}

function stringifyUnknown(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

type VoteValue = 'helpful' | 'somewhat_helpful' | 'not_helpful'

function mapVoteValue(value: VoteValue): 1 | 0 | -1 {
  switch (value) {
    case 'helpful':
      return 1
    case 'somewhat_helpful':
      return 0
    case 'not_helpful':
      return -1
  }
}

function mapApiVoteValue(val: 1 | 0 | -1): VoteValue {
  switch (val) {
    case 1:
      return 'helpful'
    case 0:
      return 'somewhat_helpful'
    case -1:
      return 'not_helpful'
  }
}

// API Response Types
export interface CommunityNoteAPIResponse {
  uri: string
  cid: string
  typ: 'label'
  targetUri: string
  val: string
  reasons?: string[]
  note?: string
  cts: string
  status: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
  author: {
    aid: string
    pseudonym: string
    writingImpact?: number
    ratingImpact?: number
    profileUrl?: string
  }
  // Viewer rating data structure - nested as per official schema
  viewer?: {
    rating: {
      uri: string
      val: 1 | 0 | -1
      reasons: string[]
      createdAt: string
      updatedAt: string
    }
  }
}

export interface GetProposalsAPIResponse {
  proposals: CommunityNoteAPIResponse[]
}

export interface RateProposalResponse {
  success: boolean
  rating: {
    uri: string
    targetUri: string
    cts: string
    val: 1 | 0 | -1
    reasons: string[]
  }
}

export interface CreateProposalRequest {
  typ: 'label'
  uri: string // target post URI
  val: 'annotation'
  note: string
  reasons: string[]
}

export interface CreateProposalResponse {
  uri: string
  cid: string
  proposal: CommunityNoteAPIResponse
}

// Mapping function
export function mapProposalApiResponseToCommunityNote(
  apiNote: CommunityNoteAPIResponse,
): CommunityNote {
  return {
    $type: 'social.pmsky.proposal',
    typ: 'label',
    subject: {
      uri: apiNote.targetUri,
      cid: apiNote.cid,
    },
    label: apiNote.val,
    text: apiNote.note || `Context note for ${apiNote.val}`, // Fallback text if note not provided
    createdAt: apiNote.cts,
    noteId: apiNote.uri.split('/').pop() || apiNote.uri,
    status: apiNote.status,
    uri: apiNote.uri,
    author: {
      aid: apiNote.author.aid,
      pseudonym: apiNote.author.pseudonym,
      writingImpact: apiNote.author.writingImpact || 0,
      ratingImpact: apiNote.author.ratingImpact || 0,
      profileUrl: apiNote.author.profileUrl || '#',
    },
  }
}

export function mapApiRatingToNoteRatingState(
  viewerRating?: NonNullable<CommunityNoteAPIResponse['viewer']>['rating'],
): NoteRatingState | undefined {
  if (!viewerRating) return undefined

  return {
    uri: viewerRating.uri, // Now we have the actual rating URI
    val: mapApiVoteValue(viewerRating.val),
    reasons: viewerRating.reasons, // Now we have the actual reasons
  }
}

export async function vote(
  auth: CommunityNotesAuth,
  noteUri: string,
  value: VoteValue,
  reasons: string[],
): Promise<RateProposalResponse> {
  if (!auth.accessJwt) {
    throw new Error('Must be logged in to rate a note')
  }

  // Note: Anonymous ID (AID) is generated server-side by the Community Notes service
  // based on the authenticated user's DID. The service uses: 'org.opencommunitynotes:' + sha256(did)

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrlOf(auth))
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.vote`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uri: noteUri,
        val: mapVoteValue(value),
        reasons: reasons,
      }),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData: unknown = await response.json()
        errorMessage = messageFromUnknownJson(errorData, errorMessage)
      } catch {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }

      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.')
      } else if (response.status === 403) {
        throw new Error('You do not have permission to rate this note.')
      } else if (response.status === 404) {
        throw new Error('Note not found.')
      }

      throw new Error(`Failed to rate note: ${errorMessage}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(
      `Network error while rating note: ${stringifyUnknown(error)}`,
    )
  }
}

export async function propose(
  auth: CommunityNotesAuth,
  targetUri: string,
  noteText: string,
  reasons: string[],
): Promise<CreateProposalResponse> {
  if (!auth.accessJwt) {
    throw new Error('Must be logged in to create a note')
  }

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrlOf(auth))
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.propose`

  const requestBody: CreateProposalRequest = {
    typ: 'label',
    uri: targetUri,
    val: 'annotation',
    note: noteText,
    reasons: reasons,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData: unknown = await response.json()
        if (
          errorData &&
          typeof errorData === 'object' &&
          'error' in errorData &&
          errorData.error === 'DuplicateProposal'
        ) {
          throw new Error('You have already created a note for this post')
        }
        errorMessage = messageFromUnknownJson(errorData, errorMessage)
      } catch (parseError) {
        if (
          parseError instanceof Error &&
          parseError.message.includes('already created')
        ) {
          throw parseError // Re-throw our custom duplicate note error
        }
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }

      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.')
      } else if (response.status === 403) {
        throw new Error('You do not have permission to create notes.')
      }

      throw new Error(`Failed to create note: ${errorMessage}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(
      `Network error while creating note: ${stringifyUnknown(error)}`,
    )
  }
}

export async function getProposals(
  auth: CommunityNotesAuth | null,
  subjectUris: string | string[],
  options?: {
    status?: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
  },
): Promise<GetProposalsAPIResponse> {
  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrlOf(auth))

  // Handle both single URI and multiple URIs
  const uris = Array.isArray(subjectUris) ? subjectUris : [subjectUris]
  const uriParams = uris.map(uri => `uris=${encodeURIComponent(uri)}`).join('&')

  // Add optional filtering parameters
  const filterParams = []
  if (options?.status) {
    filterParams.push(`status=${encodeURIComponent(options.status)}`)
  }

  const allParams = [uriParams, ...filterParams].join('&')
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getProposals?${allParams}`

  const headers: Record<string, string> = {}
  if (auth?.accessJwt) {
    headers.Authorization = `Bearer ${auth.accessJwt}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData: unknown = await response.json()
        errorMessage = messageFromUnknownJson(errorData, errorMessage)
      } catch {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }

      if (response.status === 404) {
        // Return empty proposals array for 404s instead of throwing
        return {proposals: []}
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.')
      }

      throw new Error(`Failed to get proposals: ${errorMessage}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(
      `Network error while fetching proposals: ${stringifyUnknown(error)}`,
    )
  }
}

// Legacy functions for backward compatibility - these will be removed
export async function createNoteRating(
  auth: CommunityNotesAuth,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  // Map to new API
  const result = await vote(auth, note.uri, value, reasons)
  return {
    uri: result.rating.uri,
  }
}

export async function updateNoteRating(
  auth: CommunityNotesAuth,
  ratingUri: string,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  // For updates, we still call vote with the note URI
  const result = await vote(auth, note.uri, value, reasons)
  return result
}

export async function deleteNoteRating(
  auth: CommunityNotesAuth,
  noteUri: string,
) {
  if (!auth.accessJwt) {
    throw new Error('Must be logged in to delete a rating')
  }

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrlOf(auth))
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.vote`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uri: noteUri,
        delete: true, // Use delete flag instead of empty val
      }),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData: unknown = await response.json()
        errorMessage = messageFromUnknownJson(errorData, errorMessage)
      } catch {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      }

      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.')
      } else if (response.status === 404) {
        // If the rating doesn't exist, that's fine for deletion
        return {success: true, deleted: true}
      }

      throw new Error(`Failed to delete rating: ${errorMessage}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(
      `Network error while deleting rating: ${stringifyUnknown(error)}`,
    )
  }
}

// Backward compatibility exports
export const createProposal = propose
export const rateProposal = vote

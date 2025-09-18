import {type BskyAgent} from '@atproto/api'

import {COMMUNITY_NOTES_SERVICE} from '#/lib/constants'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {type NoteRatingState} from '#/state/cache/community-notes-shadow'

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

export async function rateProposal(
  agent: BskyAgent,
  noteUri: string,
  value: VoteValue,
  reasons: string[],
): Promise<RateProposalResponse> {
  if (!agent.session) {
    throw new Error('Must be logged in to rate a note')
  }

  // Note: Anonymous ID (AID) is generated server-side by the Community Notes service
  // based on the authenticated user's DID. The service uses: 'org.opencommunitynotes:' + sha256(did)

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(
    agent.service.toString(),
  )
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.rateProposal`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agent.session.accessJwt}`,
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
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
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
    throw new Error(`Network error while rating note: ${error}`)
  }
}

export async function createProposal(
  agent: BskyAgent,
  targetUri: string,
  noteText: string,
  reasons: string[],
): Promise<CreateProposalResponse> {
  if (!agent.session) {
    throw new Error('Must be logged in to create a note')
  }

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(
    agent.service.toString(),
  )
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.createProposal`

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
        Authorization: `Bearer ${agent.session.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.error === 'DuplicateProposal') {
          throw new Error('You have already created a note for this post')
        }
        errorMessage = errorData.message || errorData.error || errorMessage
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
    throw new Error(`Network error while creating note: ${error}`)
  }
}

export async function getProposals(
  agent: BskyAgent | null,
  subjectUris: string | string[],
  options?: {
    status?: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
    label?: string
  },
): Promise<GetProposalsAPIResponse> {
  // Use the agent's service URL if available, otherwise default to bsky.social
  const serviceUrl = agent ? agent.service.toString() : 'https://bsky.social'
  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrl)

  // Handle both single URI and multiple URIs
  const uris = Array.isArray(subjectUris) ? subjectUris : [subjectUris]
  const uriParams = uris.map(uri => `uris=${encodeURIComponent(uri)}`).join('&')

  // Add optional filtering parameters
  const filterParams = []
  if (options?.status) {
    filterParams.push(`status=${encodeURIComponent(options.status)}`)
  }
  if (options?.label) {
    filterParams.push(`label=${encodeURIComponent(options.label)}`)
  }

  const allParams = [uriParams, ...filterParams].join('&')
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getProposals?${allParams}`

  const headers: Record<string, string> = {}
  if (agent?.session) {
    headers.Authorization = `Bearer ${agent.session.accessJwt}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
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
    throw new Error(`Network error while fetching proposals: ${error}`)
  }
}

// Legacy functions for backward compatibility - these will be removed
export async function createNoteRating(
  agent: BskyAgent,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  // Map to new API
  const result = await rateProposal(agent, note.uri, value, reasons)
  return {
    uri: result.rating.uri,
  }
}

export async function updateNoteRating(
  agent: BskyAgent,
  ratingUri: string,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  // For updates, we still call rateProposal with the note URI
  const result = await rateProposal(agent, note.uri, value, reasons)
  return result
}

export async function deleteNoteRating(agent: BskyAgent, noteUri: string) {
  if (!agent.session) {
    throw new Error('Must be logged in to delete a rating')
  }

  const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(
    agent.service.toString(),
  )
  const url = `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.rateProposal`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agent.session.accessJwt}`,
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
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
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
    throw new Error(`Network error while deleting rating: ${error}`)
  }
}

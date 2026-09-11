import {createContext, useContext} from 'react'
import {type QueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/community-notes'
import {type CommunityNote} from '#/lib/community-notes/types'

export const COMMUNITY_NOTES_PROPOSALS_QUERY_ROOT = 'community-notes-proposals'

export type CommunityNotesProposalStatus =
  | 'needs_more_ratings'
  | 'rated_helpful'
  | 'rated_not_helpful'

export type CommunityNotesFeedMode = 'rated_helpful' | 'needs_more_ratings'

type ViewerRatingRow = {
  noteUri: string
  viewerRating:
    | NonNullable<apilib.CommunityNoteAPIResponse['viewer']>['rating']
    | undefined
}

type NotesWithViewerRatings = CommunityNote[] & {
  _viewerRatings?: ViewerRatingRow[]
}

const EMPTY_FALLBACK_URIS: ReadonlySet<string> = new Set()

/**
 * URIs whose batch getProposals never populated the per-post cache.
 * Consumers re-enable per-post fetch for these so labeled posts still
 * load note.text instead of chrome-only ("See all notes").
 */
export const CommunityNotesBatchFallbackUrisContext =
  createContext<ReadonlySet<string>>(EMPTY_FALLBACK_URIS)

export function communityNotesProposalsQueryKey(
  subjectUri: string,
  status?: CommunityNotesProposalStatus,
) {
  return [COMMUNITY_NOTES_PROPOSALS_QUERY_ROOT, subjectUri, status] as const
}

/**
 * Per-post getProposals is the source of truth on regular feeds, and the
 * fallback on CN feeds when batch prefetch fails for that post.
 */
export function shouldEnablePerPostProposalsQuery({
  subjectUri,
  noteStatus,
  communityNotesFeedMode,
  batchPrefetchFailedForUri,
}: {
  subjectUri: string
  noteStatus?: CommunityNotesProposalStatus
  communityNotesFeedMode?: CommunityNotesFeedMode
  batchPrefetchFailedForUri: boolean
}): boolean {
  if (!subjectUri || noteStatus === undefined) {
    return false
  }
  if (!communityNotesFeedMode) {
    return true
  }
  return batchPrefetchFailedForUri
}

/**
 * Widgets on CN feeds skip their own fetch while batch prefetch is the
 * source of truth. After a batch miss/failure for that URI, fetch again.
 */
export function shouldDisableWidgetProposalsFetch({
  communityNotesFeedMode,
  batchPrefetchFailedForUri,
}: {
  communityNotesFeedMode?: CommunityNotesFeedMode
  batchPrefetchFailedForUri: boolean
}): boolean {
  return !!communityNotesFeedMode && !batchPrefetchFailedForUri
}

export function collectUrisMissingProposalsCache({
  queryClient,
  subjectUris,
  status,
}: {
  queryClient: QueryClient
  subjectUris: readonly string[]
  status: CommunityNotesProposalStatus
}): string[] {
  return subjectUris.filter(
    uri =>
      queryClient.getQueryData(communityNotesProposalsQueryKey(uri, status)) ===
      undefined,
  )
}

export function cacheGetProposalsBatch({
  queryClient,
  subjectUris,
  status,
  proposals,
}: {
  queryClient: QueryClient
  subjectUris: readonly string[]
  status: CommunityNotesProposalStatus
  proposals: readonly apilib.CommunityNoteAPIResponse[]
}): void {
  const byTarget = new Map<string, CommunityNote[]>()
  const ratingByNoteUri = new Map<
    string,
    NonNullable<apilib.CommunityNoteAPIResponse['viewer']>['rating'] | undefined
  >()

  for (const apiNote of proposals) {
    const mapped = apilib.mapProposalApiResponseToCommunityNote(apiNote)
    const list = byTarget.get(apiNote.targetUri) ?? []
    list.push(mapped)
    byTarget.set(apiNote.targetUri, list)
    ratingByNoteUri.set(apiNote.uri, apiNote.viewer?.rating)
  }

  for (const uri of subjectUris) {
    const notes = (byTarget.get(uri) ?? []) as NotesWithViewerRatings
    notes._viewerRatings = notes.map(n => ({
      noteUri: n.uri,
      viewerRating: ratingByNoteUri.get(n.uri),
    }))
    queryClient.setQueryData(
      communityNotesProposalsQueryKey(uri, status),
      notes,
    )
  }
}

export function useCommunityNotesBatchFallbackForUri(uri: string): boolean {
  return useContext(CommunityNotesBatchFallbackUrisContext).has(uri)
}

export function mergeFallbackUris(
  prev: ReadonlySet<string>,
  uris: readonly string[],
): ReadonlySet<string> {
  if (uris.length === 0) {
    return prev
  }
  const next = new Set(prev)
  let changed = false
  for (const uri of uris) {
    if (!next.has(uri)) {
      next.add(uri)
      changed = true
    }
  }
  return changed ? next : prev
}

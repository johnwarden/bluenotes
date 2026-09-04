import {useCallback, useEffect} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/community-notes'
import {type CommunityNote} from '#/lib/community-notes/types'
import {useComplexMutationQueue} from '#/lib/hooks/useComplexMutationQueue'
import {
  type NoteRatingState,
  updateNoteShadow,
  useNoteShadow,
} from '#/state/cache/community-notes-shadow'
import {useSession} from '#/state/session'

export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: NoteRatingState
  }
}

// Hook for fetching Community Notes proposals with optional status filtering
export function useProposalsQuery(
  subjectUri: string,
  status?: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful',
  options?: {enabled?: boolean},
) {
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const auth = apilib.communityNotesAuthFromAccount(currentAccount)

  const query = useQuery<CommunityNote[]>({
    queryKey: ['community-notes-proposals', subjectUri, status],
    queryFn: async () => {
      const response = await apilib.getProposals(auth, subjectUri, {
        status,
      })

      // Map the response to notes
      const notes = response.proposals.map(apiNote => {
        return apilib.mapProposalApiResponseToCommunityNote(apiNote)
      })

      // Store the rating data for later processing
      const viewerRatings = response.proposals.map(apiNote => ({
        noteUri: apiNote.uri,
        viewerRating: apiNote.viewer?.rating,
      }))

      ;(notes as any)._viewerRatings = viewerRatings

      return notes
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!subjectUri,
  })

  // Update shadow cache after the query has succeeded and cache is populated
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const viewerRatings = (query.data as any)._viewerRatings
      if (viewerRatings) {
        for (const ratingData of viewerRatings) {
          if (ratingData.viewerRating) {
            const ratingState = apilib.mapApiRatingToNoteRatingState(
              ratingData.viewerRating,
            )

            if (ratingState) {
              // Populate shadow cache from server response
              updateNoteShadow(ratingData.noteUri, {
                rating: ratingState,
              })
            }
          } else {
          }
        }
      }
    }
  }, [query.isSuccess, query.data, queryClient])

  return query
}

export function useNoteRatingMutationQueue(
  note: CommunityNote,
  _logContext?: string,
) {
  const {currentAccount} = useSession()
  const auth = apilib.communityNotesAuthFromAccount(currentAccount)
  const noteUri = note.uri
  const noteWithShadow = useNoteShadow(note)

  // Get the initial state from the shadow cache or default to null
  const initialState: NoteRatingState = noteWithShadow.viewer?.rating || {
    uri: undefined,
    val: null,
    reasons: [],
  }

  const queueRating = useComplexMutationQueue<NoteRatingState>({
    initialState,
    runMutation: async (
      prevState: NoteRatingState,
      nextState: NoteRatingState,
    ) => {
      if (prevState.val === null && nextState.val !== null) {
        // Case 1: Create

        const response = await apilib.vote(
          auth!,
          noteUri,
          nextState.val,
          nextState.reasons,
        )
        return {
          ...nextState,
          uri: response.rating.uri,
        }
      } else if (prevState.val !== null && nextState.val !== null) {
        // Check if the rating actually changed
        const valChanged = prevState.val !== nextState.val
        const reasonsChanged =
          JSON.stringify(prevState.reasons.sort()) !==
          JSON.stringify(nextState.reasons.sort())

        if (valChanged || reasonsChanged) {
          // Case 2: Update

          const response = await apilib.vote(
            auth!,
            noteUri,
            nextState.val,
            nextState.reasons,
          )
          return {
            ...nextState,
            uri: response.rating.uri,
          }
        } else {
          // No actual change - skip API call

          return prevState // Return prevState to preserve URI
        }
      } else if (prevState.val !== null && nextState.val === null) {
        // Case 3: Delete

        await apilib.deleteNoteRating(auth!, noteUri)
        return {
          ...nextState,
          uri: undefined,
        }
      }
      // No change needed

      return nextState
    },
    onSuccess(finalState) {
      // Finalize the shadow state
      updateNoteShadow(noteUri, {
        rating: finalState,
      })
    },
  })

  const queueRatingWrap = useCallback(
    (newState: NoteRatingState) => {
      console.log('🔍 Debug: queueRatingWrap called', {
        noteUri,
        newState,
      })
      return queueRating(newState)
    },
    [queueRating, noteUri],
  )

  return queueRatingWrap
}

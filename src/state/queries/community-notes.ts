import {useCallback, useEffect} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/community-notes'
import {useComplexMutationQueue} from '#/lib/hooks/useComplexMutationQueue'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {
  type NoteRatingState,
  updateNoteShadow,
  useNoteShadow,
} from '#/state/cache/community-notes-shadow'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'community-notes'
export const RQKEY = (subjectUri: string) => [RQKEY_ROOT, subjectUri]

export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: NoteRatingState
  }
}

// Hook for fetching approved/helpful notes (for display under posts)
export function useNotesQuery(subjectUri: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  const query = useQuery<CommunityNote[]>({
    queryKey: RQKEY(subjectUri),
    queryFn: async () => {
      try {
        const response = await apilib.getProposalsForSubjects(
          agent,
          subjectUri,
          {
            status: 'rated_helpful', // CRITICAL: Explicit filtering for approved notes only
          },
        )

        // Just map the response to notes first, don't update shadow cache yet
        const notes = response.proposals.map(apiNote => {
          return apilib.mapHelpfulNoteApiResponseToCommunityNote(apiNote)
        })

        // Helpful notes don't have viewer ratings
        return notes
      } catch (error) {
        console.error('Failed to fetch notes:', error)
        // Fallback to empty array for now
        // TODO: Implement proper error handling
        return []
      }
    },
    enabled: !!subjectUri,
  })

  // Update shadow cache after the query has succeeded and cache is populated
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const viewerRatings = (query.data as any)._viewerRatings
      if (viewerRatings) {
        console.log('🔍 Debug: Processing viewer ratings after cache update')
        console.log('🔍 Debug: Viewer ratings from cache', viewerRatings)
        for (const ratingData of viewerRatings) {
          console.log('🔍 Debug: Checking rating data', ratingData)
          if (ratingData.viewerRating) {
            console.log('🔍 Debug: Found viewer rating data', ratingData)
            const ratingState = apilib.mapApiRatingToNoteRatingState(
              ratingData.viewerRating,
            )
            console.log('🔍 Debug: Mapped rating state', ratingState)
            if (ratingState) {
              updateNoteShadow(queryClient, ratingData.noteUri, {
                rating: ratingState,
              })
              console.log(
                '🔍 Debug: Updated shadow cache for note',
                ratingData.noteUri,
              )
            }
          } else {
            console.log('🔍 Debug: No viewer rating for note', {
              noteUri: ratingData.noteUri,
              hasViewerRating: !!ratingData.viewerRating,
            })
          }
        }
      }
    }
  }, [query.isSuccess, query.data, queryClient])

  return query
}

// Hook for fetching proposed notes that need ratings (for RateNotesScreen)
export function useProposalsQuery(subjectUri: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  const query = useQuery<CommunityNote[]>({
    queryKey: ['community-notes-proposals', subjectUri],
    queryFn: async () => {
      try {
        const response = await apilib.getProposalsForSubject(agent, subjectUri)

        // Map the response to notes
        const notes = response.proposals.map(apiNote => {
          console.log('🔍 Debug: Processing API proposal', {
            uri: apiNote.uri,
            hasViewer: !!apiNote.viewer,
            viewerRating: apiNote.viewer?.rating,
          })
          return apilib.mapProposalApiResponseToCommunityNote(apiNote)
        })

        // Store the rating data for later processing
        const viewerRatings = response.proposals.map(apiNote => ({
          noteUri: apiNote.uri,
          viewerRating: apiNote.viewer?.rating,
        }))
        console.log('🔍 Debug: Proposal viewer ratings to store', viewerRatings)
        ;(notes as any)._viewerRatings = viewerRatings

        return notes
      } catch (error) {
        console.error('Failed to fetch proposals:', error)
        // Fallback to empty array for now
        // TODO: Implement proper error handling
        return []
      }
    },
    enabled: !!subjectUri,
  })

  // Update shadow cache after the query has succeeded and cache is populated
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const viewerRatings = (query.data as any)._viewerRatings
      if (viewerRatings) {
        console.log('🔍 Debug: Processing viewer ratings after cache update')
        console.log('🔍 Debug: Viewer ratings from cache', viewerRatings)
        for (const ratingData of viewerRatings) {
          console.log('🔍 Debug: Checking rating data', ratingData)
          if (ratingData.viewerRating) {
            console.log('🔍 Debug: Found viewer rating data', ratingData)
            const ratingState = apilib.mapApiRatingToNoteRatingState(
              ratingData.viewerRating,
            )
            console.log('🔍 Debug: Mapped rating state', ratingState)
            if (ratingState) {
              updateNoteShadow(queryClient, ratingData.noteUri, {
                rating: ratingState,
              })
              console.log(
                '🔍 Debug: Updated shadow cache for note',
                ratingData.noteUri,
              )
            }
          } else {
            console.log('🔍 Debug: No viewer rating for note', {
              noteUri: ratingData.noteUri,
              hasViewerRating: !!ratingData.viewerRating,
            })
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
  const queryClient = useQueryClient()
  const agent = useAgent()
  const noteUri = note.uri
  const noteWithShadow = useNoteShadow(note)

  // Get the initial state from the shadow cache or default to null
  const initialState: NoteRatingState = noteWithShadow.viewer?.rating || {
    uri: undefined,
    val: null,
    reasons: [],
  }

  console.log('🔍 Debug: Mutation queue initialState', {
    noteUri,
    initialState,
  })

  const queueRating = useComplexMutationQueue<NoteRatingState>({
    initialState,
    runMutation: async (
      prevState: NoteRatingState,
      nextState: NoteRatingState,
    ) => {
      console.log('🔍 Debug: runMutation called', {
        noteUri,
        prevState,
        nextState,
      })

      if (prevState.val === null && nextState.val !== null) {
        // Case 1: Create
        console.log('🔍 Debug: Mutation case 1 - CREATE')
        const response = await apilib.rateProposal(
          agent,
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
          console.log('🔍 Debug: Mutation case 2 - UPDATE', {
            valChanged,
            reasonsChanged,
            prevVal: prevState.val,
            nextVal: nextState.val,
            prevReasons: prevState.reasons,
            nextReasons: nextState.reasons,
          })
          const response = await apilib.rateProposal(
            agent,
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
          console.log('🔍 Debug: Mutation case - NO CHANGE (same rating)')
          return prevState // Return prevState to preserve URI
        }
      } else if (prevState.val !== null && nextState.val === null) {
        // Case 3: Delete
        console.log('🔍 Debug: Mutation case 3 - DELETE')
        await apilib.deleteNoteRating(agent, noteUri)
        return {
          ...nextState,
          uri: undefined,
        }
      }
      // No change needed
      console.log('🔍 Debug: Mutation case - NO CHANGE (both null)')
      return nextState
    },
    onSuccess(finalState) {
      // Finalize the shadow state
      updateNoteShadow(queryClient, noteUri, {
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

// Legacy hooks for backward compatibility - these will be removed later
export function useCreateNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return {
    mutateAsync: async ({
      note,
      value,
      reasons,
    }: {
      note: {uri: string; cid?: string}
      value: 'helpful' | 'somewhat_helpful' | 'not_helpful'
      reasons: string[]
    }) => {
      const response = await apilib.createNoteRating(
        agent,
        note,
        value,
        reasons,
      )
      queryClient.invalidateQueries({
        queryKey: RQKEY(note.uri),
      })
      return response
    },
  }
}

export function useUpdateNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return {
    mutateAsync: async ({
      ratingUri,
      note,
      value,
      reasons,
    }: {
      ratingUri: string
      note: {uri: string; cid?: string}
      value: 'helpful' | 'somewhat_helpful' | 'not_helpful'
      reasons: string[]
    }) => {
      const response = await apilib.updateNoteRating(
        agent,
        ratingUri,
        note,
        value,
        reasons,
      )
      queryClient.invalidateQueries({
        queryKey: RQKEY(note.uri),
      })
      return response
    },
  }
}

export function useDeleteNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return {
    mutateAsync: async ({
      ratingUri,
      noteUri,
    }: {
      ratingUri: string
      noteUri: string
    }) => {
      await apilib.deleteNoteRating(agent, ratingUri)
      queryClient.invalidateQueries({
        queryKey: RQKEY(noteUri),
      })
    },
  }
}

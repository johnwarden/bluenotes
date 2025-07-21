import {useCallback} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/community-notes'
import {useComplexMutationQueue} from '#/lib/hooks/useComplexMutationQueue'
import {type CommunityNote, fetchNotes} from '#/lib/mock-data/community-notes'
import {
  type NoteRatingState,
  updateNoteShadow,
} from '#/state/cache/community-notes-shadow'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'community-notes'
export const RQKEY = (subjectUri: string) => [RQKEY_ROOT, subjectUri]

export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: NoteRatingState
  }
}

export function useNotesQuery(subjectUri: string) {
  return useQuery<CommunityNote[]>({
    queryKey: RQKEY(subjectUri),
    queryFn: async () => {
      // Currently using mock data
      // TODO: Replace with real AppView API call when available
      return await fetchNotes(subjectUri)
    },
    enabled: !!subjectUri,
  })
}

export function useNoteRatingMutationQueue(
  note: CommunityNote,
  _logContext?: string,
) {
  const queryClient = useQueryClient()
  const agent = useAgent()
  const noteUri = note.uri

  // Get the initial state from the shadow cache or default to null
  const initialState: NoteRatingState = {
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
        const response = await apilib.createNoteRating(
          agent,
          {uri: noteUri, cid: note.subject.cid},
          nextState.val,
          nextState.reasons,
        )
        return {
          ...nextState,
          uri: response.uri,
        }
      } else if (prevState.val !== null && nextState.val !== null) {
        // Case 2: Update
        if (!prevState.uri) {
          throw new Error('Cannot update rating without URI')
        }
        await apilib.updateNoteRating(
          agent,
          prevState.uri,
          {uri: noteUri, cid: note.subject.cid},
          nextState.val,
          nextState.reasons,
        )
        return {
          ...nextState,
          uri: prevState.uri,
        }
      } else if (prevState.val !== null && nextState.val === null) {
        // Case 3: Delete
        if (!prevState.uri) {
          throw new Error('Cannot delete rating without URI')
        }
        await apilib.deleteNoteRating(agent, prevState.uri)
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
      updateNoteShadow(queryClient, noteUri, {
        rating: finalState,
      })

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({
        queryKey: RQKEY(note.subject.uri),
      })
    },
  })

  const submitRating = useCallback(
    (ratingState: NoteRatingState) => {
      // Optimistically update the shadow cache
      updateNoteShadow(queryClient, noteUri, {
        rating: ratingState,
      })

      // Queue the mutation
      return queueRating(ratingState)
    },
    [queryClient, noteUri, queueRating],
  )

  return submitRating
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

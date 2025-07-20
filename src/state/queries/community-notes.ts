import {useMutation, useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/community-notes'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'community-notes'
export const RQKEY = (subjectUri: string) => [RQKEY_ROOT, subjectUri]

export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: {
      uri: string
      val: Vote
      reasons?: string[]
    }
  }
}

type Vote = 'helpful' | 'somewhat_helpful' | 'not_helpful'

export function useCreateNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation({
    mutationFn: async ({
      note,
      value,
      reasons,
    }: {
      note: {uri: string; cid?: string}
      value: Vote
      reasons: string[]
    }) => {
      return await apilib.createNoteRating(agent, note, value, reasons)
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({
        queryKey: RQKEY(variables.note.uri),
      })
    },
  })
}

export function useUpdateNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation({
    mutationFn: async ({
      ratingUri,
      note,
      value,
      reasons,
    }: {
      ratingUri: string
      note: {uri: string; cid?: string}
      value: Vote
      reasons: string[]
    }) => {
      return await apilib.updateNoteRating(
        agent,
        ratingUri,
        note,
        value,
        reasons,
      )
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({
        queryKey: RQKEY(variables.note.uri),
      })
    },
  })
}

export function useDeleteNoteRatingMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {ratingUri: string; noteUri: string}>({
    mutationFn: async ({ratingUri}: {ratingUri: string; noteUri: string}) => {
      await apilib.deleteNoteRating(agent, ratingUri)
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({
        queryKey: RQKEY(variables.noteUri),
      })
    },
  })
}

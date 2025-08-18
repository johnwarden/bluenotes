import {useEffect, useMemo, useState} from 'react'
import {type QueryClient} from '@tanstack/react-query'
import EventEmitter from 'eventemitter3'

import {batchedUpdates} from '#/lib/batchedUpdates'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {castAsShadow, type Shadow} from './types'
export type {Shadow} from './types'

export interface NoteRatingState {
  uri?: string // AT-URI of the org.opencommunitynotes.rating record. Present after creation.
  val: 'helpful' | 'somewhat_helpful' | 'not_helpful' | null
  reasons: string[]
}

export interface NoteShadow {
  rating: NoteRatingState
}

export interface CommunityNoteView extends CommunityNote {
  viewer?: {
    rating?: NoteRatingState
  }
}

const emitter = new EventEmitter()
// Store shadows by URI instead of object reference for better reliability
const shadowsByUri = new Map<string, Partial<NoteShadow>>()

export function useNoteShadow(note: CommunityNote): Shadow<CommunityNoteView> {
  const [shadow, setShadow] = useState(() => shadowsByUri.get(note.uri))
  const [prevNoteUri, setPrevNoteUri] = useState(note.uri)

  // Update shadow when note URI changes
  if (note.uri !== prevNoteUri) {
    setPrevNoteUri(note.uri)
    setShadow(shadowsByUri.get(note.uri))
  }

  useEffect(() => {
    function onUpdate() {
      const newShadow = shadowsByUri.get(note.uri)
      console.log('🔍 Debug: useNoteShadow onUpdate', {
        noteUri: note.uri,
        newShadow,
      })
      setShadow(newShadow)
    }
    emitter.addListener(note.uri, onUpdate)
    return () => {
      emitter.removeListener(note.uri, onUpdate)
    }
  }, [note.uri])

  const result = useMemo(() => {
    if (shadow) {
      console.log('🔍 Debug: useNoteShadow applying shadow', {
        noteUri: note.uri,
        shadow,
      })
      return mergeShadow(note, shadow)
    } else {
      return castAsShadow(note as CommunityNoteView)
    }
  }, [note, shadow])

  return result
}

function mergeShadow(
  note: CommunityNote,
  shadow: Partial<NoteShadow>,
): Shadow<CommunityNoteView> {
  const noteView: CommunityNoteView = {
    ...note,
    viewer: shadow.rating ? {rating: shadow.rating} : undefined,
  }

  return castAsShadow(noteView)
}

export function updateNoteShadow(
  queryClient: QueryClient,
  noteUri: string,
  value: Partial<NoteShadow>,
) {
  console.log('🔍 Debug: updateNoteShadow called', {noteUri, value})

  // Update shadow data by URI - much simpler and more reliable
  shadowsByUri.set(noteUri, {
    ...shadowsByUri.get(noteUri),
    ...value,
  })

  // Emit update for components using this note
  batchedUpdates(() => {
    emitter.emit(noteUri)
  })

  // Optional: Invalidate queries that might contain this note
  // This ensures server state stays fresh
  queryClient.invalidateQueries({
    predicate: query => {
      const key = query.queryKey[0]?.toString() || ''
      return (
        key.includes('community-notes') ||
        key.includes('proposals') ||
        key.includes('notes')
      )
    },
  })
}

// Note: findNotesInCache function removed - no longer needed with URI-based approach

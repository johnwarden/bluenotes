import {useEffect, useMemo, useState} from 'react'
import {type QueryClient} from '@tanstack/react-query'
import EventEmitter from 'eventemitter3'

import {batchedUpdates} from '#/lib/batchedUpdates'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {RQKEY} from '#/state/queries/community-notes'
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
const shadows: WeakMap<CommunityNote, Partial<NoteShadow>> = new WeakMap()

export function useNoteShadow(note: CommunityNote): Shadow<CommunityNoteView> {
  const [shadow, setShadow] = useState(() => shadows.get(note))
  const [prevNote, setPrevNote] = useState(note)
  if (note !== prevNote) {
    setPrevNote(note)
    setShadow(shadows.get(note))
  }

  useEffect(() => {
    function onUpdate() {
      const newShadow = shadows.get(note)
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
  }, [note, setShadow])

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
  const cachedNotes = Array.from(findNotesInCache(queryClient, noteUri))
  console.log('🔍 Debug: Found cached notes', cachedNotes.length)
  for (let note of cachedNotes) {
    console.log('🔍 Debug: Setting shadow for note', note.uri)
    shadows.set(note, {...shadows.get(note), ...value})
  }
  batchedUpdates(() => {
    emitter.emit(noteUri)
  })
}

function* findNotesInCache(
  queryClient: QueryClient,
  noteUri: string,
): Generator<CommunityNote, void> {
  // Search through all community notes queries in the cache
  const cache = queryClient.getQueryCache()
  const queries = cache.findAll({
    queryKey: [RQKEY('')[0]], // Match the root key 'community-notes'
    exact: false,
  })

  for (const query of queries) {
    const data = query.state.data as CommunityNote[] | undefined
    if (data && Array.isArray(data)) {
      for (const note of data) {
        if (note.uri === noteUri) {
          yield note
        }
      }
    }
  }
}

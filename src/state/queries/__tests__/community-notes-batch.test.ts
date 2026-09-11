import {QueryClient} from '@tanstack/react-query'

import {type CommunityNoteAPIResponse} from '#/lib/api/community-notes'
import {
  cacheGetProposalsBatch,
  collectUrisMissingProposalsCache,
  communityNotesProposalsQueryKey,
  mergeFallbackUris,
  shouldDisableWidgetProposalsFetch,
  shouldEnablePerPostProposalsQuery,
} from '../community-notes-batch'

const POST_A = 'at://did:plc:alice/app.bsky.feed.post/aaa'
const POST_B = 'at://did:plc:bob/app.bsky.feed.post/bbb'
const POST_C = 'at://did:plc:carol/app.bsky.feed.post/ccc'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {gcTime: Infinity, retry: false},
    },
  })
}

function createApiNote(
  targetUri: string,
  text: string,
): CommunityNoteAPIResponse {
  return {
    uri: `${targetUri.replace('/app.bsky.feed.post/', '/social.pmsky.proposal/')}-note`,
    cid: 'bafyreibxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    typ: 'label',
    targetUri,
    val: 'annotation',
    note: text,
    cts: '2024-01-01T00:00:00.000Z',
    status: 'rated_helpful',
    author: {
      aid: 'aid-1',
      pseudonym: 'NoteWriter',
    },
  }
}

describe('shouldEnablePerPostProposalsQuery', () => {
  it('enables per-post fetch on regular feeds when the post has a note status', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: 'rated_helpful',
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(true)
  })

  it('does not fetch when the post has no note status', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: undefined,
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(false)
  })

  it('disables per-post fetch on CN feeds while batch prefetch is the source of truth', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: 'rated_helpful',
        communityNotesFeedMode: 'rated_helpful',
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(false)
  })

  it('re-enables per-post fetch for a URI whose batch prefetch failed', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: 'rated_helpful',
        communityNotesFeedMode: 'rated_helpful',
        batchPrefetchFailedForUri: true,
      }),
    ).toBe(true)
  })
})

describe('shouldDisableWidgetProposalsFetch', () => {
  it('disables the widget fetch on CN feeds until batch fails', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: 'needs_more_ratings',
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(true)
  })

  it('re-enables the widget fetch after batch failure so note.text can load', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: 'rated_helpful',
        batchPrefetchFailedForUri: true,
      }),
    ).toBe(false)
  })

  it('never disables the widget fetch outside CN feeds', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(false)
  })
})

describe('batch cache write and fallback collection', () => {
  it('writes note.text into the per-post query cache on batch success', () => {
    const queryClient = createQueryClient()
    const noteText = 'Readers added context about the linked study.'

    cacheGetProposalsBatch({
      queryClient,
      subjectUris: [POST_A, POST_B],
      status: 'rated_helpful',
      proposals: [createApiNote(POST_A, noteText)],
    })

    const notesA = queryClient.getQueryData<
      Array<{text: string}>
    >(communityNotesProposalsQueryKey(POST_A, 'rated_helpful'))
    const notesB = queryClient.getQueryData<
      Array<{text: string}>
    >(communityNotesProposalsQueryKey(POST_B, 'rated_helpful'))

    expect(notesA).toHaveLength(1)
    expect(notesA?.[0].text).toBe(noteText)
    expect(notesB).toEqual([])
    expect(
      collectUrisMissingProposalsCache({
        queryClient,
        subjectUris: [POST_A, POST_B, POST_C],
        status: 'rated_helpful',
      }),
    ).toEqual([POST_C])
  })

  it('treats a failed batch as a per-post fallback for URIs that were never cached', () => {
    const queryClient = createQueryClient()
    cacheGetProposalsBatch({
      queryClient,
      subjectUris: [POST_A],
      status: 'rated_helpful',
      proposals: [
        createApiNote(POST_A, 'Readers added context they thought people might want to know.'),
      ],
    })

    const attempted = [POST_A, POST_B]
    const missing = collectUrisMissingProposalsCache({
      queryClient,
      subjectUris: attempted,
      status: 'rated_helpful',
    })

    expect(missing).toEqual([POST_B])
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_B,
        noteStatus: 'rated_helpful',
        communityNotesFeedMode: 'rated_helpful',
        batchPrefetchFailedForUri: missing.includes(POST_B),
      }),
    ).toBe(true)
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: 'rated_helpful',
        communityNotesFeedMode: 'rated_helpful',
        batchPrefetchFailedForUri: missing.includes(POST_A),
      }),
    ).toBe(false)
  })

  it('does not invent empty cache entries on failure, so per-post can still load bodies', () => {
    const queryClient = createQueryClient()
    const attempted = [POST_A]

    expect(
      collectUrisMissingProposalsCache({
        queryClient,
        subjectUris: attempted,
        status: 'rated_helpful',
      }),
    ).toEqual(attempted)
    expect(
      queryClient.getQueryData(
        communityNotesProposalsQueryKey(POST_A, 'rated_helpful'),
      ),
    ).toBeUndefined()
  })
})

describe('mergeFallbackUris', () => {
  it('returns the same set when there is nothing to add', () => {
    const prev = new Set([POST_A])
    expect(mergeFallbackUris(prev, [])).toBe(prev)
    expect(mergeFallbackUris(prev, [POST_A])).toBe(prev)
  })

  it('unions new URIs without dropping prior fallbacks', () => {
    const merged = mergeFallbackUris(new Set([POST_A]), [POST_B, POST_A])
    expect([...merged]).toEqual([POST_A, POST_B])
  })
})

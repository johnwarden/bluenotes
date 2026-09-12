import {QueryClient} from '@tanstack/react-query'

import {type CommunityNoteAPIResponse} from '#/lib/api/community-notes'
import {
  cacheGetProposalsBatch,
  collectUrisMissingProposalsCache,
  communityNotesProposalsQueryKey,
  mergeFallbackUris,
  proposalStatusesForFeed,
  resolveInlineNoteDisplayMode,
  shouldDisableWidgetProposalsFetch,
  shouldEnablePerPostProposalsQuery,
} from '../community-notes-batch'

/*
 * The notes API module pulls Expo native constants. Mock the mapper so this
 * suite can run without requireOptionalNativeModule.
 */
jest.mock('#/lib/api/community-notes', () => ({
  mapProposalApiResponseToCommunityNote: (apiNote: {
    uri: string
    cid: string
    targetUri: string
    val: string
    note?: string
    cts: string
    status: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
    author: {aid: string; pseudonym: string}
  }) => ({
    $type: 'social.pmsky.proposal',
    typ: 'label',
    subject: {uri: apiNote.targetUri, cid: apiNote.cid},
    label: apiNote.val,
    text: apiNote.note,
    createdAt: apiNote.cts,
    noteId: apiNote.uri.split('/').pop() || apiNote.uri,
    status: apiNote.status,
    uri: apiNote.uri,
    author: {
      aid: apiNote.author.aid,
      pseudonym: apiNote.author.pseudonym,
      writingImpact: 0,
      ratingImpact: 0,
      profileUrl: '#',
    },
  }),
}))

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

  it('does not fetch when the post has no note status and batch is still the source of truth', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: undefined,
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(false)
  })

  it('re-enables per-post fetch on home when batch misses an unlabeled URI', () => {
    expect(
      shouldEnablePerPostProposalsQuery({
        subjectUri: POST_A,
        noteStatus: undefined,
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: true,
      }),
    ).toBe(true)
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

  it('does not disable the widget fetch when the feed is not using batch prefetch', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
      }),
    ).toBe(false)
  })

  it('disables the widget fetch on home while feed batch prefetch is the source of truth', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: false,
        usesFeedBatchPrefetch: true,
      }),
    ).toBe(true)
  })

  it('re-enables the home widget fetch after batch failure so note.text can load', () => {
    expect(
      shouldDisableWidgetProposalsFetch({
        communityNotesFeedMode: undefined,
        batchPrefetchFailedForUri: true,
        usesFeedBatchPrefetch: true,
      }),
    ).toBe(false)
  })
})

describe('proposalStatusesForFeed', () => {
  it('prefetches only the CN tab status', () => {
    expect(proposalStatusesForFeed('rated_helpful')).toEqual(['rated_helpful'])
    expect(proposalStatusesForFeed('needs_more_ratings')).toEqual([
      'needs_more_ratings',
    ])
  })

  it('prefetches helpful and proposed on Home / Discover / Following', () => {
    expect(proposalStatusesForFeed(undefined)).toEqual([
      'rated_helpful',
      'needs_more_ratings',
    ])
  })
})

describe('resolveInlineNoteDisplayMode', () => {
  it('keeps CN tab mode even when the card has no labels yet', () => {
    expect(
      resolveInlineNoteDisplayMode({
        communityNotesFeedMode: 'needs_more_ratings',
        hasHelpfulNotes: false,
        hasProposedNotes: false,
      }),
    ).toBe('needs_more_ratings')
  })

  it('uses cached helpful note.text on home when AppView omitted labels', () => {
    expect(
      resolveInlineNoteDisplayMode({
        hasHelpfulNotes: false,
        hasProposedNotes: false,
        helpfulNoteCount: 1,
        proposedNoteCount: 0,
      }),
    ).toBe('rated_helpful')
  })

  it('uses cached proposed note.text on home when AppView omitted labels', () => {
    expect(
      resolveInlineNoteDisplayMode({
        hasHelpfulNotes: false,
        hasProposedNotes: false,
        helpfulNoteCount: 0,
        proposedNoteCount: 1,
      }),
    ).toBe('needs_more_ratings')
  })

  it('prefers helpful chrome when both labels and caches are present', () => {
    expect(
      resolveInlineNoteDisplayMode({
        hasHelpfulNotes: true,
        hasProposedNotes: true,
        helpfulNoteCount: 1,
        proposedNoteCount: 1,
      }),
    ).toBe('rated_helpful')
  })

  it('does not invent chrome when home batch wrote empty caches and there are no labels', () => {
    expect(
      resolveInlineNoteDisplayMode({
        hasHelpfulNotes: false,
        hasProposedNotes: false,
        helpfulNoteCount: 0,
        proposedNoteCount: 0,
      }),
    ).toBeUndefined()
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

    const notesA = queryClient.getQueryData<Array<{text: string}>>(
      communityNotesProposalsQueryKey(POST_A, 'rated_helpful'),
    )
    const notesB = queryClient.getQueryData<Array<{text: string}>>(
      communityNotesProposalsQueryKey(POST_B, 'rated_helpful'),
    )

    expect(notesA).toHaveLength(1)
    expect(notesA?.[0].text).toBe(noteText)
    expect(notesB).toHaveLength(0)
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
        createApiNote(
          POST_A,
          'Readers added context they thought people might want to know.',
        ),
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

  it('lets an unlabeled home card resolve helpful chrome from the batch cache', () => {
    const queryClient = createQueryClient()
    const noteText = 'The Foreign Office is responsible for all costs.'

    cacheGetProposalsBatch({
      queryClient,
      subjectUris: [POST_A],
      status: 'rated_helpful',
      proposals: [createApiNote(POST_A, noteText)],
    })

    const cached = queryClient.getQueryData<Array<{text: string}>>(
      communityNotesProposalsQueryKey(POST_A, 'rated_helpful'),
    )

    expect(cached?.[0].text).toBe(noteText)
    expect(
      resolveInlineNoteDisplayMode({
        hasHelpfulNotes: false,
        hasProposedNotes: false,
        helpfulNoteCount: cached?.length ?? 0,
        proposedNoteCount: 0,
      }),
    ).toBe('rated_helpful')
    expect(
      shouldDisableWidgetProposalsFetch({
        batchPrefetchFailedForUri: false,
        usesFeedBatchPrefetch: true,
      }),
    ).toBe(true)
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

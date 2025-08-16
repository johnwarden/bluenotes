import {type AppBskyFeedDefs, type ComAtprotoLabelDefs} from '@atproto/api'

import {
  COMMUNITY_NOTES_LABELER_DID,
  COMMUNITY_NOTES_LABELS,
  getCommunityNotesLabels,
  hasHelpfulNotes,
  hasLabel,
  hasProposedNotes,
} from '../labels'

// Mock post factory
function createMockPost(
  labels: ComAtprotoLabelDefs.Label[] = [],
): AppBskyFeedDefs.PostView {
  return {
    uri: 'at://did:example/app.bsky.feed.post/123',
    cid: 'bafyreibxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    author: {
      did: 'did:example',
      handle: 'test.bsky.social',
      displayName: 'Test User',
    },
    record: {},
    indexedAt: '2024-01-01T00:00:00.000Z',
    labels,
  } as AppBskyFeedDefs.PostView
}

// Mock label factory
function createMockLabel(src: string, val: string): ComAtprotoLabelDefs.Label {
  return {
    src,
    uri: 'at://did:example/app.bsky.feed.post/123',
    val,
    cts: '2024-01-01T00:00:00.000Z',
  }
}

describe('Community Notes Labels', () => {
  describe('hasLabel', () => {
    it('should return true when post has the specified Community Notes label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)).toBe(true)
    })

    it('should return false when post does not have the specified label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasLabel(post, COMMUNITY_NOTES_LABELS.PROPOSED_NOTE)).toBe(false)
    })

    it('should return false when post has no labels', () => {
      const post = createMockPost([])

      expect(hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)).toBe(false)
    })

    it('should return false when label is from different labeler', () => {
      const post = createMockPost([
        createMockLabel(
          'did:web:other-labeler.com',
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)).toBe(false)
    })
  })

  describe('hasHelpfulNotes', () => {
    it('should return true when post has note label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasHelpfulNotes(post)).toBe(true)
    })

    it('should return false when post only has proposed-note label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
        ),
      ])

      expect(hasHelpfulNotes(post)).toBe(false)
    })
  })

  describe('hasProposedNotes', () => {
    it('should return true when post has proposed-note label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
        ),
      ])

      expect(hasProposedNotes(post)).toBe(true)
    })

    it('should return false when post only has note label', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasProposedNotes(post)).toBe(false)
    })
  })

  describe('getCommunityNotesLabels', () => {
    it('should return all Community Notes labels', () => {
      const post = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
        ),
        createMockLabel('did:web:other-labeler.com', 'other-label'),
      ])

      const communityNotesLabels = getCommunityNotesLabels(post)

      expect(communityNotesLabels).toHaveLength(2)
      expect(communityNotesLabels[0].val).toBe(COMMUNITY_NOTES_LABELS.NOTE)
      expect(communityNotesLabels[1].val).toBe(
        COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
      )
    })

    it('should return empty array when post has no Community Notes labels', () => {
      const post = createMockPost([
        createMockLabel('did:web:other-labeler.com', 'other-label'),
      ])

      expect(getCommunityNotesLabels(post)).toEqual([])
    })
  })

  describe('multiple labeler environments', () => {
    it('should recognize labels from all Community Notes labeler environments', () => {
      const postWithProdLabel = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.PROD,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      const postWithStagingLabel = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.STAGING,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      const postWithDevLabel = createMockPost([
        createMockLabel(
          COMMUNITY_NOTES_LABELER_DID.DEV,
          COMMUNITY_NOTES_LABELS.NOTE,
        ),
      ])

      expect(hasHelpfulNotes(postWithProdLabel)).toBe(true)
      expect(hasHelpfulNotes(postWithStagingLabel)).toBe(true)
      expect(hasHelpfulNotes(postWithDevLabel)).toBe(true)
    })
  })
})

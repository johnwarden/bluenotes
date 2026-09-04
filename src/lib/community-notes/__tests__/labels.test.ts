import {type app, type com} from '#/lexicons'

import {
  COMMUNITY_NOTES_LABELS,
  getCommunityNotesLabels,
  hasHelpfulNotes,
  hasLabel,
  hasProposedNotes,
  updateCommunityNotesLabelerDid,
} from '../labels'

// Test labeler DIDs - these are just for testing, not real network calls
const TEST_LABELER_DIDS = {
  DEV: 'did:plc:test-dev-community-notes',
  STAGING: 'did:plc:test-staging-community-notes',
  PROD: 'did:plc:test-prod-community-notes',
}

// Mock post factory
function createMockPost(
  labels: com.atproto.label.defs.Label[] = [],
): app.bsky.feed.defs.PostView {
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
  } as app.bsky.feed.defs.PostView
}

// Mock label factory
function createMockLabel(src: string, val: string): com.atproto.label.defs.Label {
  return {
    src,
    uri: 'at://did:example/app.bsky.feed.post/123',
    val,
    cts: '2024-01-01T00:00:00.000Z',
  }
}

describe('Community Notes Labels', () => {
  beforeEach(() => {
    // Set up the labeler DID for testing - default to DEV
    updateCommunityNotesLabelerDid(TEST_LABELER_DIDS.DEV)
  })

  afterEach(() => {
    // Clean up after each test
    updateCommunityNotesLabelerDid(null)
  })

  describe('hasLabel', () => {
    it('should return true when post has the specified Community Notes label', () => {
      const post = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasLabel(post, COMMUNITY_NOTES_LABELS.NOTE)).toBe(true)
    })

    it('should return false when post does not have the specified label', () => {
      const post = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
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
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasHelpfulNotes(post)).toBe(true)
    })

    it('should return false when post only has proposed-note label', () => {
      const post = createMockPost([
        createMockLabel(
          TEST_LABELER_DIDS.DEV,
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
          TEST_LABELER_DIDS.DEV,
          COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
        ),
      ])

      expect(hasProposedNotes(post)).toBe(true)
    })

    it('should return false when post only has note label', () => {
      const post = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasProposedNotes(post)).toBe(false)
    })
  })

  describe('getCommunityNotesLabels', () => {
    it('should return all Community Notes labels', () => {
      const post = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
        createMockLabel(
          TEST_LABELER_DIDS.DEV,
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
    it('should recognize labels from PROD labeler environment', () => {
      updateCommunityNotesLabelerDid(TEST_LABELER_DIDS.PROD)
      const postWithProdLabel = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.PROD, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasHelpfulNotes(postWithProdLabel)).toBe(true)
    })

    it('should recognize labels from STAGING labeler environment', () => {
      updateCommunityNotesLabelerDid(TEST_LABELER_DIDS.STAGING)
      const postWithStagingLabel = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.STAGING, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasHelpfulNotes(postWithStagingLabel)).toBe(true)
    })

    it('should recognize labels from DEV labeler environment', () => {
      updateCommunityNotesLabelerDid(TEST_LABELER_DIDS.DEV)
      const postWithDevLabel = createMockPost([
        createMockLabel(TEST_LABELER_DIDS.DEV, COMMUNITY_NOTES_LABELS.NOTE),
      ])

      expect(hasHelpfulNotes(postWithDevLabel)).toBe(true)
    })
  })
})

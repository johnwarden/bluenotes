import {type DidString} from '@atproto/syntax'

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
} as const satisfies Record<string, DidString>

const TEST_AUTHOR_DID = 'did:plc:testauthor' satisfies DidString
const OTHER_LABELER_DID = 'did:web:other-labeler.com' satisfies DidString

const POST_URI =
  `at://${TEST_AUTHOR_DID}/app.bsky.feed.post/123` as app.bsky.feed.defs.PostView['uri']
const POST_CID =
  'bafyreibxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' as app.bsky.feed.defs.PostView['cid']
const INDEXED_AT =
  '2024-01-01T00:00:00.000Z' as app.bsky.feed.defs.PostView['indexedAt']

function createMockPost(
  labels: com.atproto.label.defs.Label[] = [],
): app.bsky.feed.defs.PostView {
  return {
    $type: 'app.bsky.feed.defs#postView',
    uri: POST_URI,
    cid: POST_CID,
    author: {
      $type: 'app.bsky.actor.defs#profileViewBasic',
      did: TEST_AUTHOR_DID,
      handle: 'test.bsky.social',
      displayName: 'Test User',
    },
    record: {
      $type: 'app.bsky.feed.post',
      text: 'test',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    indexedAt: INDEXED_AT,
    labels,
  }
}

function createMockLabel(
  src: DidString,
  val: string,
): com.atproto.label.defs.Label {
  return {
    src,
    uri: POST_URI,
    val,
    cts: INDEXED_AT,
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
        createMockLabel(OTHER_LABELER_DID, COMMUNITY_NOTES_LABELS.NOTE),
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
        createMockLabel(OTHER_LABELER_DID, 'other-label'),
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
        createMockLabel(OTHER_LABELER_DID, 'other-label'),
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

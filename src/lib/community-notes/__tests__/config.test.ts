import {
  applyCommunityNotesLabelerDidFromConfig,
  CommunityNotesLabelerDidError,
  parseCommunityNotesConfig,
  shouldRetryCommunityNotesConfig,
} from '../config'
import {
  COMMUNITY_NOTES_LABELER_DID,
  getCurrentCommunityNotesLabelerDid,
  isPinnedCommunityNotesLabelerDid,
  updateCommunityNotesLabelerDid,
} from '../labeler-did'

const PINNED_LABELER_DID = COMMUNITY_NOTES_LABELER_DID.PROD
const ATTACKER_LABELER_DID = 'did:plc:attacker'
const FEED_GENERATOR_DID = 'did:plc:feedgenerator'

function validConfig(labelerDid: string) {
  return {
    version: '1',
    labelerDid,
    feedGeneratorDid: FEED_GENERATOR_DID,
  }
}

describe('isPinnedCommunityNotesLabelerDid', () => {
  it('accepts the pinned prod/staging/dev labeler DID', () => {
    expect(isPinnedCommunityNotesLabelerDid(PINNED_LABELER_DID)).toBe(true)
    expect(
      isPinnedCommunityNotesLabelerDid(COMMUNITY_NOTES_LABELER_DID.STAGING),
    ).toBe(true)
    expect(
      isPinnedCommunityNotesLabelerDid(COMMUNITY_NOTES_LABELER_DID.DEV),
    ).toBe(true)
  })

  it('rejects a DID that is not on the allowlist and non-DID strings', () => {
    expect(isPinnedCommunityNotesLabelerDid(ATTACKER_LABELER_DID)).toBe(false)
    expect(isPinnedCommunityNotesLabelerDid('not-a-did')).toBe(false)
    expect(isPinnedCommunityNotesLabelerDid('')).toBe(false)
  })
})

describe('parseCommunityNotesConfig', () => {
  it('accepts a pinned Community Notes labeler DID', () => {
    expect(parseCommunityNotesConfig(validConfig(PINNED_LABELER_DID))).toEqual({
      version: '1',
      labelerDid: PINNED_LABELER_DID,
      feedGeneratorDid: FEED_GENERATOR_DID,
    })
  })

  it('throws when labelerDid is not a DID', () => {
    expect(() => parseCommunityNotesConfig(validConfig('not-a-did'))).toThrow(
      CommunityNotesLabelerDidError,
    )
    expect(() => parseCommunityNotesConfig(validConfig('not-a-did'))).toThrow(
      /not a DID/,
    )
    expect(() => parseCommunityNotesConfig(validConfig(''))).toThrow(
      /not a DID/,
    )
    expect(() =>
      parseCommunityNotesConfig(validConfig('plc:57fl6zy4wmpuknwpgtjqkvlz')),
    ).toThrow(/not a DID/)
  })

  it('throws when labelerDid is a DID that is not pinned', () => {
    expect(() =>
      parseCommunityNotesConfig(validConfig(ATTACKER_LABELER_DID)),
    ).toThrow(CommunityNotesLabelerDidError)
    expect(() =>
      parseCommunityNotesConfig(validConfig(ATTACKER_LABELER_DID)),
    ).toThrow(/not the pinned Community Notes labeler/)
  })
})

describe('applyCommunityNotesLabelerDidFromConfig', () => {
  beforeEach(() => {
    updateCommunityNotesLabelerDid(PINNED_LABELER_DID)
  })

  afterEach(() => {
    updateCommunityNotesLabelerDid(null)
  })

  it('does not change the active CN labeler DID when getConfig returns did:plc:attacker', () => {
    const applied =
      applyCommunityNotesLabelerDidFromConfig(ATTACKER_LABELER_DID)

    expect(applied).toBe(false)
    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
  })

  it('does not change the active CN labeler DID when getConfig returns a non-DID', () => {
    const applied = applyCommunityNotesLabelerDidFromConfig('not-a-did')

    expect(applied).toBe(false)
    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
  })

  it('installs the pinned labeler DID', () => {
    updateCommunityNotesLabelerDid(null)

    const applied = applyCommunityNotesLabelerDidFromConfig(PINNED_LABELER_DID)

    expect(applied).toBe(true)
    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
  })
})

describe('shouldRetryCommunityNotesConfig', () => {
  it('does not retry a refused labelerDid', () => {
    expect(
      shouldRetryCommunityNotesConfig(
        0,
        new CommunityNotesLabelerDidError('getConfig.labelerDid is not a DID'),
      ),
    ).toBe(false)
  })

  it('does not retry missing endpoints', () => {
    expect(
      shouldRetryCommunityNotesConfig(
        0,
        new Error('Failed to fetch Community Notes config: 404'),
      ),
    ).toBe(false)
  })

  it('retries other failures up to three times', () => {
    expect(shouldRetryCommunityNotesConfig(0, new Error('timeout'))).toBe(true)
    expect(shouldRetryCommunityNotesConfig(2, new Error('timeout'))).toBe(true)
    expect(shouldRetryCommunityNotesConfig(3, new Error('timeout'))).toBe(false)
  })
})

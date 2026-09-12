import {render} from '@testing-library/react-native'

import {CommunityNotesLabelerDidError} from '#/lib/community-notes/config'
import {
  COMMUNITY_NOTES_LABELER_DID,
  getCurrentCommunityNotesLabelerDid,
  updateCommunityNotesLabelerDid,
} from '#/lib/community-notes/labeler-did'
import {configureAdditionalModerationAuthorities} from '#/state/session/additional-moderation-authorities'
import {useCommunityNotesConfig} from '../community-notes-config'
import {CommunityNotesConfigLoader} from '../community-notes-config-loader'

jest.mock('../community-notes-config', () => ({
  useCommunityNotesConfig: jest.fn(),
}))

jest.mock('#/state/session/additional-moderation-authorities', () => ({
  configureAdditionalModerationAuthorities: jest.fn(),
}))

jest.mock('#/logger', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}))

const PINNED_LABELER_DID = COMMUNITY_NOTES_LABELER_DID.PROD
const ATTACKER_LABELER_DID = 'did:plc:attacker'

function mockConfig(value: ReturnType<typeof useCommunityNotesConfig>) {
  jest.mocked(useCommunityNotesConfig).mockReturnValue(value)
}

describe('CommunityNotesConfigLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    updateCommunityNotesLabelerDid(PINNED_LABELER_DID)
  })

  afterEach(() => {
    updateCommunityNotesLabelerDid(null)
  })

  it('does not install getConfig labelerDid did:plc:attacker', () => {
    mockConfig({
      data: {
        version: '1',
        labelerDid: ATTACKER_LABELER_DID,
        feedGeneratorDid: 'did:plc:feed',
      },
      error: null,
    } as ReturnType<typeof useCommunityNotesConfig>)

    render(<CommunityNotesConfigLoader />)

    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
    expect(configureAdditionalModerationAuthorities).not.toHaveBeenCalled()
  })

  it('does not clear the pin when getConfig.labelerDid is rejected', () => {
    mockConfig({
      data: undefined,
      error: new CommunityNotesLabelerDidError(
        'getConfig.labelerDid is not a DID',
      ),
    } as ReturnType<typeof useCommunityNotesConfig>)

    render(<CommunityNotesConfigLoader />)

    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
    expect(configureAdditionalModerationAuthorities).not.toHaveBeenCalled()
  })

  it('installs a pinned getConfig labelerDid', () => {
    updateCommunityNotesLabelerDid(null)
    mockConfig({
      data: {
        version: '1',
        labelerDid: PINNED_LABELER_DID,
        feedGeneratorDid: 'did:plc:feed',
      },
      error: null,
    } as ReturnType<typeof useCommunityNotesConfig>)

    render(<CommunityNotesConfigLoader />)

    expect(getCurrentCommunityNotesLabelerDid()).toBe(PINNED_LABELER_DID)
    expect(configureAdditionalModerationAuthorities).toHaveBeenCalledTimes(1)
  })
})

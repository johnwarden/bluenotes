import {useEffect} from 'react'

import {
  applyCommunityNotesLabelerDidFromConfig,
  isCommunityNotesLabelerDidError,
} from '#/lib/community-notes/config'
import {updateCommunityNotesLabelerDid} from '#/lib/community-notes/labels'
import {logger} from '#/logger'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {configureAdditionalModerationAuthorities} from '#/state/session/additional-moderation-authorities'

/**
 * Component to load Community Notes config and update the global labeler DID.
 * This must be rendered inside the QueryProvider context.
 */
export function CommunityNotesConfigLoader() {
  // Load Community Notes config and update labeler DID
  const {data: communityNotesConfig, error: communityNotesConfigError} =
    useCommunityNotesConfig()

  useEffect(() => {
    if (communityNotesConfig?.labelerDid) {
      const applied = applyCommunityNotesLabelerDidFromConfig(
        communityNotesConfig.labelerDid,
      )
      if (!applied) {
        logger.warn(
          '[CommunityNotes] Refusing unpinned getConfig.labelerDid',
          {labelerDid: communityNotesConfig.labelerDid},
        )
        return
      }

      logger.info('[CommunityNotes] Config loaded, updating labeler DID', {
        labelerDid: communityNotesConfig.labelerDid,
      })
      configureAdditionalModerationAuthorities()
    } else if (communityNotesConfigError) {
      if (isCommunityNotesLabelerDidError(communityNotesConfigError)) {
        logger.warn(
          '[CommunityNotes] Refusing getConfig.labelerDid that is not pinned',
          {error: communityNotesConfigError},
        )
        return
      }
      logger.warn('[CommunityNotes] Config failed to load', {
        error: communityNotesConfigError,
      })
      // If config fails to load, clear any existing labeler DID
      updateCommunityNotesLabelerDid(null)
      configureAdditionalModerationAuthorities()
    }
  }, [communityNotesConfig, communityNotesConfigError])

  return null // This component only handles side effects
}

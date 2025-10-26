import React from 'react'

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

  React.useEffect(() => {
    if (communityNotesConfig?.labelerDid) {
      logger.info('[CommunityNotes] Config loaded, updating labeler DID', {
        labelerDid: communityNotesConfig.labelerDid,
      })

      updateCommunityNotesLabelerDid(communityNotesConfig.labelerDid)
      configureAdditionalModerationAuthorities()
    } else if (communityNotesConfigError) {
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

import React from 'react'

import {updateCommunityNotesLabelerDid} from '#/lib/community-notes/labels'
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
      updateCommunityNotesLabelerDid(communityNotesConfig.labelerDid)
      // Reconfigure moderation authorities to include the new labeler DID
      configureAdditionalModerationAuthorities()
    } else if (communityNotesConfigError) {
      // If config fails to load, clear any existing labeler DID to prevent
      // using stale/invalid labeler configuration
      updateCommunityNotesLabelerDid(null)
      // Reconfigure to remove the labeler DID
      configureAdditionalModerationAuthorities()
    }
  }, [communityNotesConfig, communityNotesConfigError])

  return null // This component only handles side effects
}

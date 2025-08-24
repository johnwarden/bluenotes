import React from 'react'

import {updateCommunityNotesLabelerDid} from '#/lib/community-notes/labels'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'

/**
 * Component to load Community Notes config and update the global labeler DID.
 * This must be rendered inside the QueryProvider context.
 */
export function CommunityNotesConfigLoader() {
  // Load Community Notes config and update labeler DID
  const {data: communityNotesConfig, error: communityNotesConfigError} =
    useCommunityNotesConfig()

  React.useEffect(() => {
    if (communityNotesConfig?.labeler_did) {
      updateCommunityNotesLabelerDid(communityNotesConfig.labeler_did)
    } else if (communityNotesConfigError) {
      // If config fails to load, clear any existing labeler DID to prevent
      // using stale/invalid labeler configuration
      updateCommunityNotesLabelerDid(null)
    }
  }, [communityNotesConfig, communityNotesConfigError])

  return null // This component only handles side effects
}

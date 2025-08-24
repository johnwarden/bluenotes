import {useQuery} from '@tanstack/react-query'

import {COMMUNITY_NOTES_SERVICE} from '#/lib/constants'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

export interface CommunityNotesConfig {
  version: string
  labeler_did: string
  feed_generator_did: string
}

const RQKEY_ROOT = 'community-notes-config'
export const RQKEY = () => [RQKEY_ROOT]

export function useCommunityNotesConfig() {
  const agent = useAgent()

  return useQuery<CommunityNotesConfig>({
    queryKey: RQKEY(),
    queryFn: async () => {
      const serviceUrl = agent
        ? agent.service.toString()
        : 'https://bsky.social'
      const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(serviceUrl)

      const response = await fetch(
        `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getConfig`,
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Community Notes config: ${response.status}`,
        )
      }

      const config = await response.json()

      // Validate the response structure
      if (
        !config.version ||
        !config.labeler_did ||
        !config.feed_generator_did
      ) {
        throw new Error('Invalid Community Notes config response')
      }

      return config as CommunityNotesConfig
    },
    staleTime: STALE.MINUTES.FIVE, // 5 minutes
    gcTime: STALE.HOURS.ONE, // Keep in cache for 1 hour even on error
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry if the endpoint doesn't exist (404) or is not implemented (501)
      if (error.message.includes('404') || error.message.includes('501')) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Only fetch if we have an agent (user is logged in or app is initialized)
    enabled: !!agent,
  })
}

import {useQuery} from '@tanstack/react-query'

import {COMMUNITY_NOTES_SERVICE} from '#/lib/constants'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

export interface CommunityNotesConfig {
  version: string
  labelerDid: string
  feedGeneratorDid: string
  feeds?: {
    uri: string
  }[]
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

      // Fetch basic config
      const configResponse = await fetch(
        `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getConfig`,
      )

      if (!configResponse.ok) {
        throw new Error(
          `Failed to fetch Community Notes config: ${configResponse.status}`,
        )
      }

      const config = await configResponse.json()

      // Validate the basic config structure
      if (!config.version || !config.labelerDid || !config.feedGeneratorDid) {
        throw new Error('Invalid Community Notes config response')
      }

      return config as CommunityNotesConfig
    },
    // Config rarely changes - keep it fresh for the entire session
    staleTime: Infinity, // Never becomes stale during session
    gcTime: STALE.HOURS.TWENTYFOUR, // Keep in cache for 24 hours
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Don't refetch on component remount
    refetchOnReconnect: false, // Don't refetch on network reconnect
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

/**
 * Returns true if the Community Notes config has finished loading (success or failure).
 * Use this to gate feed queries that need to know the labeler DID before fetching.
 */
export function useCommunityNotesConfigReady() {
  const {isLoading, isFetching} = useCommunityNotesConfig()
  return !isLoading && !isFetching
}

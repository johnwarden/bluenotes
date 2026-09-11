import {useQuery} from '@tanstack/react-query'

import {
  type ServiceAuthAgent,
  type ServiceAuthPdsClient,
} from '#/lib/api/community-notes-auth'
import {
  type CommunityNotesConfig,
  isCommunityNotesLabelerDidError,
  parseCommunityNotesConfig,
} from '#/lib/community-notes/config'
import {COMMUNITY_NOTES_SERVICE, DEFAULT_SERVICE} from '#/lib/constants'
import {STALE} from '#/state/queries'
import {useMaybePdsClient, useSession} from '#/state/session'

export type {CommunityNotesConfig}

function serviceUrlOf(agent: ServiceAuthAgent): string {
  const service = agent?.service
  if (!service) {
    return DEFAULT_SERVICE
  }
  return typeof service === 'string' ? service : service.toString()
}

/**
 * 1.133 replacement for `useAgent()` used by notes XRPC helpers.
 * Password sessions expose `accessJwt`. After merge with rebrand,
 * OAuth sessions set `isOauthSession` and mint via `pdsClient`.
 */
export function useCommunityNotesAuth(): ServiceAuthAgent {
  const {currentAccount} = useSession()
  const pdsClient = useMaybePdsClient()
  return {
    service: currentAccount?.service ?? DEFAULT_SERVICE,
    session: {accessJwt: currentAccount?.accessJwt},
    pdsClient: (pdsClient ?? undefined) as ServiceAuthPdsClient | undefined,
    isOauthSession: Boolean(
      (currentAccount as {isOauthSession?: boolean} | undefined)
        ?.isOauthSession,
    ),
  }
}

const RQKEY_ROOT = 'community-notes-config'
export const RQKEY = () => [RQKEY_ROOT]

export function useCommunityNotesConfig() {
  const auth = useCommunityNotesAuth()

  return useQuery<CommunityNotesConfig>({
    queryKey: [...RQKEY(), serviceUrlOf(auth)],
    queryFn: async () => {
      const communityNotesServiceUrl = COMMUNITY_NOTES_SERVICE(
        serviceUrlOf(auth),
      )

      // Fetch basic config
      const configResponse = await fetch(
        `${communityNotesServiceUrl}/xrpc/org.opencommunitynotes.getConfig`,
      )

      if (!configResponse.ok) {
        throw new Error(
          `Failed to fetch Community Notes config: ${configResponse.status}`,
        )
      }

      return parseCommunityNotesConfig(await configResponse.json())
    },
    // Config rarely changes - keep it fresh for the entire session
    staleTime: Infinity, // Never becomes stale during session
    gcTime: STALE.HOURS.ONE * 24, // Keep in cache for 24 hours
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Don't refetch on component remount
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      // Don't retry a refused labelerDid - the pin will not change.
      if (isCommunityNotesLabelerDidError(error)) {
        return false
      }
      // Don't retry if the endpoint doesn't exist (404) or is not implemented (501)
      if (error.message.includes('404') || error.message.includes('501')) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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

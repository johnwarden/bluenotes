import {useQuery} from '@tanstack/react-query'

import {
  type ServiceAuthAgent,
  type ServiceAuthPdsClient,
} from '#/lib/api/community-notes-auth'
import {
  type CommunityNotesConfig,
  parseCommunityNotesConfig,
  shouldRetryCommunityNotesConfig,
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
 * Password sessions expose `accessJwt` and mint via `pdsClient`.
 * Signed-in OAuth (empty persisted `accessJwt`, or an explicit
 * `isOauthSession` flag after the rebrand merge) also mints via
 * `pdsClient` so getProposals can send Bearer (#41).
 */
export function useCommunityNotesAuth(): ServiceAuthAgent {
  const {currentAccount, hasSession} = useSession()
  const pdsClient = useMaybePdsClient()
  const accessJwt = currentAccount?.accessJwt
  const hasPasswordJwt = typeof accessJwt === 'string' && accessJwt.length > 0
  return {
    service: currentAccount?.service ?? DEFAULT_SERVICE,
    session: {accessJwt},
    pdsClient: (pdsClient ?? undefined) as ServiceAuthPdsClient | undefined,
    isOauthSession: Boolean(
      (currentAccount as {isOauthSession?: boolean} | undefined)
        ?.isOauthSession || (hasSession && !hasPasswordJwt),
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
    retry: shouldRetryCommunityNotesConfig,
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

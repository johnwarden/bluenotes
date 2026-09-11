import {IS_NATIVE} from '#/env'
import {buildStateObject} from '#/lib/routes/helpers'
import {type RouteParams} from '#/lib/routes/types'
import {CHAT_INVITE_CODE_REGEX} from '#/lib/strings/url-helpers'
import {router} from '#/routes'

/**
 * Default Community Notes tab when a deep link omits `:tab`
 * (e.g. `/community-notes` rather than `/community-notes/feeds`).
 */
const DEFAULT_COMMUNITY_NOTES_TAB = 'feeds'

function resolveRouteParams(
  name: string,
  params: RouteParams,
): RouteParams {
  if (name === 'CommunityNotes' && !params.tab) {
    return {...params, tab: DEFAULT_COMMUNITY_NOTES_TAB}
  }
  return params
}

/**
 * Build the React Navigation state for a URL path.
 *
 * Extracted from the navigation container so Community Notes (and other)
 * deep-link routing can be unit-tested without mounting the app shell.
 */
export function getStateFromPath(
  path: string,
  {isNative = IS_NATIVE}: {isNative?: boolean} = {},
) {
  const [name, rawParams] = router.matchPath(path)
  const params = resolveRouteParams(name, rawParams)

  /*
   * Any time we receive a url that starts with `intent/` we want to ignore it
   * here. It will be handled in the intent handler hook. We should check for
   * the trailing slash, because if there isn't one then it isn't a valid intent.
   * On web, there is no route state that's created by default, so we should
   * initialize it as the home route. On native, since the home tab and the home
   * screen are defined as initial routes, we don't need to return a state since
   * it will be created by react-navigation.
   */
  if (path.includes('intent/')) {
    if (isNative) return
    return buildStateObject('Flat', 'Home', params)
  }

  /*
   * Chat invite URLs (`/chat/:code`) are handled by `useIntentHandler`, which
   * opens the GroupChatJoinDialog (or the logged-out join flow). Route the
   * path to Home so the dialog overlays Home instead of NotFound. On native,
   * react-navigation strips the `bluesky://` prefix and passes the path
   * without a leading slash, so normalize before matching.
   */
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (CHAT_INVITE_CODE_REGEX.test(normalizedPath.split('?')[0])) {
    if (isNative) {
      return buildStateObject('HomeTab', 'Home', params)
    }
    return buildStateObject('Flat', 'Home', params)
  }

  if (isNative) {
    if (name === 'Search') {
      return buildStateObject('SearchTab', 'Search', params)
    }
    if (name === 'Notifications') {
      return buildStateObject('NotificationsTab', 'Notifications', params)
    }
    if (name === 'Home') {
      return buildStateObject('HomeTab', 'Home', params)
    }
    if (name === 'Messages') {
      return buildStateObject('MessagesTab', 'Messages', params)
    }
    if (name === 'CommunityNotes') {
      return buildStateObject('CommunityNotesTab', 'CommunityNotes', params)
    }
    /*
     * If the path is something else, like a post, profile, or even settings,
     * we need to initialize the home tab as pre-existing state otherwise the
     * back button will not work.
     */
    return buildStateObject('HomeTab', name, params, [
      {
        name: 'Home',
        params: {},
      },
    ])
  }

  return buildStateObject('Flat', name, params)
}

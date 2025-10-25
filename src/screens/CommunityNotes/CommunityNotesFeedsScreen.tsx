import {useCallback, useEffect, useMemo} from 'react'
import {View} from 'react-native'
import {AtUri} from '@atproto/api'
import {Trans} from '@lingui/macro'
import {
  StackActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import type React from 'react'

import {type NavigationProp} from '#/lib/routes/types'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {useFeedSourceInfoQuery} from '#/state/queries/feed'
import {useProfileQuery} from '#/state/queries/profile'
import {useSetMinimalShellMode} from '#/state/shell'
import {FeedSourceCard} from '#/view/com/feeds/FeedSourceCard'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

type TabStatus = 'needs_your_help' | 'new' | 'rated_helpful'

const FEED_ITEMS = [
  {
    key: 'needs_your_help' as TabStatus,
    description: (
      <Trans>
        Notes on these posts need a more diverse range of feedback, and your
        point of view could help decide if they're helpful. This list refreshes
        regularly.
      </Trans>
    ),
  },
  {
    key: 'new' as TabStatus,
    description: (
      <Trans>
        Hot off the press! These are the most recently written notes.
        Contributors can rate these notes to determine their helpfulness.
      </Trans>
    ),
  },
  {
    key: 'rated_helpful' as TabStatus,
    description: (
      <Trans>
        Community Notes relies on contributors to rate each other's notes. Notes
        shown on these posts have been rated helpful by contributors of multiple
        perspectives.
      </Trans>
    ),
  },
]

export function CommunityNotesFeedsScreen() {
  const t = useTheme()
  const route = useRoute<any>()
  const navigation = useNavigation<NavigationProp>()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {data: config, isLoading: configLoading} = useCommunityNotesConfig()

  // Get the profile (with handle) for the feed generator
  const {data: feedGeneratorProfile} = useProfileQuery({
    did: config?.feedGeneratorDid,
  })

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  // Handle redirects for specific tabs - use replace to avoid back button issues
  useEffect(() => {
    const tab = route.params?.tab as TabStatus | undefined
    if (tab && feedGeneratorProfile?.handle) {
      const rkeyMap = {
        needs_your_help: 'needs_your_help',
        new: 'new',
        rated_helpful: 'rated_helpful',
      }

      const rkey = rkeyMap[tab]
      if (rkey) {
        // Use replace instead of navigate to avoid adding to history stack
        navigation.dispatch(
          StackActions.replace('ProfileFeed', {
            name: feedGeneratorProfile.handle,
            rkey,
          }),
        )
      }
    }
  }, [route.params?.tab, feedGeneratorProfile?.handle, navigation])

  const getFeedUri = useCallback(
    (tab: TabStatus): string | null => {
      // AT URIs must use DIDs, not handles
      if (!config?.feedGeneratorDid) return null

      const rkeyPatterns = {
        needs_your_help: 'needs_your_help',
        new: 'new',
        rated_helpful: 'rated_helpful',
      }

      const targetRkey = rkeyPatterns[tab]
      return `at://${config.feedGeneratorDid}/app.bsky.feed.generator/${targetRkey}`
    },
    [config?.feedGeneratorDid],
  )

  const feedUris = useMemo(() => {
    return FEED_ITEMS.map(item => getFeedUri(item.key)).filter(
      Boolean,
    ) as string[]
  }, [getFeedUri])

  // If we have a tab param, don't render anything - we're about to redirect
  const tab = route.params?.tab as TabStatus | undefined
  if (tab) {
    return (
      <Layout.Screen>
        <Layout.Content>
          <View style={[a.w_full, a.py_2xl, a.align_center]}>
            <Loader size="xl" />
          </View>
        </Layout.Content>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content align="left">
          <Layout.Header.TitleText>
            <Trans>Community Notes</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Content>
        {configLoading ? (
          <View style={[a.w_full, a.py_2xl, a.align_center]}>
            <Loader size="xl" />
          </View>
        ) : feedUris.length > 0 ? (
          FEED_ITEMS.map((item, index) => {
            const feedUri = feedUris[index]
            if (!feedUri) return null

            return (
              <FeedListItem
                key={item.key}
                feedUri={feedUri}
                description={item.description}
              />
            )
          })
        ) : (
          <View style={[a.flex_1, a.p_lg]}>
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>Community Notes feeds are currently unavailable.</Trans>
            </Text>
          </View>
        )}
      </Layout.Content>
    </Layout.Screen>
  )
}

function FeedListItem({
  feedUri,
  description,
}: {
  feedUri: string
  description: React.ReactNode
}) {
  const t = useTheme()
  const {data: feedInfo} = useFeedSourceInfoQuery({uri: feedUri})

  // Parse the feed URI to get link destination
  const linkProps = useMemo(() => {
    if (!feedInfo) return null
    const uri = new AtUri(feedInfo.uri)
    return {
      screen: 'ProfileFeed' as const,
      params: {
        name: feedInfo.creatorHandle,
        rkey: uri.rkey,
      },
    }
  }, [feedInfo])

  return (
    <View style={[a.border_b, t.atoms.border_contrast_low]}>
      <FeedSourceCard
        key={feedUri}
        feedUri={feedUri}
        showMinimalPlaceholder
        hideTopBorder={true}
      />
      {linkProps && feedInfo ? (
        <Link
          to={linkProps}
          label={`View ${feedInfo.displayName}`}
          style={[a.px_lg, a.pb_lg]}>
          <Text
            style={[a.text_md, t.atoms.text_contrast_medium, a.leading_snug]}>
            {description}
          </Text>
        </Link>
      ) : (
        <View style={[a.px_lg, a.pb_lg]}>
          <Text
            style={[a.text_md, t.atoms.text_contrast_medium, a.leading_snug]}>
            {description}
          </Text>
        </View>
      )}
    </View>
  )
}

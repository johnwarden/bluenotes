import {useCallback, useEffect, useMemo} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {
  StackActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import type React from 'react'

import {type NavigationProp} from '#/lib/routes/types'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {useProfileQuery} from '#/state/queries/profile'
import {useSetMinimalShellMode} from '#/state/shell'
import {FeedSourceCard} from '#/view/com/feeds/FeedSourceCard'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

type TabStatus = 'needs_your_help' | 'new' | 'rated_helpful'

const FEED_ITEMS = [
  {
    key: 'needs_your_help' as TabStatus,
    label: msg`Needs Your Help`,
    description: msg`Notes that need more ratings to become visible`,
  },
  {
    key: 'new' as TabStatus,
    label: msg`New`,
    description: msg`Recently added notes`,
  },
  {
    key: 'rated_helpful' as TabStatus,
    label: msg`Rated Helpful`,
    description: msg`Notes that have been rated as helpful by the community`,
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
        <SectionHeaderText>
          <Trans>Community Notes Feeds</Trans>
        </SectionHeaderText>

        {configLoading ? (
          <View style={[a.w_full, a.py_2xl, a.align_center]}>
            <Loader size="xl" />
          </View>
        ) : feedUris.length > 0 ? (
          FEED_ITEMS.map((item, index) => {
            const feedUri = feedUris[index]
            if (!feedUri) return null

            return <FeedListItem key={item.key} feedUri={feedUri} />
          })
        ) : (
          <View style={[a.flex_1, a.p_lg]}>
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>Community Notes feeds are currently unavailable.</Trans>
            </Text>
          </View>
        )}

        <View style={[a.px_lg, a.py_xl]}>
          <Text
            style={[a.text_sm, t.atoms.text_contrast_medium, a.leading_snug]}>
            <Trans>
              Community Notes are created and rated by contributors to provide
              helpful context on posts.
            </Trans>
          </Text>
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function FeedListItem({feedUri}: {feedUri: string}) {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.border_b, t.atoms.border_contrast_low]}>
      <View style={[a.flex_1]}>
        <FeedSourceCard
          key={feedUri}
          feedUri={feedUri}
          showMinimalPlaceholder
          hideTopBorder={true}
        />
      </View>
    </View>
  )
}

function SectionHeaderText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  // eslint-disable-next-line bsky-internal/avoid-unwrapped-text
  return (
    <View
      style={[
        a.flex_row,
        a.flex_1,
        a.px_lg,
        a.pt_2xl,
        a.pb_md,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <CommunityNotesIcon
        size="lg"
        style={{color: t.palette.primary_500, marginRight: 12}}
      />
      <Text style={[a.text_xl, a.font_bold, a.leading_snug]}>{children}</Text>
    </View>
  )
}

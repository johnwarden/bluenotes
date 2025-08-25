import {useCallback, useMemo, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation, useRoute} from '@react-navigation/native'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {type NavigationProp} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {usePostFeedQuery} from '#/state/queries/post-feed'
import {Pager, type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesContent} from '#/components/CommunityNotes/CommunityNotesContent'
import {CommunityNotesHeader} from '#/components/CommunityNotes/CommunityNotesHeader'
import {CommunityNotesRightPane} from '#/components/CommunityNotes/CommunityNotesRightPane'
import {CommunityNotesSidebar} from '#/components/CommunityNotes/CommunityNotesSidebar'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type TabStatus = 'needs_your_help' | 'new' | 'rated_helpful'

const TAB_ITEMS = [
  {key: 'needs_your_help' as TabStatus, label: 'Needs your help'},
  {key: 'new' as TabStatus, label: 'New'},
  {key: 'rated_helpful' as TabStatus, label: 'Rated helpful'},
]

export function CommunityNotesScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const route = useRoute()
  const _navigation = useNavigation<NavigationProp>()

  // Determine initial tab from URL
  const getTabFromPath = useCallback((path: string): TabStatus => {
    if (path.includes('/new')) return 'new'
    if (path.includes('/rated_helpful')) return 'rated_helpful'
    return 'needs_your_help' // default
  }, [])

  const currentPath =
    route.name === 'CommunityNotes' && isWeb ? window.location.pathname : ''
  const initialTab = getTabFromPath(currentPath)
  const initialIndex = TAB_ITEMS.findIndex(item => item.key === initialTab)

  const [selectedTab, setSelectedTab] = useState<TabStatus>(initialTab)
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, initialIndex))

  useSetTitle(_(msg`Community Notes`))

  // Load Community Notes configuration
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useCommunityNotesConfig()

  // Get feed URI based on selected tab and config
  const getFeedUri = useCallback(
    (tab: TabStatus) => {
      if (!config) return null

      // Standard rkey patterns for Community Notes feeds
      const rkeys = {
        needs_your_help: 'needs-help',
        new: 'new-notes',
        rated_helpful: 'helpful',
      }

      return `at://${config.feed_generator_did}/app.bsky.feed.generator/${rkeys[tab]}`
    },
    [config],
  )

  const feedUri = getFeedUri(selectedTab)
  const feedDescriptor = feedUri ? (`feedgen|${feedUri}` as const) : null

  const {
    data: feedData,
    isLoading,
    error,
  } = usePostFeedQuery(feedDescriptor || 'following', undefined, {
    enabled: !!feedDescriptor,
  })

  const feedPosts = useMemo(() => {
    if (!feedData?.pages) return []

    const allPosts = feedData.pages
      .flatMap(page => page.slices)
      .flatMap(slice => slice.items)
      .map(item => item.post)

    console.log('Community Notes Feed:', {
      totalPages: feedData.pages.length,
      totalPosts: allPosts.length,
      selectedTab,
      feedUri,
      configVersion: config?.version,
    })

    return allPosts
  }, [feedData, selectedTab, feedUri, config])

  const onPageSelected = useCallback((index: number) => {
    const newTab = TAB_ITEMS[index].key
    setSelectedIndex(index)
    setSelectedTab(newTab)

    // Update URL without navigation
    const paths = {
      needs_your_help: '/community-notes/needs_your_help',
      new: '/community-notes/new',
      rated_helpful: '/community-notes/rated_helpful',
    }

    if (isWeb) {
      window.history.replaceState(null, '', paths[newTab])
    }
  }, [])

  const onPressSelected = useCallback(() => {
    // Handle tap on already selected tab - scroll to top
  }, [])

  const renderTabBar = useCallback(
    (props: RenderTabBarFnProps) => {
      return (
        <CommunityNotesHeader
          {...props}
          onPressSelected={onPressSelected}
          tabs={TAB_ITEMS.map(item => item.label)}
        />
      )
    },
    [onPressSelected],
  )

  // Show loading state while config or initial feed data is loading
  if (configLoading || (isLoading && !feedData)) {
    return (
      <Layout.Screen>
        <Layout.Center>
          <View style={[a.flex_1, a.align_center, a.justify_center]}>
            <ActivityIndicator size="large" />
          </View>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  // Handle config errors - show unavailable message but still render the UI structure
  const isConfigUnavailable = configError || !config
  const isFeedUnavailable = error || !feedDescriptor

  // If both config and feeds are unavailable, show a general unavailable message
  if (isConfigUnavailable && isFeedUnavailable) {
    return (
      <Layout.Screen>
        <CommunityNotesSidebar />
        <Layout.Center>
          <View
            style={[
              a.flex_1,
              a.align_center,
              a.justify_center,
              a.gap_md,
              a.p_xl,
            ]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              <Trans>Community Notes Unavailable</Trans>
            </Text>
            <Text
              style={[a.text_md, t.atoms.text_contrast_medium, a.text_center]}>
              <Trans>
                The Community Notes service is currently unavailable. Please try
                again later.
              </Trans>
            </Text>
          </View>
        </Layout.Center>
        <CommunityNotesRightPane />
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <CommunityNotesSidebar />
      <Layout.Center>
        <Pager
          initialPage={selectedIndex}
          onPageSelected={onPageSelected}
          renderTabBar={renderTabBar}>
          {TAB_ITEMS.map(tab => (
            <CommunityNotesContent
              key={tab.key}
              status={tab.key}
              posts={isFeedUnavailable ? [] : feedPosts}
              isActive={selectedTab === tab.key}
              isUnavailable={!!isFeedUnavailable}
            />
          ))}
        </Pager>
      </Layout.Center>
      <CommunityNotesRightPane />
    </Layout.Screen>
  )
}

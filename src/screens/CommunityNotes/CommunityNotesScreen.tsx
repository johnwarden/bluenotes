import {useCallback, useEffect, useRef, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation, useRoute} from '@react-navigation/native'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {type NavigationProp} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {type FeedDescriptor} from '#/state/queries/post-feed'
import {
  Pager,
  type PagerRef,
  type RenderTabBarFnProps,
} from '#/view/com/pager/Pager'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesHeader} from '#/components/CommunityNotes/CommunityNotesHeader'
import {CommunityNotesRightPane} from '#/components/CommunityNotes/CommunityNotesRightPane'
import {CommunityNotesSidebar} from '#/components/CommunityNotes/CommunityNotesSidebar'
import {CommunityNotesTab} from '#/components/CommunityNotes/CommunityNotesTab'
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

  // Add pager ref and initialization logic (like Home screen)
  const pagerRef = useRef<PagerRef>(null)
  const lastPagerReportedIndexRef = useRef(selectedIndex)

  useEffect(() => {
    // Force pager to correct initial page on mount (iOS fix)
    pagerRef.current?.setPage(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    // Keep pager in sync with selected index (like Home screen)
    if (selectedIndex !== lastPagerReportedIndexRef.current) {
      lastPagerReportedIndexRef.current = selectedIndex
      pagerRef.current?.setPage(selectedIndex)
    }
  }, [selectedIndex])

  useSetTitle(_(msg`Community Notes`))

  // Load Community Notes configuration
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useCommunityNotesConfig()

  // Get feed descriptor based on selected tab and config
  const getFeedDescriptor = useCallback(
    (tab: TabStatus): FeedDescriptor | null => {
      if (!config?.feedGeneratorDid) return null

      // Map tab status to feed rkey patterns (from integration guide)
      const rkeyPatterns = {
        needs_your_help: 'needs_your_help',
        new: 'new',
        rated_helpful: 'rated_helpful',
      }

      // Construct feed URI directly using feedGeneratorDid
      const targetRkey = rkeyPatterns[tab]
      const feedUri = `at://${config.feedGeneratorDid}/app.bsky.feed.generator/${targetRkey}`
      return `feedgen|${feedUri}` as const
    },
    [config],
  )

  // Get community notes display mode based on tab status
  const getCommunityNotesDisplayMode = useCallback((tab: TabStatus) => {
    return tab === 'rated_helpful' ? 'rated_helpful' : 'needs_more_ratings'
  }, [])

  const onPageSelected = useCallback((index: number) => {
    const newTab = TAB_ITEMS[index].key
    lastPagerReportedIndexRef.current = index
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

  // Show loading state while config is loading
  if (configLoading) {
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
  const isConfigUnavailable = configError || !config || !config.feedGeneratorDid

  // If config is unavailable, show a general unavailable message
  if (isConfigUnavailable) {
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
      <Pager
        ref={pagerRef}
        initialPage={selectedIndex}
        onPageSelected={onPageSelected}
        renderTabBar={renderTabBar}>
        {TAB_ITEMS.map(tab => {
          const feedDescriptor = getFeedDescriptor(tab.key)
          const displayMode = getCommunityNotesDisplayMode(tab.key)

          return (
            <CommunityNotesTab
              key={tab.key}
              feedDescriptor={feedDescriptor}
              displayMode={displayMode}
              status={tab.key}
              isPageFocused={selectedTab === tab.key}
              testID={`communityNotes-${tab.key}`}
            />
          )
        })}
      </Pager>
      <CommunityNotesRightPane />
    </Layout.Screen>
  )
}

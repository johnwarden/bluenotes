import {useCallback, useMemo, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation, useRoute} from '@react-navigation/native'

import {hasProposedNotes} from '#/lib/community-notes/labels'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {type NavigationProp} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
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

  // For now, get posts from following feed and filter for those with proposed notes
  const {data: feedData, isLoading, error} = usePostFeedQuery('following')

  const postsWithProposedNotes = useMemo(() => {
    if (!feedData?.pages) return []

    const allPosts = feedData.pages
      .flatMap(page => page.slices)
      .flatMap(slice => slice.items)
      .map(item => item.post)

    const postsWithProposed = allPosts.filter(post => {
      const hasProposed = hasProposedNotes(post)
      if (post.labels && post.labels.length > 0) {
        console.log('Post with labels:', {
          uri: post.uri,
          labels: post.labels.map(l => ({val: l.val, src: l.src})),
          hasProposed,
        })
      }
      return hasProposed
    })

    // Debug logging
    console.log('Community Notes Debug:', {
      totalPages: feedData.pages.length,
      totalPosts: allPosts.length,
      postsWithProposed: postsWithProposed.length,
      postsWithAnyLabels: allPosts.filter(p => p.labels && p.labels.length > 0)
        .length,
    })

    return postsWithProposed
  }, [feedData])

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

  if (isLoading) {
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

  if (error) {
    return (
      <Layout.Screen>
        <Layout.Center>
          <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
            <Text style={[t.atoms.text_contrast_medium, a.text_center]}>
              <Trans>Failed to load Community Notes</Trans>
            </Text>
          </View>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return (
    <View style={[a.flex_1, a.flex_row, t.atoms.bg]}>
      {/* Left Sidebar */}
      <CommunityNotesSidebar />

      {/* Main Content */}
      <View
        style={[a.flex_1, {maxWidth: 600, marginLeft: 12, marginRight: 12}]}>
        <Pager
          initialPage={selectedIndex}
          onPageSelected={onPageSelected}
          renderTabBar={renderTabBar}>
          {TAB_ITEMS.map(tab => (
            <CommunityNotesContent
              key={tab.key}
              status={tab.key}
              posts={postsWithProposedNotes}
              isActive={selectedTab === tab.key}
            />
          ))}
        </Pager>
      </View>

      {/* Right Pane */}
      <CommunityNotesRightPane />
    </View>
  )
}

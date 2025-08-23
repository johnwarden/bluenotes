import {useCallback, useMemo, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {hasProposedNotes} from '#/lib/community-notes/labels'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {usePostFeedQuery} from '#/state/queries/post-feed'
import {Pager, type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesContent} from '#/components/CommunityNotes/CommunityNotesContent'
import {CommunityNotesHeader} from '#/components/CommunityNotes/CommunityNotesHeader'
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
  const [selectedTab, setSelectedTab] = useState<TabStatus>('needs_your_help')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useSetTitle(_(msg`Community Notes`))

  // For now, get posts from following feed and filter for those with proposed notes
  const {data: feedData, isLoading, error} = usePostFeedQuery('following')

  const postsWithProposedNotes = useMemo(() => {
    if (!feedData?.pages) return []

    return feedData.pages
      .flatMap((page: any) => page.feed)
      .filter((item: any) => hasProposedNotes(item.post))
      .map((item: any) => item.post)
  }, [feedData])

  const onPageSelected = useCallback((index: number) => {
    setSelectedIndex(index)
    setSelectedTab(TAB_ITEMS[index].key)
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
    <Layout.Screen>
      <View style={[a.flex_1, a.flex_row]}>
        {/* Left Sidebar */}
        <CommunityNotesSidebar />

        {/* Main Content */}
        <View style={[a.flex_1]}>
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
      </View>
    </Layout.Screen>
  )
}

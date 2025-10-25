import React from 'react'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {type FeedSourceInfo} from '#/state/queries/feed'
import {useSession} from '#/state/session'
import {type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {TabBar} from '../pager/TabBar'
import {HomeHeaderLayout} from './HomeHeaderLayout'

export function HomeHeader(
  props: RenderTabBarFnProps & {
    testID?: string
    onPressSelected: () => void
    feeds: FeedSourceInfo[]
  },
) {
  const {feeds, onSelect: onSelectProp} = props
  const {hasSession} = useSession()
  const navigation = useNavigation<NavigationProp>()

  const hasPinnedCustom = React.useMemo<boolean>(() => {
    if (!hasSession) return false
    return feeds.some(tab => {
      const isFollowing = tab.uri === 'following'
      return !isFollowing
    })
  }, [feeds, hasSession])

  const items = React.useMemo(() => {
    const pinnedNames = feeds.map(f => f.displayName)
    if (!hasSession) {
      // When logged out, add Feeds and Community Notes tabs
      return pinnedNames.concat(['Feeds ✨', 'Community Notes'])
    }
    if (!hasPinnedCustom) {
      return pinnedNames.concat('Feeds ✨')
    }
    return pinnedNames
  }, [hasPinnedCustom, feeds, hasSession])

  const onPressFeedsLink = React.useCallback(() => {
    navigation.navigate('Feeds')
  }, [navigation])

  const onPressCommunityNotes = React.useCallback(() => {
    // When logged out, navigate to the feeds list screen
    // When logged in, this won't be called since CN is in the left nav
    navigation.navigate('CommunityNotes', {})
  }, [navigation])

  const onSelect = React.useCallback(
    (index: number) => {
      if (!hasSession) {
        // When logged out: index 0 is Discover feed, 1 is Feeds, 2 is Community Notes
        if (index === 1) {
          onPressFeedsLink()
        } else if (index === 2) {
          onPressCommunityNotes()
        } else if (onSelectProp) {
          onSelectProp(index)
        }
      } else if (!hasPinnedCustom && index === items.length - 1) {
        onPressFeedsLink()
      } else if (onSelectProp) {
        onSelectProp(index)
      }
    },
    [
      items.length,
      onPressFeedsLink,
      onPressCommunityNotes,
      onSelectProp,
      hasPinnedCustom,
      hasSession,
    ],
  )

  return (
    <HomeHeaderLayout tabBarAnchor={props.tabBarAnchor}>
      <TabBar
        key={items.join(',')}
        onPressSelected={props.onPressSelected}
        selectedPage={props.selectedPage}
        onSelect={onSelect}
        testID={props.testID}
        items={items}
        dragProgress={props.dragProgress}
        dragState={props.dragState}
      />
    </HomeHeaderLayout>
  )
}

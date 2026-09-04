import React, {useCallback, useMemo} from 'react'
import {StyleSheet, View} from 'react-native'
import {useAnimatedRef} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {Trans} from '@lingui/react/macro'
import {useLingui} from '@lingui/react'
import {useIsFocused, useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {ComposeIcon2} from '#/lib/icons'
import {type NavigationProp} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {s} from '#/lib/styles'
import {isNative} from '#/platform/detection'
import {listenSoftReset} from '#/state/events'
import {FeedFeedbackProvider, useFeedFeedback} from '#/state/feed-feedback'
import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {
  isFeedSourceFeedInfo,
  useFeedSourceInfoQuery,
} from '#/state/queries/feed'
import {type FeedDescriptor} from '#/state/queries/post-feed'
import {RQKEY as FEED_RQKEY} from '#/state/queries/post-feed'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useProfileQuery} from '#/state/queries/profile'
import {useResolveUriQuery} from '#/state/queries/resolve-uri'
import {truncateAndInvalidate} from '#/state/queries/util'
import {useSession} from '#/state/session'
import {PostFeed} from '#/view/com/posts/PostFeed'
import {EmptyState} from '#/view/com/util/EmptyState'
import {FAB} from '#/view/com/util/fab/FAB'
import {Button} from '#/view/com/util/forms/Button'
import {LoadLatestBtn} from '#/view/com/util/load-latest/LoadLatestBtn'
import {PostFeedLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {Text} from '#/view/com/util/text/Text'
import {ProfileFeedHeader} from '#/screens/Profile/components/ProfileFeedHeader'
import {CommunityNotesRightPane} from '#/components/CommunityNotes/CommunityNotesRightPane'
import * as Layout from '#/components/Layout'
import {type CommunityNotesFeedTab} from './constants'

interface Props {
  tab: CommunityNotesFeedTab
}

export function CommunityNotesFeedScreen({tab}: Props) {
  const {data: config} = useCommunityNotesConfig()
  const {data: profile} = useProfileQuery({did: config?.feedGeneratorDid})

  // Use handle if available, fallback to DID
  const handleOrDid = profile?.handle || config?.feedGeneratorDid || ''
  const rkey = tab

  const pal = usePalette('default')
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()

  const uri = useMemo(
    () => makeRecordUri(handleOrDid, 'app.bsky.feed.generator', rkey),
    [rkey, handleOrDid],
  )
  const {error, data: resolvedUri} = useResolveUriQuery(uri)

  useSetTitle(
    profile?.displayName
      ? _(msg`${profile.displayName} (Community Notes)`)
      : _(msg`Community Notes`),
  )

  if (error) {
    return (
      <Layout.Screen testID="communityNotesFeedScreenError">
        <Layout.Content>
          <View style={[pal.view, pal.border, styles.notFoundContainer]}>
            <Text type="title-lg" style={[pal.text, s.mb10]}>
              <Trans>Could not load feed</Trans>
            </Text>
            <Text type="md" style={[pal.text, s.mb20]}>
              {error.toString()}
            </Text>

            <View style={{flexDirection: 'row'}}>
              <Button
                type="default"
                accessibilityLabel={_(msg`Go back`)}
                accessibilityHint={_(msg`Returns to Community Notes`)}
                onPress={() =>
                  navigation.replace('CommunityNotes', {tab: 'feeds'})
                }
                style={{flexShrink: 1}}>
                <Text type="button" style={pal.text}>
                  <Trans>Go Back</Trans>
                </Text>
              </Button>
            </View>
          </View>
        </Layout.Content>
        <CommunityNotesRightPane />
      </Layout.Screen>
    )
  }

  return resolvedUri ? (
    <Layout.Screen testID="communityNotesFeedScreen">
      <CommunityNotesFeedScreenInner uri={resolvedUri.uri} tab={tab} />
      <CommunityNotesRightPane />
    </Layout.Screen>
  ) : (
    <Layout.Screen>
      <PostFeedLoadingPlaceholder />
      <CommunityNotesRightPane />
    </Layout.Screen>
  )
}

function CommunityNotesFeedScreenInner({
  uri,
  tab,
}: {
  uri: string
  tab: CommunityNotesFeedTab
}) {
  const {hasSession} = useSession()
  const {data: preferences} = usePreferencesQuery()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const queryClient = useQueryClient()
  const isFocused = useIsFocused()

  const scrollElRef = useAnimatedRef<any>()
  const [hasNew, setHasNew] = React.useState(false)

  const {data: info} = useFeedSourceInfoQuery({uri})
  const feedFeedback = useFeedFeedback(info, hasSession)

  // Derive display mode from tab - only 'rated_helpful' tab shows rated helpful notes
  const displayMode =
    tab === 'rated_helpful' ? 'rated_helpful' : 'needs_more_ratings'

  // Custom back button for CN feeds - always go to feeds page
  const onPressBack = useCallback(() => {
    navigation.navigate('CommunityNotes', {tab: 'feeds'})
  }, [navigation])

  const feedDesc = useMemo<FeedDescriptor | null>(() => {
    if (!info) return null
    return info.feedDescriptor
  }, [info])

  const onScrollToTop = useCallback(() => {
    scrollElRef.current?.scrollToOffset({
      animated: isNative,
      offset: -1,
    })
    if (feedDesc) {
      truncateAndInvalidate(queryClient, FEED_RQKEY(feedDesc))
    }
    setHasNew(false)
  }, [scrollElRef, queryClient, feedDesc, setHasNew])

  const {openComposer} = useOpenComposer()
  const onPressCompose = useCallback(() => {
    openComposer({})
  }, [openComposer])

  React.useEffect(() => {
    if (!isFocused) {
      return
    }
    return listenSoftReset(onScrollToTop)
  }, [onScrollToTop, isFocused])

  const renderEmptyState = useCallback(() => {
    return <EmptyState icon="feed" message={_(msg`This feed is empty.`)} />
  }, [_])

  return (
    <>
      {info && isFeedSourceFeedInfo(info) && (
        <ProfileFeedHeader info={info} onPressBack={onPressBack} />
      )}

      {feedDesc && preferences && info ? (
        <FeedFeedbackProvider value={feedFeedback}>
          <PostFeed
            testID="communityNotesFeed"
            enabled={isFocused}
            feed={feedDesc}
            feedParams={{}}
            scrollElRef={scrollElRef}
            onHasNew={setHasNew}
            renderEmptyState={renderEmptyState}
            renderEndOfFeed={() => <FeedFooter />}
            headerOffset={0}
            communityNotesFeedMode={displayMode}
          />
        </FeedFeedbackProvider>
      ) : (
        <PostFeedLoadingPlaceholder />
      )}
      {hasNew && (
        <LoadLatestBtn
          onPress={onScrollToTop}
          label={_(msg`Load new posts`)}
          showIndicator
        />
      )}
      {hasSession && (
        <FAB
          testID="composeFAB"
          onPress={onPressCompose}
          icon={
            <ComposeIcon2
              strokeWidth={1.5}
              size={29}
              style={{color: 'white'}}
            />
          }
        />
      )}
    </>
  )
}

const FeedFooter = React.memo(function FeedFooterImpl() {
  return (
    <View style={styles.endOfFeed}>
      <Text type="sm" style={styles.endOfFeedText}>
        <Trans>End of feed</Trans>
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  notFoundContainer: {
    margin: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 6,
  },
  endOfFeed: {
    paddingTop: 20,
    paddingBottom: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endOfFeedText: {
    color: 'gray',
  },
})

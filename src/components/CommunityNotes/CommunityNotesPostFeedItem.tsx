import {memo, useCallback, useMemo, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  type AppBskyFeedPost,
  AppBskyFeedThreadgate,
  AtUri,
  type ModerationDecision,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useActorStatus} from '#/lib/actor-status'
import {type ReasonFeedSource} from '#/lib/api/feed/types'
import {COMMUNITY_NOTES_LABELS} from '#/lib/community-notes/labels'
import {MAX_POST_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {countLines} from '#/lib/strings/helpers'
import {
  POST_TOMBSTONE,
  type Shadow,
  usePostShadow,
} from '#/state/cache/post-shadow'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {useSession} from '#/state/session'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {Link} from '#/view/com/util/Link'
import {PostMeta} from '#/view/com/util/PostMeta'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNoteWidget} from '#/components/CommunityNotes/CommunityNoteWidget'
import {DebugLabels} from '#/components/CommunityNotes/DebugLabels'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon} from '#/components/icons/Chevron'
import {ContentHider} from '#/components/moderation/ContentHider'
import {LabelsOnMyPost} from '#/components/moderation/LabelsOnMe'
import {PostAlerts} from '#/components/moderation/PostAlerts'
import {type AppModerationCause} from '#/components/Pills'
import {Embed} from '#/components/Post/Embed'
import {PostEmbedViewContext} from '#/components/Post/Embed/types'
import {PostRepliedTo} from '#/components/Post/PostRepliedTo'
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {PostControls} from '#/components/PostControls'
import {RichText} from '#/components/RichText'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import {Text} from '#/components/Typography'
import * as bsky from '#/types/bsky'

interface CommunityNotesPostFeedItemProps {
  post: AppBskyFeedDefs.PostView
  record: AppBskyFeedPost.Record
  reason:
    | AppBskyFeedDefs.ReasonRepost
    | AppBskyFeedDefs.ReasonPin
    | ReasonFeedSource
    | {[k: string]: unknown; $type: string}
    | undefined
  moderation: ModerationDecision
  parentAuthor: AppBskyActorDefs.ProfileViewBasic | undefined
  showReplyTo: boolean
  isThreadChild?: boolean
  isThreadLastChild?: boolean
  isThreadParent?: boolean
  feedContext: string | undefined
  reqId: string | undefined
  hideTopBorder?: boolean
  isParentBlocked?: boolean
  isParentNotFound?: boolean
  rootPost: AppBskyFeedDefs.PostView
  onShowLess?: (interaction: AppBskyFeedDefs.Interaction) => void
  // Community Notes specific props
  displayMode: 'rated_helpful' | 'needs_more_ratings'
}

export function CommunityNotesPostFeedItem({
  post,
  record,
  reason,
  feedContext,
  reqId,
  moderation,
  parentAuthor,
  showReplyTo,
  isThreadChild,
  isThreadLastChild,
  isThreadParent,
  hideTopBorder,
  isParentBlocked,
  isParentNotFound,
  rootPost,
  onShowLess,
  displayMode,
}: CommunityNotesPostFeedItemProps): React.ReactNode {
  const postShadowed = usePostShadow(post)
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: record.text,
        facets: record.facets,
      }),
    [record],
  )
  if (postShadowed === POST_TOMBSTONE) {
    return null
  }
  if (richText && moderation) {
    return (
      <CommunityNotesFeedItemInner
        // Safeguard from clobbering per-post state below:
        key={postShadowed.uri}
        post={postShadowed}
        record={record}
        reason={reason}
        feedContext={feedContext}
        reqId={reqId}
        richText={richText}
        parentAuthor={parentAuthor}
        showReplyTo={showReplyTo}
        moderation={moderation}
        isThreadChild={isThreadChild}
        isThreadLastChild={isThreadLastChild}
        isThreadParent={isThreadParent}
        hideTopBorder={hideTopBorder}
        isParentBlocked={isParentBlocked}
        isParentNotFound={isParentNotFound}
        rootPost={rootPost}
        onShowLess={onShowLess}
        displayMode={displayMode}
      />
    )
  }
  return null
}

let CommunityNotesFeedItemInner = ({
  post,
  record,
  reason: _reason,
  feedContext,
  reqId,
  richText,
  moderation,
  parentAuthor,
  showReplyTo,
  isThreadChild: _isThreadChild,
  isThreadLastChild: _isThreadLastChild,
  isThreadParent,
  hideTopBorder,
  isParentBlocked,
  isParentNotFound,
  rootPost,
  onShowLess: _onShowLess,
  displayMode,
}: CommunityNotesPostFeedItemProps & {
  richText: RichTextAPI
  post: Shadow<AppBskyFeedDefs.PostView>
}): React.ReactNode => {
  const {openComposer} = useOpenComposer()
  const pal = usePalette('default')

  const [hover, setHover] = useState(false)

  const href = useMemo(() => {
    const urip = new AtUri(post.uri)
    return makeProfileLink(post.author, 'post', urip.rkey)
  }, [post.uri, post.author])
  const {sendInteraction} = useFeedFeedbackContext()

  const onPressReply = () => {
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#interactionReply',
      feedContext,
      reqId,
    })
    openComposer({
      replyTo: {
        uri: post.uri,
        cid: post.cid,
        text: record.text || '',
        author: post.author,
        embed: post.embed,
        moderation,
      },
    })
  }

  const onOpenAuthor = () => {
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#clickthroughAuthor',
      feedContext,
      reqId,
    })
  }

  const onOpenEmbed = () => {
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#clickthroughEmbed',
      feedContext,
      reqId,
    })
  }

  const onBeforePress = () => {
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#clickthroughItem',
      feedContext,
      reqId,
    })
  }

  // Create a version of the post without community notes labels
  // This prevents other community notes components from showing
  const postWithoutCommunityNotesLabels = useMemo(() => {
    return {
      ...post,
      labels:
        post.labels?.filter(
          label =>
            label.val !== COMMUNITY_NOTES_LABELS.NOTE &&
            label.val !== COMMUNITY_NOTES_LABELS.PROPOSED_NOTE,
        ) || [],
    }
  }, [post])

  const threadgateRecord = useMemo(() => {
    return bsky.validate(
      rootPost.threadgate?.record,
      AppBskyFeedThreadgate.validateRecord,
    )
      ? rootPost.threadgate?.record
      : undefined
  }, [rootPost])

  const live = useActorStatus(post.author.did)

  return (
    <Link
      testID={`feedItem-by-${post.author.handle}`}
      style={[
        styles.outer,
        pal.border,
        pal.view,
        {
          borderTopWidth: hideTopBorder ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
      href={href}
      noFeedback
      accessible={false}
      onBeforePress={onBeforePress}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}>
      <SubtleWebHover hover={hover} />
      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <PreviewableUserAvatar
            size={42}
            profile={post.author}
            moderation={moderation.ui('avatar')}
            type={post.author.associated?.labeler ? 'labeler' : 'user'}
            onBeforePress={onOpenAuthor}
            live={live}
          />
          {isThreadParent && (
            <View
              style={[
                styles.replyLine,
                {
                  flexGrow: 1,
                  backgroundColor: pal.colors.replyLine,
                  marginTop: live ? 8 : 4,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.layoutContent}>
          <PostMeta
            author={post.author}
            moderation={moderation}
            timestamp={post.indexedAt}
            postHref={href}
            onOpenAuthor={onOpenAuthor}
          />
          {showReplyTo &&
            (parentAuthor || isParentBlocked || isParentNotFound) && (
              <PostRepliedTo
                parentAuthor={parentAuthor}
                isParentBlocked={isParentBlocked}
                isParentNotFound={isParentNotFound}
              />
            )}
          <LabelsOnMyPost post={post} />
          <DebugLabels post={post} />
          <CommunityNotesPostContent
            moderation={moderation}
            richText={richText}
            postEmbed={post.embed}
            postAuthor={post.author}
            onOpenEmbed={onOpenEmbed}
            post={postWithoutCommunityNotesLabels}
            threadgateRecord={threadgateRecord}
            hover={hover}
            displayMode={displayMode}
          />
          <PostControls
            post={post}
            record={record}
            richText={richText}
            onPressReply={onPressReply}
            logContext="CommunityNotes"
          />
        </View>
      </View>
    </Link>
  )
}
CommunityNotesFeedItemInner = memo(CommunityNotesFeedItemInner)

let CommunityNotesPostContent = ({
  post,
  moderation,
  richText,
  postEmbed,
  postAuthor,
  onOpenEmbed,
  threadgateRecord,
  hover: _hover,
  displayMode,
}: {
  moderation: ModerationDecision
  richText: RichTextAPI
  postEmbed: AppBskyFeedDefs.PostView['embed']
  postAuthor: AppBskyFeedDefs.PostView['author']
  onOpenEmbed: () => void
  post: AppBskyFeedDefs.PostView
  threadgateRecord?: AppBskyFeedThreadgate.Record
  hover?: boolean
  displayMode: 'rated_helpful' | 'needs_more_ratings'
}): React.ReactNode => {
  const {currentAccount} = useSession()
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText.text) >= MAX_POST_LINES,
  )
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
    isThreadAuthor: post.author.did === currentAccount?.did,
  })

  const additionalPostAlerts: AppModerationCause[] = useMemo(() => {
    const alerts: AppModerationCause[] = []
    if (threadgateHiddenReplies.size > 0) {
      alerts.push({
        type: 'reply-hidden',
        source: {type: 'user', did: post.author.did},
        priority: 6,
      })
    }
    return alerts
  }, [post.author.did, threadgateHiddenReplies])

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  return (
    <ContentHider
      testID="contentHider-post"
      modui={moderation.ui('contentList')}
      ignoreMute
      childContainerStyle={styles.contentHiderChild}>
      <PostAlerts
        modui={moderation.ui('contentList')}
        style={[a.py_2xs]}
        additionalCauses={additionalPostAlerts}
      />
      {richText.text ? (
        <>
          <RichText
            enableTags
            testID="postText"
            value={richText}
            numberOfLines={limitLines ? MAX_POST_LINES : undefined}
            style={[a.flex_1, a.text_md]}
            authorHandle={postAuthor.handle}
            shouldProxyLinks={true}
          />
          {limitLines && (
            <ShowMoreTextButton style={[a.text_md]} onPress={onPressShowMore} />
          )}
        </>
      ) : undefined}
      {postEmbed ? (
        <View style={[a.pb_xs]}>
          <Embed
            embed={postEmbed}
            moderation={moderation}
            onOpen={onOpenEmbed}
            viewContext={PostEmbedViewContext.Feed}
          />
        </View>
      ) : null}

      {/* Always show CommunityNoteWidget with the specified display mode */}
      <CommunityNoteWidget
        post={post}
        displayMode={displayMode}
        showRatingPrompt={true}
        showDisclaimer={displayMode === 'rated_helpful'}
      />

      {/* Add "See all notes on this post" link */}
      <CommunityNotesSeeAllLink post={post} />
    </ContentHider>
  )
}
CommunityNotesPostContent = memo(CommunityNotesPostContent)

function CommunityNotesSeeAllLink({post}: {post: AppBskyFeedDefs.PostView}) {
  const {_} = useLingui()
  const t = useTheme()

  return (
    <View style={[a.mt_md]}>
      <Link
        to={`/profile/${post.author.handle}/post/${post.uri
          .split('/')
          .pop()}/community-notes`}
        label={_(msg`See all notes on this post`)}
        style={[a.flex_row, a.align_center, a.justify_between, a.py_md]}>
        <Text style={[a.text_md, {color: t.palette.primary_500}]}>
          <Trans>See all notes on this post</Trans>
        </Text>
        <ChevronRightIcon size="sm" style={[{color: t.palette.primary_500}]} />
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingLeft: 10,
    paddingRight: 15,
    cursor: 'pointer',
  },
  layout: {
    flexDirection: 'row',
    gap: 10,
  },
  layoutAvi: {
    paddingLeft: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  layoutContent: {
    flex: 1,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  replyLine: {
    width: 2,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  contentHiderChild: {
    marginTop: 6,
  },
})

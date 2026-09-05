import {useCallback, useMemo, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {AtUri} from '@atproto/syntax'
import {moderatePost, type ModerationDecision} from '@bsky/sdk/moderation'
import {RichText as RichTextAPI} from '@bsky/sdk/richtext'
import {useQueryClient} from '@tanstack/react-query'

import {MAX_POST_LINES} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {countLines} from '#/lib/strings/helpers'
import {colors} from '#/lib/styles'
import {
  POST_TOMBSTONE,
  type Shadow,
  usePostShadow,
} from '#/state/cache/post-shadow'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {unstableCacheProfileView} from '#/state/queries/profile'
import {Link} from '#/view/com/util/Link'
import {PostMeta} from '#/view/com/util/PostMeta'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a} from '#/alf'
import {DebugLabels} from '#/components/CommunityNotes/DebugLabels'
import {ContentHider} from '#/components/moderation/ContentHider'
import {PostAlerts} from '#/components/moderation/PostAlerts'
import {Embed, PostEmbedViewContext} from '#/components/Post/Embed'
import {PostRepliedTo} from '#/components/Post/PostRepliedTo'
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {RichText} from '#/components/RichText'
import {SubtleHover} from '#/components/SubtleHover'
import {app} from '#/lexicons'
import * as bsky from '#/types/bsky'

interface PostContentProps {
  post: app.bsky.feed.defs.PostView
  showReplyLine?: boolean
}

export function PostContent({post, showReplyLine}: PostContentProps) {
  const moderationOpts = useModerationOpts()
  const record = useMemo<app.bsky.feed.post.Main | undefined>(
    () =>
      bsky.matches(app.bsky.feed.post, post.record) ? post.record : undefined,
    [post],
  )
  const postShadowed = usePostShadow(post)
  const richText = useMemo(
    () =>
      record
        ? new RichTextAPI({
            text: record.text,
            facets: record.facets,
          })
        : undefined,
    [record],
  )
  const moderation = useMemo(
    () => (moderationOpts ? moderatePost(post, moderationOpts) : undefined),
    [moderationOpts, post],
  )

  if (postShadowed === POST_TOMBSTONE) {
    return null
  }
  if (record && richText && moderation) {
    return (
      <PostContentInner
        post={postShadowed}
        record={record}
        richText={richText}
        moderation={moderation}
        showReplyLine={showReplyLine}
      />
    )
  }
  return null
}

function PostContentInner({
  post,
  record,
  richText,
  moderation,
  showReplyLine,
}: {
  post: Shadow<app.bsky.feed.defs.PostView>
  record: app.bsky.feed.post.Main
  richText: RichTextAPI
  moderation: ModerationDecision
  showReplyLine?: boolean
}) {
  const queryClient = useQueryClient()
  const pal = usePalette('default')
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_POST_LINES,
  )
  const itemUrip = new AtUri(post.uri)
  const itemHref = makeProfileLink(post.author, 'post', itemUrip.rkey)
  let replyAuthorDid = ''
  if (record.reply) {
    const urip = new AtUri(record.reply.parent?.uri || record.reply.root.uri)
    replyAuthorDid = urip.hostname
  }

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  const onBeforePress = useCallback(() => {
    unstableCacheProfileView(queryClient, post.author)
  }, [queryClient, post.author])

  const [hover, setHover] = useState(false)
  return (
    <Link
      href={itemHref}
      style={[styles.outer, pal.border]}
      onBeforePress={onBeforePress}
      onPointerEnter={() => {
        setHover(true)
      }}
      onPointerLeave={() => {
        setHover(false)
      }}>
      <SubtleHover hover={hover} />
      {showReplyLine && <View style={styles.replyLine} />}
      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <PreviewableUserAvatar
            size={42}
            profile={post.author}
            moderation={moderation.ui('avatar')}
            type={post.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
        <View style={styles.layoutContent}>
          <PostMeta
            author={post.author}
            moderation={moderation}
            timestamp={post.indexedAt}
            postHref={itemHref}
          />
          {replyAuthorDid !== '' && (
            <PostRepliedTo parentAuthor={replyAuthorDid} />
          )}
          <DebugLabels post={post} />
          <ContentHider
            modui={moderation.ui('contentView')}
            style={styles.contentHider}
            childContainerStyle={styles.contentHiderChild}>
            <PostAlerts
              modui={moderation.ui('contentView')}
              style={[a.py_xs]}
            />
            {richText.text ? (
              <View>
                <RichText
                  enableTags
                  testID="postText"
                  value={richText}
                  numberOfLines={limitLines ? MAX_POST_LINES : undefined}
                  style={[a.flex_1, a.text_md]}
                  authorHandle={post.author.handle}
                  shouldProxyLinks={true}
                />
                {limitLines && (
                  <ShowMoreTextButton
                    style={[a.text_md]}
                    onPress={onPressShowMore}
                  />
                )}
              </View>
            ) : undefined}
            {post.embed ? (
              <Embed
                embed={post.embed}
                moderation={moderation}
                viewContext={PostEmbedViewContext.Feed}
              />
            ) : null}
          </ContentHider>
          {/* NOTE: No PostControls here - that's the key difference! */}
        </View>
      </View>
    </Link>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingTop: 10,
    paddingRight: 15,
    paddingBottom: 5,
    paddingLeft: 10,
    // @ts-ignore web only -prf
    cursor: 'pointer',
  },
  layout: {
    flexDirection: 'row',
    gap: 10,
  },
  layoutAvi: {
    paddingLeft: 8,
  },
  layoutContent: {
    flex: 1,
  },
  alert: {
    marginBottom: 6,
  },
  replyLine: {
    position: 'absolute',
    left: 36,
    top: 70,
    bottom: 0,
    borderLeftWidth: 2,
    borderLeftColor: colors.gray2,
  },
  contentHider: {
    marginBottom: 2,
  },
  contentHiderChild: {
    marginTop: 6,
  },
})

import React, {useCallback, useMemo} from 'react'
import {View} from 'react-native'
import {
  type AppBskyFeedDefs,
  AppBskyFeedPost,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {COMMUNITY_NOTES_LABELS} from '#/lib/community-notes/labels'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNoteWidget} from '#/components/CommunityNotes/CommunityNoteWidget'
import {PostContent} from '#/components/CommunityNotes/PostContent'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon} from '#/components/icons/Chevron'
import {Link} from '#/components/Link'
import {PostControls} from '#/components/PostControls'
import {Text} from '#/components/Typography'
import * as bsky from '#/types/bsky'

interface PostWithNoteProps {
  post: AppBskyFeedDefs.PostView
  status: 'needs_your_help' | 'new' | 'rated_helpful'
}

export function PostWithNote({post, status}: PostWithNoteProps) {
  const t = useTheme()
  const {_} = useLingui()
  const {openComposer} = useOpenComposer()

  // Create a version of the post without community notes labels
  // This prevents other community notes components from showing
  const postWithoutCommunityNotesLabels = React.useMemo(() => {
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

  // Extract record and richText for PostControls (same logic as Post component)
  const record = useMemo<AppBskyFeedPost.Record | undefined>(
    () =>
      bsky.validate(post.record, AppBskyFeedPost.validateRecord)
        ? post.record
        : undefined,
    [post],
  )
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

  // Reply handler for PostControls
  const onPressReply = useCallback(() => {
    if (!record) return
    openComposer({
      replyTo: {
        uri: post.uri,
        cid: post.cid,
        text: record.text,
        author: post.author,
        embed: post.embed,
      },
    })
  }, [openComposer, post, record])

  // Don't render if we don't have the necessary data
  if (!record || !richText) {
    return null
  }

  return (
    <View style={[a.border_b, t.atoms.border_contrast_low]}>
      {/* Post Content (without controls) */}
      <View style={[a.p_lg, a.pb_md]}>
        <PostContent post={postWithoutCommunityNotesLabels} />
      </View>

      {/* Community Notes Widget - different modes based on status */}
      <View style={[a.mx_lg, a.mb_lg]}>
        <CommunityNoteWidget
          post={post}
          displayMode={
            status === 'rated_helpful' ? 'rated_helpful' : 'needs_more_ratings'
          }
          showRatingPrompt={true}
          showDisclaimer={status === 'rated_helpful'}
        />
      </View>

      {/* Post Controls - positioned after community notes */}
      <View style={[a.px_lg, a.pb_md]}>
        <PostControls
          post={post}
          record={record}
          richText={richText}
          onPressReply={onPressReply}
          logContext="Post"
        />
      </View>

      {/* "See all notes on this post" prompt - appears for all statuses */}
      <View style={[a.mx_lg, a.mb_lg]}>
        <Link
          to={`/profile/${post.author.handle}/post/${post.uri
            .split('/')
            .pop()}/community-notes`}
          label={_(msg`See all notes on this post`)}
          style={[a.flex_row, a.align_center, a.justify_between, a.py_md]}>
          <Text style={[a.text_md, {color: t.palette.primary_500}]}>
            <Trans>See all notes on this post</Trans>
          </Text>
          <ChevronRightIcon
            size="sm"
            style={[{color: t.palette.primary_500}]}
          />
        </Link>
      </View>
    </View>
  )
}

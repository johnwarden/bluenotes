import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a} from '#/alf'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {CommunityNotes as CommunityIcon} from '#/components/icons/CommunityNotes'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

function _RateCommunityNotesPromptContent() {
  return (
    <View style={[a.flex_row, a.align_center, {gap: 12}]}>
      <CommunityIcon width={18.5} height={14.06} style={{color: '#0085ff'}} />
      <Text style={[a.font_bold, {color: '#000000', fontSize: 15}]}>
        <Trans>Rate proposed Community Notes</Trans>
      </Text>
    </View>
  )
}

export function RateCommunityNotesPromptDefault({
  post,
}: {
  post: AppBskyFeedDefs.PostView
}) {
  const {_} = useLingui()

  return (
    <Link
      to={`/profile/${post.author.handle}/post/${post.uri
        .split('/')
        .pop()}/community-notes`}
      label={_(msg`Rate proposed community notes`)}
      style={[
        a.mt_md,
        a.rounded_lg,
        a.border,
        {
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: '#f0f0f0',
          borderColor: '#e0e0e0',
        },
      ]}>
      <View
        style={[
          a.w_full,
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_md,
        ]}>
        <_RateCommunityNotesPromptContent />
        <ArrowRightIcon size="md" style={{color: '#000000'}} />
      </View>
    </Link>
  )
}

export function RateCommunityNotesPromptEmbedded({
  post,
}: {
  post: AppBskyFeedDefs.PostView
}) {
  const {_} = useLingui()

  return (
    <Link
      to={`/profile/${post.author.handle}/post/${post.uri
        .split('/')
        .pop()}/community-notes`}
      label={_(msg`Rate proposed community notes`)}
      style={[
        {
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: '#f0f0f0',
        },
      ]}>
      <View
        style={[
          a.w_full,
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_md,
        ]}>
        <_RateCommunityNotesPromptContent />
        <ArrowRightIcon size="md" style={{color: '#000000'}} />
      </View>
    </Link>
  )
}

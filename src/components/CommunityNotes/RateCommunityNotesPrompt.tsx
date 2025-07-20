import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {CommunityNotes as CommunityIcon} from '#/components/icons/CommunityNotes'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

function _RateCommunityNotesPromptContent() {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.align_center, a.gap_md]}>
      <CommunityIcon size="sm" style={{color: t.palette.primary_500}} />
      <Text style={[a.font_bold, a.text_md, t.atoms.text]}>
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
  const t = useTheme()

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
        a.py_md,
        a.px_lg,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
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
        <ArrowRightIcon size="md" style={t.atoms.text} />
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
  const t = useTheme()

  return (
    <Link
      to={`/profile/${post.author.handle}/post/${post.uri
        .split('/')
        .pop()}/community-notes`}
      label={_(msg`Rate proposed community notes`)}
      style={[a.py_md, a.px_lg, t.atoms.bg_contrast_25]}>
      <View
        style={[
          a.w_full,
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_md,
        ]}>
        <_RateCommunityNotesPromptContent />
        <ArrowRightIcon size="md" style={t.atoms.text} />
      </View>
    </Link>
  )
}

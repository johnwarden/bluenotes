import {useState} from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {hasHelpfulNotes, hasProposedNotes} from '#/lib/community-notes/labels'
import {atoms as a, useTheme} from '#/alf'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {CommunityNotes as CommunityIcon} from '#/components/icons/CommunityNotes'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

function _RateProposedNotesPromptContent() {
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

export function RateProposedNotesPromptDefault({
  post,
  parentHover = false,
}: {
  post: AppBskyFeedDefs.PostView
  parentHover?: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [promptHover, setPromptHover] = useState(false)

  // Only show prompt if post has proposed notes that need rating
  if (!hasProposedNotes(post) || hasHelpfulNotes(post)) {
    return null
  }

  // Common overlay positioning
  const overlayBase = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    pointerEvents: 'none' as const,
  }

  const baseBackgroundStyle = {
    ...overlayBase,
    opacity: 0.3,
    backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
  }

  const hoverOverlayStyle = {
    ...overlayBase,
    backgroundColor: 'black',
    opacity: parentHover ? 0.03 : 0.0,
  }

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
        a.relative,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}
      onPointerEnter={() => setPromptHover(true)}
      onPointerLeave={() => setPromptHover(false)}
      onPress={e => {
        // Stop propagation to prevent post navigation
        e.stopPropagation()
      }}>
      {/* Base background */}
      <View style={baseBackgroundStyle} />
      {/* Hover overlay */}
      <View style={hoverOverlayStyle} />
      <View
        style={[
          a.w_full,
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_md,
        ]}>
        <_RateProposedNotesPromptContent />
        <ArrowRightIcon size="md" style={t.atoms.text} />
      </View>
    </Link>
  )
}

export function RateProposedNotesPromptEmbedded({
  post,
  parentHover = false,
}: {
  post: AppBskyFeedDefs.PostView
  parentHover?: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [promptHover, setPromptHover] = useState(false)

  // Only show prompt if post has proposed notes that need rating
  if (!hasProposedNotes(post)) {
    return null
  }

  // Common overlay positioning
  const overlayBase = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    pointerEvents: 'none' as const,
  }

  const baseBackgroundStyle = {
    ...overlayBase,
    opacity: 0.3,
    backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
  }

  const hoverOverlayStyle = {
    ...overlayBase,
    backgroundColor: 'black',
    opacity: parentHover ? 0.03 : 0.0,
  }

  return (
    <Link
      to={`/profile/${post.author.handle}/post/${post.uri
        .split('/')
        .pop()}/community-notes`}
      label={_(msg`Rate proposed community notes`)}
      style={[a.py_md, a.px_lg, a.relative, t.atoms.bg]}
      onPointerEnter={() => setPromptHover(true)}
      onPointerLeave={() => setPromptHover(false)}
      onPress={e => {
        // Stop propagation to prevent post navigation
        e.stopPropagation()
      }}>
      {/* Base background */}
      <View style={baseBackgroundStyle} />
      {/* Hover overlay */}
      <View style={hoverOverlayStyle} />
      <View
        style={[
          a.w_full,
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_md,
        ]}>
        <_RateProposedNotesPromptContent />
        <ArrowRightIcon size="md" style={t.atoms.text} />
      </View>
    </Link>
  )
}

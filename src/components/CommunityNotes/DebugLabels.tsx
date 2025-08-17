import {useState} from 'react'
import {Pressable, View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'

import {
  getCommunityNotesLabelerDid,
  getCommunityNotesLabels,
  hasHelpfulNotes,
  hasProposedNotes,
} from '#/lib/community-notes/labels'
import {atoms as a, useTheme} from '#/alf'
import {ChevronDown_Stroke2_Corner0_Rounded as ChevronDownIcon} from '#/components/icons/Chevron'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon} from '#/components/icons/Chevron'
import {Text} from '#/components/Typography'

interface DebugLabelsProps {
  post: AppBskyFeedDefs.PostView
}

export function DebugLabels({post}: DebugLabelsProps) {
  const t = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show in development
  if (!__DEV__) {
    return null
  }

  const allLabels = post.labels || []
  const communityNotesLabels = getCommunityNotesLabels(post)
  const hasHelpful = hasHelpfulNotes(post)
  const hasProposed = hasProposedNotes(post)
  const currentLabelerDid = getCommunityNotesLabelerDid()

  // Only show if there are any labels to debug
  if (allLabels.length === 0 && communityNotesLabels.length === 0) {
    return null
  }

  return (
    <View
      style={[
        a.mt_sm,
        a.rounded_sm,
        {
          backgroundColor: t.palette.contrast_50,
          borderWidth: 1,
          borderColor: t.palette.contrast_200,
        },
      ]}>
      {/* Collapsible header */}
      <Pressable
        accessibilityRole="button"
        style={[a.p_sm, a.flex_row, a.align_center, a.gap_xs]}
        onPress={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? (
          <ChevronDownIcon size="xs" style={t.atoms.text} />
        ) : (
          <ChevronRightIcon size="xs" style={t.atoms.text} />
        )}
        <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
          🐛 DEBUG: Labels for {post.uri.split('/').pop()}
        </Text>
      </Pressable>

      {/* Collapsible content */}
      {isExpanded && (
        <View style={[a.px_sm, a.pb_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
            Current Labeler DID: {currentLabelerDid}
          </Text>

          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            Total labels: {allLabels.length}
          </Text>

          {allLabels.length > 0 && (
            <View style={[a.mt_xs]}>
              <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                All Labels:
              </Text>
              {allLabels.map((label, index) => (
                <Text
                  key={index}
                  style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  • {label.val} (src: {label.src})
                </Text>
              ))}
            </View>
          )}

          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
            Community Notes labels: {communityNotesLabels.length}
          </Text>

          {communityNotesLabels.length > 0 && (
            <View style={[a.mt_xs]}>
              <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                Community Notes Labels:
              </Text>
              {communityNotesLabels.map((label, index) => (
                <Text
                  key={index}
                  style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  • {label.val} (src: {label.src})
                </Text>
              ))}
            </View>
          )}

          <View style={[a.mt_xs]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              hasHelpfulNotes: {hasHelpful ? '✅' : '❌'}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              hasProposedNotes: {hasProposed ? '✅' : '❌'}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

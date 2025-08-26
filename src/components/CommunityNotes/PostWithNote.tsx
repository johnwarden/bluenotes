import React from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {Trans} from '@lingui/macro'

import {useProposalsQuery} from '#/state/queries/community-notes'
import {Post} from '#/view/com/post/Post'
import {atoms as a, useTheme} from '#/alf'
import {RateNoteForm} from '#/components/CommunityNotes/RateNoteForm'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import {Text} from '#/components/Typography'

interface PostWithNoteProps {
  post: AppBskyFeedDefs.PostView
  status: 'needs_your_help' | 'new' | 'rated_helpful'
}

export function PostWithNote({post, status}: PostWithNoteProps) {
  const t = useTheme()

  // Map the status to the appropriate query parameter
  const queryStatus =
    status === 'rated_helpful' ? 'rated_helpful' : 'needs_more_ratings'
  const {data: notes, isLoading} = useProposalsQuery(post.uri, queryStatus)

  // Create a version of the post without community notes labels
  // This prevents other community notes components from showing
  const postWithoutCommunityNotesLabels = React.useMemo(() => {
    return {
      ...post,
      labels:
        post.labels?.filter(
          label =>
            label.val !== 'needs-context' &&
            label.val !== 'proposed-label:needs-context',
        ) || [],
    }
  }, [post])

  return (
    <View style={[a.border_b, t.atoms.border_contrast_low]}>
      {/* Post */}
      <View style={[a.p_lg, a.pb_md]}>
        <Post post={postWithoutCommunityNotesLabels} />
      </View>

      {/* Rate Proposed Community Notes Section */}
      {notes && notes.length > 0 && (
        <View style={[a.mx_lg, a.mb_lg]}>
          {/* Header */}
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.gap_sm,
              a.py_md,
              a.px_lg,
              a.rounded_lg,
              t.atoms.bg_contrast_25,
            ]}>
            <CommunityNotesIcon
              size="sm"
              style={{color: t.palette.primary_500}}
            />
            <Text style={[a.font_bold, a.text_md, t.atoms.text]}>
              <Trans>Rate proposed Community Notes</Trans>
            </Text>
          </View>

          {/* Notes */}
          <View
            style={[
              a.border,
              a.border_t_0,
              a.rounded_lg,
              t.atoms.bg,
              t.atoms.border_contrast_low,
            ]}>
            {isLoading ? (
              <View style={[a.p_lg, a.align_center]}>
                <Text style={[t.atoms.text_contrast_medium]}>
                  <Trans>Loading notes...</Trans>
                </Text>
              </View>
            ) : (
              notes.map((note, index) => (
                <View key={note.uri}>
                  {index > 0 && (
                    <View style={[a.border_t, t.atoms.border_contrast_low]} />
                  )}
                  <RateNoteForm note={note} />
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  )
}

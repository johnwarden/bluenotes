import {useState} from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useRoute} from '@react-navigation/native'

import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {useNotesQuery} from '#/state/queries/community-notes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {NoteDetailsDialog} from '#/components/CommunityNotes/NoteDetailsDialog'
import * as Dialog from '#/components/Dialog'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

interface HelpfulCommunityNoteProps {
  post: AppBskyFeedDefs.PostView
}

export function HelpfulCommunityNote({post}: HelpfulCommunityNoteProps) {
  const t = useTheme()
  const {_} = useLingui()
  const route = useRoute()
  const [showAllNotes, setShowAllNotes] = useState(false)
  const noteDetailsControl = Dialog.useDialogControl()
  const {data: notes, isLoading, error} = useNotesQuery(post.uri)

  // Don't show helpful notes on the community notes rating page
  if (route.name === 'CommunityNotesRating') {
    return null
  }

  // Don't render if no notes or still loading
  if (isLoading || error || !notes || notes.length === 0) {
    return null
  }

  // Filter to only helpful notes (those that would have 'note' labels)
  // In a real implementation, this would be filtered by the API
  const helpfulNotes = notes.filter(note => note.status === 'rated_helpful')

  if (helpfulNotes.length === 0) {
    return null
  }

  // Show the most helpful note by default
  const primaryNote = helpfulNotes[0]
  const hasMultipleNotes = helpfulNotes.length > 1
  const notesToShow = showAllNotes ? helpfulNotes : [primaryNote]

  return (
    <>
      <View
        style={[
          a.mt_md,
          a.rounded_lg,
          a.border,
          t.atoms.bg, // Use theme background (works in dark mode)
          t.atoms.border_contrast_low,
        ]}>
        {/* Header with RateCommunityNotesPrompt background color */}
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_sm,
            a.p_md, // Reduced from a.p_lg
            a.rounded_t_lg,
            t.atoms.bg_contrast_25, // Same as RateCommunityNotesPrompt
          ]}>
          <CommunityNotesIcon
            size="sm"
            style={{color: t.palette.primary_500}}
          />
          <Text style={[a.font_bold, a.text_md, t.atoms.text, a.flex_1]}>
            <Trans>
              Readers added context they thought people might want to know
            </Trans>
          </Text>
        </View>

        {/* Content area with padding - lighter background */}
        <View style={[a.p_md, a.pt_sm]}>
          {/* Notes */}
          {notesToShow.map((note, index) => (
            <NoteContent
              key={note.uri}
              note={note}
              isFirst={index === 0}
              onShowDetails={() => noteDetailsControl.open()}
            />
          ))}

          {/* Multiple notes controls */}
          {hasMultipleNotes && (
            <View style={[a.flex_row, a.gap_md, a.mt_md]}>
              {!showAllNotes ? (
                <Button
                  variant="ghost"
                  size="small"
                  label={_(
                    msg`Show ${helpfulNotes.length - 1} more note${helpfulNotes.length - 1 === 1 ? '' : 's'}`,
                  )}
                  onPress={() => setShowAllNotes(true)}>
                  <ButtonText style={[{color: t.palette.primary_500}]}>
                    <Trans>
                      Show {helpfulNotes.length - 1} more note
                      {helpfulNotes.length - 1 === 1 ? '' : 's'}
                    </Trans>
                  </ButtonText>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="small"
                  label={_(msg`Show less`)}
                  onPress={() => setShowAllNotes(false)}>
                  <ButtonText style={[{color: t.palette.primary_500}]}>
                    <Trans>Show less</Trans>
                  </ButtonText>
                </Button>
              )}
            </View>
          )}
        </View>

        {/* Horizontal line that goes edge-to-edge */}
        <View style={[a.border_t, t.atoms.border_contrast_low]} />

        {/* Helpfulness rating section */}
        <View style={[a.p_md, a.flex_row, a.align_center, a.justify_between]}>
          <Text style={[a.text_md, t.atoms.text]}>
            <Trans>Do you find this helpful?</Trans>
          </Text>
          <Link
            to={`/profile/${post.author.handle}/post/${post.uri
              .split('/')
              .pop()}/community-notes`}
            label={_(msg`Rate this note`)}
            style={[
              {
                borderWidth: 1,
                borderColor: t.palette.contrast_200,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}>
            <Text
              style={[
                a.text_md, // Bigger text
                a.font_bold, // Bolder
                t.atoms.text, // Black text (adapts to dark mode)
              ]}>
              <Trans>Rate it</Trans>
            </Text>
          </Link>
        </View>

        {/* Note details dialog */}
        <NoteDetailsDialog control={noteDetailsControl} note={primaryNote} />
      </View>

      {/* Disclaimer outside the box */}
      <View style={[a.mt_md]}>
        <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
          <Trans>
            Context is written by people who use X, and appears when rated
            helpful by others.
          </Trans>{' '}
          <Text style={[a.text_md, {color: t.palette.primary_500}]}>
            <Trans>Find out more.</Trans>
          </Text>
        </Text>
      </View>
    </>
  )
}

interface NoteContentProps {
  note: CommunityNote
  isFirst: boolean
  onShowDetails: () => void
}

function NoteContent({
  note,
  isFirst,
  onShowDetails: _onShowDetails,
}: NoteContentProps) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        !isFirst && a.mt_lg,
        !isFirst && a.pt_lg,
        !isFirst && a.border_t,
        !isFirst && t.atoms.border_contrast_low,
      ]}>
      {/* Note text */}
      <View style={[a.mb_sm]}>
        <Text style={[a.text_md, t.atoms.text, {lineHeight: 20}]}>
          {note.text}
        </Text>
      </View>

      {/* X doesn't show author or details in the main display */}
    </View>
  )
}

import {useState} from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {hasHelpfulNotes} from '#/lib/community-notes/labels'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {useNotesQuery} from '#/state/queries/community-notes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {NoteDetailsDialog} from '#/components/CommunityNotes/NoteDetailsDialog'
import * as Dialog from '#/components/Dialog'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

interface RatedHelpfulNoteProps {
  post: AppBskyFeedDefs.PostView
}

export function RatedHelpfulNote({post}: RatedHelpfulNoteProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [showAllNotes, setShowAllNotes] = useState(false)
  const noteDetailsControl = Dialog.useDialogControl()
  const {data: notes, isLoading, error} = useNotesQuery(post.uri)

  // Note: Removed route checking to avoid navigation context issues
  // The rating page should handle not showing this component if needed

  // Check if this post should have notes based on labels
  const shouldHaveNotes = hasHelpfulNotes(post)

  // Don't render if loading
  if (isLoading) {
    return null
  }

  // Show warning if there should be notes but we got an error or no notes
  if (shouldHaveNotes && (error || !notes || notes.length === 0)) {
    return (
      <View
        style={[
          a.mt_md,
          a.rounded_lg,
          a.border,
          t.atoms.bg,
          t.atoms.border_contrast_low,
          a.p_md,
        ]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>⚠️</Text>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
            <Trans>Couldn't fetch community note for this post</Trans>
          </Text>
        </View>
      </View>
    )
  }

  // Don't render if no notes and no labels indicating there should be notes
  if (!notes || notes.length === 0) {
    return null
  }

  // Show the most helpful note by default
  const primaryNote = notes[0]
  const hasMultipleNotes = notes.length > 1
  const notesToShow = showAllNotes ? notes : [primaryNote]

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
        {/* Header with RateProposedNotesPrompt background color */}
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_sm,
            a.p_md, // Reduced from a.p_lg
            a.rounded_lg,
            t.atoms.bg_contrast_25, // Same as RateProposedNotesPrompt
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
                    msg`Show ${notes.length - 1} more note${notes.length - 1 === 1 ? '' : 's'}`,
                  )}
                  onPress={() => setShowAllNotes(true)}>
                  <ButtonText style={[{color: t.palette.primary_500}]}>
                    <Trans>
                      Show {notes.length - 1} more note
                      {notes.length - 1 === 1 ? '' : 's'}
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
            Context is written by people who use Bluesky, and appears when rated
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

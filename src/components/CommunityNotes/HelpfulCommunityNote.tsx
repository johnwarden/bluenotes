import {useState} from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {useNotesQuery} from '#/state/queries/community-notes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {NoteDetailsDialog} from '#/components/CommunityNotes/NoteDetailsDialog'
import * as Dialog from '#/components/Dialog'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'

interface HelpfulCommunityNoteProps {
  post: AppBskyFeedDefs.PostView
}

export function HelpfulCommunityNote({post}: HelpfulCommunityNoteProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [showAllNotes, setShowAllNotes] = useState(false)
  const noteDetailsControl = Dialog.useDialogControl()

  const {data: notes, isLoading, error} = useNotesQuery(post.uri)

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
    <View
      style={[
        a.mt_md,
        a.rounded_lg,
        a.border,
        a.p_lg,
        {
          backgroundColor: t.palette.contrast_25,
          borderColor: t.palette.contrast_200,
        },
      ]}>
      {/* Header */}
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_md]}>
        <InfoIcon size="sm" style={{color: t.palette.primary_500}} />
        <Text style={[a.font_bold, a.text_md, t.atoms.text]}>
          <Trans>
            Readers added context they thought people might want to know
          </Trans>
        </Text>
      </View>

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

      {/* Note details dialog */}
      <NoteDetailsDialog control={noteDetailsControl} note={primaryNote} />
    </View>
  )
}

interface NoteContentProps {
  note: CommunityNote
  isFirst: boolean
  onShowDetails: () => void
}

function NoteContent({note, isFirst, onShowDetails}: NoteContentProps) {
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
        <RichText
          value={
            typeof note.text === 'string'
              ? {
                  text: note.text,
                  facets: [], // TODO: Parse facets from note text if needed
                }
              : note.text // If note.text is already a RichText object
          }
          style={[a.text_md, t.atoms.text]}
          enableTags={false}
        />
      </View>

      {/* Note metadata */}
      <View
        style={[a.flex_row, a.align_center, a.justify_between, a.flex_wrap]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {note.author.pseudonym}
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>•</Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            Writing Impact: {note.author.writingImpact}
          </Text>
        </View>

        <Button
          variant="ghost"
          size="small"
          label={_(msg`Show note details`)}
          onPress={onShowDetails}
          style={[a.self_end]}>
          <ButtonText style={[a.text_sm, {color: t.palette.primary_500}]}>
            <Trans>Details</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

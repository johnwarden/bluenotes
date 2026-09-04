import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {Trans} from '@lingui/react/macro'
import {useLingui} from '@lingui/react'

import {type CommunityNote} from '#/lib/community-notes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {NoteDetailsDialog} from '#/components/CommunityNotes/NoteDetailsDialog'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

interface NoteSubmittedDialogProps {
  control: Dialog.DialogOuterProps['control']
  noteUri?: string
  note?: CommunityNote
  onRefresh?: () => void
}

export function NoteSubmittedDialog({
  control,
  noteUri: _noteUri,
  note,
  onRefresh,
}: NoteSubmittedDialogProps) {
  const t = useTheme()
  const {_} = useLingui()
  const noteDetailsControl = Dialog.useDialogControl()

  const handleDone = () => {
    control.close()
    onRefresh?.()
  }

  const handleClose = () => {
    // Don't call control.close() here as it creates infinite recursion
    // This function is called BY the dialog close, not to close the dialog
    onRefresh?.()
  }

  const handleShowDetails = () => {
    control.close()
    noteDetailsControl.open()
  }

  return (
    <>
      <Dialog.Outer control={control} onClose={handleClose}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`Note submitted`)}>
          <Dialog.Close />
          <View style={[a.px_2xl, a.py_2xl]}>
            {/* Main Heading */}
            <Text style={[a.text_2xl, a.font_bold, a.mb_xl, t.atoms.text]}>
              <Trans>Your note is submitted!</Trans>
            </Text>

            {/* Subheading */}
            <Text style={[a.text_md, a.font_bold, a.mb_lg, t.atoms.text]}>
              <Trans>Other contributors can now rate your note</Trans>
            </Text>

            {/* Information Sections */}
            <View style={[a.mb_2xl]}>
              <Text style={[a.text_md, a.font_bold, a.mb_lg, t.atoms.text]}>
                <Trans>
                  If your note earns a status of Helpful, it will start showing
                  as context to everyone who sees the post
                </Trans>
              </Text>

              <View>
                <Text style={[a.text_md, a.font_bold, a.mb_sm, t.atoms.text]}>
                  <Trans>Note statuses aren't defined by majority rule</Trans>
                </Text>
                <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                  <Trans>
                    To identify notes that are helpful to a wide range of
                    people, note statuses require agreement between contributors
                    who have sometimes disagreed in their past ratings.
                  </Trans>
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={[a.flex_row, a.gap_md]}>
              <Button
                variant="outline"
                color="secondary"
                label={_(msg`Note Details`)}
                style={[
                  a.flex_1,
                  {
                    borderRadius: 20,
                    paddingVertical: 12,
                  },
                ]}
                onPress={handleShowDetails}>
                <ButtonText>Note Details</ButtonText>
              </Button>
              <Button
                variant="outline"
                color="secondary"
                label={_(msg`Done`)}
                style={[
                  a.flex_1,
                  {
                    borderRadius: 20,
                    paddingVertical: 12,
                  },
                ]}
                onPress={handleDone}>
                <ButtonText>Done</ButtonText>
              </Button>
            </View>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>

      {note && <NoteDetailsDialog control={noteDetailsControl} note={note} />}
    </>
  )
}

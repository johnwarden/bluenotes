import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

interface NoteSubmittedDialogProps {
  control: Dialog.DialogOuterProps['control']
  onSeeNote?: () => void
}

export function NoteSubmittedDialog({
  control,
  onSeeNote,
}: NoteSubmittedDialogProps) {
  const t = useTheme()
  const {_} = useLingui()

  const handleSeeNote = () => {
    onSeeNote?.()
    control.close()
  }

  const handleDone = () => {
    control.close()
  }

  return (
    <Dialog.Outer control={control}>
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
                If your note earns a status of Helpful, it will start showing as
                context to everyone who sees the post
              </Trans>
            </Text>

            <View>
              <Text style={[a.text_md, a.font_bold, a.mb_sm, t.atoms.text]}>
                <Trans>Note statuses aren't defined by majority rule</Trans>
              </Text>
              <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>
                  To identify notes that are helpful to a wide range of people,
                  note statuses require agreement between contributors who have
                  sometimes disagreed in their past ratings.
                </Trans>
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={[a.gap_md]}>
            {/* Primary Button - See your note */}
            <Button
              variant="outline"
              color="primary"
              label={_(msg`See your note`)}
              style={[
                a.w_full,
                {
                  borderRadius: 20,
                  paddingVertical: 12,
                },
              ]}
              onPress={handleSeeNote}>
              <ButtonText>See your note</ButtonText>
            </Button>

            {/* Secondary Button - Done */}
            <Button
              variant="outline"
              color="secondary"
              label={_(msg`Done`)}
              style={[
                a.w_full,
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
  )
}

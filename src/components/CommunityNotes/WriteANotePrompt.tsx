import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {Trans} from '@lingui/react/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {WriteNoteDialog} from '#/components/CommunityNotes/WriteNoteDialog'
import * as Dialog from '#/components/Dialog'
import {Pencil_Stroke2_Corner0_Rounded as PencilIcon} from '#/components/icons/Pencil'
import {Text} from '#/components/Typography'

export function WriteANotePrompt({
  showRatingWarning,
  postUri,
}: {
  showRatingWarning?: boolean
  postUri: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  const writeNoteControl = Dialog.useDialogControl()

  return (
    <View
      style={[
        a.align_center,
        a.py_xl,
        a.px_lg,
        a.border_t,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[t.atoms.text, a.font_bold, a.pb_lg, {fontSize: 15}]}>
        See anything you’d like to improve?
      </Text>
      {showRatingWarning && (
        <View style={[a.w_full, a.mb_lg]}>
          <Admonition type="warning">
            <Trans>
              Please rate at least one note before writing a new note. Community
              Notes depends on your ratings to keep quality high.
            </Trans>
          </Admonition>
        </View>
      )}
      <Button
        variant="solid"
        color="primary"
        label={_(msg`Write a note`)}
        style={[
          {
            borderRadius: 20,
            paddingVertical: 10,
            paddingHorizontal: 20,
          },
        ]}
        onPress={() => writeNoteControl.open()}>
        <ButtonIcon icon={PencilIcon} position="left" />
        <ButtonText>Write a note</ButtonText>
      </Button>

      <WriteNoteDialog control={writeNoteControl} postUri={postUri} />
    </View>
  )
}

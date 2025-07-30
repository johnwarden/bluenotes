import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

export function WriteANotePrompt({
  showRatingWarning,
}: {
  showRatingWarning?: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        a.align_center,
        a.py_xl,
        a.px_lg,
        a.border_t,
        t.atoms.border_contrast_low,
      ]}>
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
      <Text style={[t.atoms.text, a.font_bold, a.pb_lg, {fontSize: 15}]}>
        See anything you’d like to improve?
      </Text>
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
        onPress={() => {
          // TODO: open note writing modal
        }}>
        <ButtonText>Write a note</ButtonText>
      </Button>
    </View>
  )
}

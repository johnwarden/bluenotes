import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface InstructionPromptProps {
  status: 'needs_your_help' | 'new' | 'rated_helpful'
}

export function InstructionPrompt({status}: InstructionPromptProps) {
  const t = useTheme()

  const getInstructionText = () => {
    switch (status) {
      case 'needs_your_help':
        return (
          <Trans>
            Notes on these posts need a more diverse range of feedback, and your
            point of view could help decide if they're helpful. This list
            refreshes regularly.
          </Trans>
        )
      case 'new':
        return (
          <Trans>
            Hot off the press! These are the most recently written notes.
            Contributors can rate these notes to determine their helpfulness.
          </Trans>
        )
      case 'rated_helpful':
        return (
          <Trans>
            Community Notes relies on contributors to rate each other's notes.
            Notes shown on these posts have been rated helpful by contributors
            of multiple perspectives.
          </Trans>
        )
    }
  }

  return (
    <View style={[a.p_lg, a.gap_md]}>
      <Text style={[a.font_bold, a.text_2xl, t.atoms.text]}>
        {status === 'needs_your_help' && (
          <Trans>Rate these notes chosen for you</Trans>
        )}
        {status === 'new' && <Trans>Newest Community Notes</Trans>}
        {status === 'rated_helpful' && (
          <Trans>Notes rated helpful by contributors</Trans>
        )}
      </Text>
      <Text style={[a.text_lg, t.atoms.text_contrast_medium, {lineHeight: 24}]}>
        {getInstructionText()}
      </Text>
    </View>
  )
}

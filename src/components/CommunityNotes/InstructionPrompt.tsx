import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {atoms as a, useTheme} from '#/alf'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
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
            Rate these notes chosen for you. Notes on these posts need a more
            diverse range of feedback, and your point of view could help decide
            if they're helpful. This list refreshes regularly.
          </Trans>
        )
      case 'new':
        return (
          <Trans>
            Review the newest proposed Community Notes. Help decide which notes
            are helpful by rating them.
          </Trans>
        )
      case 'rated_helpful':
        return (
          <Trans>
            These notes have been rated helpful by the community. Review them to
            see examples of quality Community Notes.
          </Trans>
        )
    }
  }

  return (
    <View
      style={[
        a.rounded_lg,
        a.border,
        a.p_md,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
        <CommunityNotesIcon size="sm" style={{color: t.palette.primary_500}} />
        <Text style={[a.font_bold, a.text_md, t.atoms.text]}>
          {status === 'needs_your_help' && (
            <Trans>Rate these notes chosen for you</Trans>
          )}
          {status === 'new' && <Trans>Review new Community Notes</Trans>}
          {status === 'rated_helpful' && <Trans>Notes rated helpful</Trans>}
        </Text>
      </View>
      <Text style={[a.text_md, t.atoms.text, {lineHeight: 20}]}>
        {getInstructionText()}
      </Text>
    </View>
  )
}

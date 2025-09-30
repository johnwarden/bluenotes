import {type StyleProp, type ViewStyle} from 'react-native'
import {type ModerationCause, type ModerationUI} from '@atproto/api'

import {COMMUNITY_NOTES_LABELS} from '#/lib/community-notes/labels'
import {getModerationCauseKey, unique} from '#/lib/moderation'
import * as Pills from '#/components/Pills'

// Helper function to filter out community notes labels
function filterCommunityNotesLabels(
  cause: ModerationCause | Pills.AppModerationCause,
): boolean {
  if (cause.type === 'label') {
    const labelVal = (cause as any).label?.val
    return (
      labelVal !== COMMUNITY_NOTES_LABELS.NOTE &&
      labelVal !== COMMUNITY_NOTES_LABELS.PROPOSED_NOTE
    )
  }
  return true
}

export function PostAlerts({
  modui,
  size = 'sm',
  style,
  additionalCauses,
}: {
  modui: ModerationUI
  size?: Pills.CommonProps['size']
  includeMute?: boolean
  style?: StyleProp<ViewStyle>
  additionalCauses?: ModerationCause[] | Pills.AppModerationCause[]
}) {
  // Filter out community notes labels since they have their own specialized UI
  const filteredAlerts = modui.alerts
    .filter(unique)
    .filter(filterCommunityNotesLabels)
  const filteredInforms = modui.informs
    .filter(unique)
    .filter(filterCommunityNotesLabels)
  const filteredAdditionalCauses = additionalCauses?.filter(
    filterCommunityNotesLabels,
  )

  if (
    !filteredAlerts.length &&
    !filteredInforms.length &&
    !filteredAdditionalCauses?.length
  ) {
    return null
  }

  return (
    <Pills.Row size={size} style={[size === 'sm' && {marginLeft: -3}, style]}>
      {filteredAlerts.map(cause => (
        <Pills.Label
          key={getModerationCauseKey(cause)}
          cause={cause}
          size={size}
          noBg={size === 'sm'}
        />
      ))}
      {filteredInforms.map(cause => (
        <Pills.Label
          key={getModerationCauseKey(cause)}
          cause={cause}
          size={size}
          noBg={size === 'sm'}
        />
      ))}
      {filteredAdditionalCauses?.map(cause => (
        <Pills.Label
          key={getModerationCauseKey(cause)}
          cause={cause}
          size={size}
          noBg={size === 'sm'}
        />
      ))}
    </Pills.Row>
  )
}

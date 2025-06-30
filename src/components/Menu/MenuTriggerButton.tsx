import {Pressable, type StyleProp, type ViewStyle} from 'react-native'
import {useLingui} from '@lingui/react'

import {HITSLOP_10} from '#/lib/constants'
import {atoms as a, useTheme} from '#/alf'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {DotGrid_Stroke2_Corner0_Rounded as DotsHorizontal} from '#/components/icons/DotGrid'
import * as Menu from '#/components/Menu'

export function MenuTriggerButton({
  style,
  ...props
}: {
  style?: StyleProp<ViewStyle>
  label: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {
    state: hovered,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()

  return (
    <Menu.Trigger {...props}>
      {({props: triggerProps}) => (
        <Pressable
          {...triggerProps}
          onPressIn={onHoverIn}
          onPressOut={onHoverOut}
          hitSlop={HITSLOP_10}
          style={[
            a.p_xs,
            a.rounded_full,
            hovered && t.atoms.bg_contrast_25,
            style,
          ]}>
          <DotsHorizontal size="sm" style={[t.atoms.text_contrast_medium]} />
        </Pressable>
      )}
    </Menu.Trigger>
  )
}

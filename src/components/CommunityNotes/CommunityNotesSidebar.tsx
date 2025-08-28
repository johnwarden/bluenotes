import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {type NavigationProp} from '#/lib/routes/types'
import {PressableWithHover} from '#/view/com/util/PressableWithHover'
import {atoms as a, useLayoutBreakpoints, useTheme, web} from '#/alf'
import {CircleInfo_Stroke2_Corner0_Rounded as Info} from '#/components/icons/CircleInfo'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import {
  HomeOpen_Filled_Corner0_Rounded as HomeFilled,
  HomeOpen_Stoke2_Corner0_Rounded as Home,
} from '#/components/icons/HomeOpen'
import {
  UserCircle_Filled_Corner0_Rounded as UserCircleFilled,
  UserCircle_Stroke2_Corner0_Rounded as UserCircle,
} from '#/components/icons/UserCircle'
import {CENTER_COLUMN_OFFSET} from '#/components/Layout/const'
import {Text} from '#/components/Typography'

const NAV_ICON_WIDTH = 28

interface SidebarNavItemProps {
  icon: JSX.Element
  iconFilled: JSX.Element
  label: string
  isActive?: boolean
  onPress?: () => void
}

function SidebarNavItem({
  icon,
  iconFilled,
  label,
  isActive = false,
  onPress,
}: SidebarNavItemProps) {
  const t = useTheme()
  const {leftNavMinimal} = useLayoutBreakpoints()

  return (
    <PressableWithHover
      style={[
        a.flex_row,
        a.align_center,
        a.p_md,
        a.rounded_sm,
        a.gap_sm,
        a.outline_inset_1,
        a.transition_color,
      ]}
      hoverStyle={t.atoms.bg_contrast_25}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint=""
      accessibilityRole="button">
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.z_10,
          {
            width: 24,
            height: 24,
          },
          leftNavMinimal && {
            width: 40,
            height: 40,
          },
        ]}>
        {isActive ? iconFilled : icon}
      </View>
      {!leftNavMinimal && (
        <Text style={[a.text_xl, isActive ? a.font_heavy : a.font_normal]}>
          {label}
        </Text>
      )}
    </PressableWithHover>
  )
}

export function CommunityNotesSidebar() {
  const pal = usePalette('default')
  const {_} = useLingui()
  const {isDesktop} = useWebMediaQueries()
  const {leftNavMinimal, centerColumnOffset} = useLayoutBreakpoints()
  const navigation = useNavigation<NavigationProp>()

  if (!isDesktop) {
    return null
  }

  return (
    <View
      role="navigation"
      style={[
        a.px_xl,
        styles.leftNav,
        leftNavMinimal && styles.leftNavMinimal,
        {
          transform: [
            {
              translateX:
                -300 + (centerColumnOffset ? CENTER_COLUMN_OFFSET : 0),
            },
            {translateX: '-100%'},
            ...a.scrollbar_offset.transform,
          ],
        },
      ]}>
      <View style={[a.pt_xl]}>
        <SidebarNavItem
          icon={
            <Home aria-hidden={true} width={NAV_ICON_WIDTH} style={pal.text} />
          }
          iconFilled={
            <HomeFilled
              aria-hidden={true}
              width={NAV_ICON_WIDTH}
              style={pal.text}
            />
          }
          label={_(msg`Home`)}
          onPress={() => {
            navigation.navigate('Home')
          }}
        />
        <SidebarNavItem
          icon={
            <CommunityNotesIcon
              style={pal.text}
              aria-hidden={true}
              width={NAV_ICON_WIDTH}
            />
          }
          iconFilled={
            <CommunityNotesIcon
              style={pal.text}
              aria-hidden={true}
              width={NAV_ICON_WIDTH}
            />
          }
          label={_(msg`Community Notes`)}
          isActive={true}
        />
        <SidebarNavItem
          icon={
            <UserCircle
              aria-hidden={true}
              width={NAV_ICON_WIDTH}
              style={pal.text}
            />
          }
          iconFilled={
            <UserCircleFilled
              aria-hidden={true}
              width={NAV_ICON_WIDTH}
              style={pal.text}
            />
          }
          label={_(msg`Your profile`)}
          onPress={() => {
            // TODO: Navigate to user's community notes profile
          }}
        />
        <SidebarNavItem
          icon={
            <Info aria-hidden={true} width={NAV_ICON_WIDTH} style={pal.text} />
          }
          iconFilled={
            <Info aria-hidden={true} width={NAV_ICON_WIDTH} style={pal.text} />
          }
          label={_(msg`About`)}
          onPress={() => {
            // TODO: Navigate to community notes about page
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  leftNav: {
    ...a.fixed,
    top: 0,
    paddingTop: 10,
    paddingBottom: 10,
    left: '50%',
    width: 240,
    // @ts-expect-error web only
    maxHeight: '100vh',
    overflowY: 'auto',
  },
  leftNavMinimal: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    height: '100%',
    width: 86,
    alignItems: 'center',
    ...web({overflowX: 'hidden'}),
  },
})

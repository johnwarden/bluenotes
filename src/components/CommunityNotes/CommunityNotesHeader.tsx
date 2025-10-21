import {View} from 'react-native'

import {type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {TabBar} from '#/view/com/pager/TabBar'
import {atoms as a, useTheme, web} from '#/alf'
import * as Layout from '#/components/Layout'

export function CommunityNotesHeader(
  props: RenderTabBarFnProps & {
    onPressSelected: () => void
    tabs: string[]
  },
) {
  const t = useTheme()
  const {tabs, onPressSelected} = props

  return (
    <Layout.Center style={[a.z_10, web([a.sticky, {top: 0}])]}>
      <View
        style={[t.atoms.bg, a.border_b, t.atoms.border_contrast_low, a.w_full]}>
        <TabBar
          key={tabs.join(',')}
          onPressSelected={onPressSelected}
          selectedPage={props.selectedPage}
          onSelect={props.onSelect}
          testID="communityNotesTabBar"
          items={tabs}
          dragProgress={props.dragProgress}
          dragState={props.dragState}
        />
      </View>
    </Layout.Center>
  )
}

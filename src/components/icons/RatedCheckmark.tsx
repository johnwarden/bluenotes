import {type ViewStyle} from 'react-native'
import Svg, {Path} from 'react-native-svg'

import {useTheme} from '#/alf'

export function RatedCheckmark({
  width,
  height,
  style,
}: {
  width: number
  height: number
  style?: ViewStyle
}) {
  const t = useTheme()

  return (
    <Svg viewBox="0 0 24 24" width={width} height={height} style={style}>
      <Path
        d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75z"
        fill={t.palette.contrast_25}
      />
      <Path
        d="M9.94 15.6l-3.27-2.62 1.25-1.57 1.98 1.58 3.97-5.47 1.62 1.18-5.55 7.6z"
        fill={t.palette.contrast_950}
      />
    </Svg>
  )
}

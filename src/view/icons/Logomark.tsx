import Svg, {Path, type PathProps, type SvgProps} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 54 / 61

export function Logomark({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32)

  return (
    <Svg
      fill="none"
      viewBox="0 0 511 441"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <Path
        fill={fill || pal.text.color}
        d="M471.19 1.022c-3 1-21 4-41 8-21 4-40 7-42 8s-11 2-20 4c-13 2-71 14-144 28-17 4-27 7-34 14-7 6-7-1-7 109 0 54 0 99-1 100 0 1-1 1-8-1-37-10-84-5-115 14-94 56-72 156 35 156 63 0 117-37 133-91 2-9 2-9 3-109 1-110 0-103 6-107 3-2 196-41 215-44 5 0 5 0 5 69s0 69-4 67c-60-21-134 2-168 52-46 69 26 134 120 109 45-13 85-45 94-78 4-11 3-304-1-307-3-2-18-3-26-1z"
      />
    </Svg>
  )
}

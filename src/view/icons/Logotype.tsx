import {Text, View} from 'react-native'
import Svg, {Path, type SvgProps} from 'react-native-svg'

// import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 0.236702

interface LogotypeProps extends SvgProps {
  showBeta?: boolean
}

export function Logotype({showBeta = true, ...rest}: LogotypeProps) {
  // const pal = usePalette('default')
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32, 10)

  const logoElement = (
    <Svg
      viewBox="0 0 376 89"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <Path
        fill="#1185FE"
        d="M55 2c-3 0-3 3-4 27 0 30 0 31 6 32 8 0 7 1 7-30 0-22 0-26-1-27-2-2-6-3-8-2zM3 4C1 6 2 57 3 59c2 3 31 2 36-1 9-5 12-18 5-24-2-3-2-3 0-7 4-7 2-16-5-21C34 3 6 1 3 4zm26 11c7 4 2 11-8 11-6-1-8-5-6-11 1-1 11-1 14 0zm2 24c8 4 2 11-8 11-7-1-7-1-8-5v-7c1-2 12-1 16 1zm41-19c-3 2-3 25-1 30 6 16 32 16 38 0 1-4 1-21 0-28 0-3-1-4-5-4-6 0-7 1-7 15s0 15-4 17c-7 3-9 0-10-17 0-11 0-13-2-14-3-2-8-1-9 1z"
      />
      <Path
        fill="#1185FE"
        d="M125 20c-15 7-16 32-1 40 8 4 24 2 27-4s-2-10-9-7c-4 3-9 2-13 0-6-4-4-5 11-5 11 0 13-1 13-7 0-13-16-23-28-17zm13 11c3 3 2 4-5 4-3 0-6 0-7-1-1-2 4-5 7-5 2 0 4 1 5 2z"
      />
      <Path
        fill="#001030"
        d="M180 10c-1 2-1 7-1 12 0 10 0 10-6 10-19 2-23 22-3 21 12-1 16-7 17-23 0-7 1-11 1-11 1 0 7 1 14 3 13 3 13 3 13 11 0 9 0 9-5 9-17 0-25 17-11 21 7 2 17-2 21-9 2-5 2-39-1-39-3-1-35-8-37-8-1 0-2 1-2 3zm97-2c-1 1-1 3-2 5 0 4-1 5-3 5-7 1-7 9 0 11 3 0 3 0 3 12 1 13 2 16 7 18 6 4 14 3 16 0 3-4-1-9-6-9-3 0-4-4-4-13 1-7 1-7 4-8 10-2 10-10 1-12-4 0-5-1-5-5s-9-8-11-4z"
      />
      <Path
        fill="#001030"
        d="M241 18c-20 8-19 38 1 43 17 5 31-11 26-28-4-13-16-19-27-15zm10 12c8 4 6 20-3 20-6 0-9-4-9-11 0-8 6-13 12-9zm59-10c-18 9-15 36 5 41 10 3 25-3 22-10-1-4-4-4-10-2s-9 2-13-1c-3-3-3-4 10-4 14-1 16-2 15-9-3-15-17-22-29-15zm14 10c3 3 3 4-5 4s-9-1-5-4c3-3 7-2 10 0z"
      />
      <Path
        fill="#001030"
        d="M351 18c-10 4-14 14-8 21 2 2 5 3 14 6 9 4 4 7-5 4-8-2-11-1-12 2-1 9 14 14 25 9 13-7 12-20-2-25-11-4-11-4-9-6 2-1 2-1 6 0 9 3 12 2 13 0 3-8-12-15-22-11z"
      />
    </Svg>
  )

  if (!showBeta) {
    return logoElement
  }

  return (
    <View style={{textAlign: 'left'}}>
      {logoElement}
      <Text
        style={{
          fontSize: Math.max(8, size * 0.15),
          fontStyle: 'italic',
          color: 'darkred',
          marginTop: -5,
          fontWeight: '800',
        }}>
        beta
      </Text>
    </View>
  )
}

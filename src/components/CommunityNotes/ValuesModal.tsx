import {View} from 'react-native'
import Svg, {Circle, Line, Path} from 'react-native-svg'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

interface ValuesModalProps {
  control: Dialog.DialogOuterProps['control']
  onContinue: () => void
}

// Custom icon components to match the design
function SunIcon({size = 32, color = '#000'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="2" x2="12" y2="4" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="20" x2="12" y2="22" stroke={color} strokeWidth="2" />
      <Line
        x1="4.93"
        y1="4.93"
        x2="6.34"
        y2="6.34"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="17.66"
        y1="17.66"
        x2="19.07"
        y2="19.07"
        stroke={color}
        strokeWidth="2"
      />
      <Line x1="2" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="20" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" />
      <Line
        x1="6.34"
        y1="17.66"
        x2="4.93"
        y2="19.07"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="19.07"
        y1="4.93"
        x2="17.66"
        y2="6.34"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  )
}

function HeartSparkleIcon({
  size = 32,
  color = '#000',
}: {
  size?: number
  color?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Sparkle lines - exact same as sun icon */}
      <Line x1="12" y1="2" x2="12" y2="4" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="20" x2="12" y2="22" stroke={color} strokeWidth="2" />
      <Line
        x1="4.93"
        y1="4.93"
        x2="6.34"
        y2="6.34"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="17.66"
        y1="17.66"
        x2="19.07"
        y2="19.07"
        stroke={color}
        strokeWidth="2"
      />
      <Line x1="2" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="20" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" />
      <Line
        x1="6.34"
        y1="17.66"
        x2="4.93"
        y2="19.07"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="19.07"
        y1="4.93"
        x2="17.66"
        y2="6.34"
        stroke={color}
        strokeWidth="2"
      />
      {/* Smaller heart in the center */}
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(12, 13) scale(0.5) translate(-12, -12)"
      />
    </Svg>
  )
}

function PeopleIcon({
  size = 32,
  color = '#000',
}: {
  size?: number
  color?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(12, 12) scale(0.85, 1) translate(-12, -12)"
      />
    </Svg>
  )
}

export function ValuesModal({control, onContinue}: ValuesModalProps) {
  const t = useTheme()
  const {_} = useLingui()

  const handleContinue = () => {
    control.close()
    onContinue()
  }

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Community Notes values`)}>
        <Dialog.Close />
        <View style={[{paddingHorizontal: 64, paddingVertical: 48}]}>
          {/* Main Heading */}
          <Text
            style={[
              a.text_3xl,
              a.font_bold,
              a.mb_3xl,
              t.atoms.text,
              {lineHeight: 40},
            ]}>
            <Trans>A quick reminder of the Community Notes values:</Trans>
          </Text>

          {/* Values List */}
          <View style={[a.gap_2xl, a.mb_4xl]}>
            {/* Value 1 */}
            <View style={[a.flex_row, a.gap_md, a.align_end]}>
              <SunIcon size={24} color={t.atoms.text.color as string} />
              <Text
                style={[
                  a.text_lg,
                  a.flex_1,
                  {color: t.palette.contrast_700, lineHeight: 26},
                ]}>
                <Trans>Contribute to build understanding</Trans>
              </Text>
            </View>

            {/* Value 2 */}
            <View style={[a.flex_row, a.gap_md, a.align_end]}>
              <HeartSparkleIcon
                size={24}
                color={t.atoms.text.color as string}
              />
              <Text
                style={[
                  a.text_lg,
                  a.flex_1,
                  {color: t.palette.contrast_700, lineHeight: 26},
                ]}>
                <Trans>Act in good faith</Trans>
              </Text>
            </View>

            {/* Value 3 */}
            <View style={[a.flex_row, a.gap_md, a.align_end]}>
              <PeopleIcon size={24} color={t.atoms.text.color as string} />
              <Text
                style={[
                  a.text_lg,
                  a.flex_1,
                  {color: t.palette.contrast_700, lineHeight: 26},
                ]}>
                <Trans>Be helpful, even to those who disagree</Trans>
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <Button
            variant="solid"
            color="primary"
            size="large"
            label={_(msg`Continue`)}
            style={[
              {
                borderRadius: 32,
                paddingVertical: 18,
              },
            ]}
            onPress={handleContinue}>
            <ButtonText style={[a.text_lg, a.font_semi_bold]}>
              <Trans>Continue</Trans>
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

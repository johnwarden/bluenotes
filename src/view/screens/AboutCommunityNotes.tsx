import React from 'react'
import {Linking, Text, View} from 'react-native'
import Svg, {G, Path} from 'react-native-svg'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePalette} from '#/lib/hooks/usePalette'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {s} from '#/lib/styles'
import {useEnableMinimalShellMode} from '#/state/shell'
import {ScrollView} from '#/view/com/util/Views'
import * as Layout from '#/components/Layout'
import {ViewHeader} from '../com/util/ViewHeader'

interface LinkProps {
  href: string
  children: React.ReactNode
}

const Link: React.FC<LinkProps> = ({href, children}) => {
  const pal = usePalette('default')

  const handlePress = () => {
    Linking.openURL(href)
  }

  return (
    <Text
      style={{color: pal.link.color, textDecorationLine: 'underline'}}
      onPress={handlePress}>
      {children}
    </Text>
  )
}

// Icon components
const PenIcon: React.FC<{color: string; size: number}> = ({color, size}) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <G>
      <Path
        d="M21.15 6.232c.97.977.97 2.559 0 3.536L9.91 21H3v-6.914L14.23 2.854c.98-.977 2.56-.977 3.54 0l3.38 3.378zM14.75 19l-2 2H21v-2h-6.25z"
        fill={color}
      />
    </G>
  </Svg>
)

const StarIcon: React.FC<{color: string; size: number}> = ({color, size}) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <G>
      <Path
        d="M12.013 1l3.527 7.15 7.886 1.14-5.707 5.56 1.347 7.86L12.013 19 4.96 22.71l1.347-7.86L.6 9.29l7.886-1.14L12.013 1z"
        fill={color}
      />
    </G>
  </Svg>
)

const PeopleIcon: React.FC<{color: string; size: number}> = ({color, size}) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <G>
      <Path
        d="M5.73 12.02c-.03.04-.05.07-.08.1-1.26 1.6-2.04 3.63-2.42 5.88H.65l.1-1.09c.13-1.4.57-2.62 1.35-3.51.8-.91 1.89-1.4 3.15-1.4.16 0 .32.01.48.02zM23.35 18l-.1-1.09c-.13-1.4-.57-2.62-1.35-3.51-.8-.91-1.89-1.4-3.15-1.4-.16 0-.32.01-.48.02.08.1.16.2.24.31 1.17 1.56 1.9 3.51 2.26 5.67h2.58zM12 11c-1.94 0-3.59.86-4.78 2.36-1.26 1.59-2 3.86-2.22 6.56L4.92 21h14.16L19 19.92c-.21-2.62-.91-4.82-2.09-6.39C15.7 11.92 14.02 11 12 11zm0-8c-1.93 0-3.5 1.57-3.5 3.5S10.07 10 12 10s3.5-1.57 3.5-3.5S13.93 3 12 3zM5.25 5.5C3.73 5.5 2.5 6.73 2.5 8.25S3.73 11 5.25 11 8 9.77 8 8.25 6.77 5.5 5.25 5.5zm13.5 0C17.23 5.5 16 6.73 16 8.25S17.23 11 18.75 11s2.75-1.23 2.75-2.75-1.23-2.75-2.75-2.75z"
        fill={color}
      />
    </G>
  </Svg>
)

export const AboutCommunityNotesScreen = ({}: NativeStackScreenProps<
  CommonNavigatorParams,
  'AboutCommunityNotes'
>) => {
  const pal = usePalette('default')
  const {_} = useLingui()
  useEnableMinimalShellMode({enabled: false})

  const styles = {
    container: {
      maxWidth: 918,
      marginHorizontal: 'auto' as const,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    h1: {
      color: pal.text.color,
      fontSize: 32,
      fontWeight: 'bold' as const,
      marginTop: 20,
      marginBottom: 10,
    },
    intro: {
      color: pal.text.color,
      fontSize: 18,
      lineHeight: 28,
      marginBottom: 30,
      opacity: 0.8,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#1D9BF0',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: 16,
    },
    sectionTitle: {
      color: pal.text.color,
      fontSize: 20,
      fontWeight: 'bold' as const,
      flex: 1,
    },
    sectionText: {
      color: pal.text.color,
      fontSize: 16,
      lineHeight: 24,
      paddingLeft: 64,
    },
    learnMore: {
      marginTop: 20,
      marginBottom: 40,
    },
  }

  return (
    <Layout.Screen>
      <ViewHeader title={_(msg({message: 'About Community Notes'}))} />
      <ScrollView style={[s.hContentRegion, pal.view]}>
        <View style={[s.p20]}>
          <View style={styles.container}>
            <Text style={styles.h1}>Community Notes</Text>

            <Text style={styles.intro}>
              Community Notes is a program that aims to create a better-informed
              world. It empowers people on Bluesky to collaboratively add
              helpful notes to posts that might be misleading.
            </Text>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconContainer}>
                  <PenIcon color="#FFFFFF" size={24} />
                </View>
                <Text style={styles.sectionTitle}>
                  Contributors write and rate notes
                </Text>
              </View>
              <Text style={styles.sectionText}>
                Contributors are people on Bluesky, just like you, who choose to
                write and rate notes. The more people that participate, the
                better the program becomes.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconContainer}>
                  <StarIcon color="#FFFFFF" size={24} />
                </View>
                <Text style={styles.sectionTitle}>
                  Only notes that people find helpful appear on a post
                </Text>
              </View>
              <Text style={styles.sectionText}>
                In order to be shown publicly as context on the post, a note
                needs to be rated helpful by enough people from different points
                of view. This approach helps avoid bias and manipulation, and
                helps find notes that are helpful to many people.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconContainer}>
                  <PeopleIcon color="#FFFFFF" size={24} />
                </View>
                <Text style={styles.sectionTitle}>
                  The platform doesn't choose what shows up: the people do
                </Text>
              </View>
              <Text style={styles.sectionText}>
                The platform doesn't write, rate or moderate notes (unless they
                break the rules). We believe giving people voice to make these
                choices together is a fair and effective way to add information
                that helps people stay better informed.
              </Text>
            </View>

            <View style={styles.learnMore}>
              <Link href="https://communitynotes.x.com/guide/en/about/introduction">
                <Text style={styles.intro}>Learn more</Text>
              </Link>
            </View>
          </View>
        </View>
        <View style={s.footerSpacer} />
      </ScrollView>
    </Layout.Screen>
  )
}

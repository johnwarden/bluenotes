import React from 'react'
import {Linking, useWindowDimensions, View} from 'react-native'
import RenderHtml from 'react-native-render-html'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {s} from '#/lib/styles'
import {useSetMinimalShellMode} from '#/state/shell'
import {ScrollView} from '#/view/com/util/Views'
import * as Layout from '#/components/Layout'
import {ViewHeader} from '../view/com/util/ViewHeader'

interface SupportPageProps {
  title: string
  htmlContent: string
}

export const SupportPage: React.FC<SupportPageProps> = ({
  title,
  htmlContent,
}) => {
  const pal = usePalette('default')
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {width} = useWindowDimensions()

  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  // Custom renderers for handling links - memoized to avoid "component defined during render" warning
  const renderers = React.useMemo(
    () => ({
      a: ({TDefaultRenderer, ...props}: any) => {
        const href = props.tnode.attributes.href

        const handlePress = () => {
          if (href) {
            if (href.startsWith('mailto:')) {
              Linking.openURL(href)
            } else if (
              href.startsWith('http://') ||
              href.startsWith('https://')
            ) {
              Linking.openURL(href)
            } else {
              // Handle internal navigation to other screens
              const routeMap: {[key: string]: string} = {
                '/about/support/tos': 'TermsOfService',
                '/about/support/community-guidelines': 'CommunityGuidelines',
                '/about/support/copyright': 'CopyrightPolicy',
                '/about/support/privacy-policy': 'PrivacyPolicy',
                '/about/support/tos-gov': 'GovernmentTermsOfService',
                '/about/support': 'Help',
              }

              const [baseUrl] = href.split('#')
              const route = routeMap[baseUrl]

              if (route && navigation) {
                navigation.navigate(route as any)
              }
            }
          }
        }

        // All links should be styled as clickable links
        const linkStyle = {
          color: pal.link.color,
          textDecorationLine: 'underline' as const,
        }

        return (
          <TDefaultRenderer
            {...props}
            onPress={handlePress}
            style={linkStyle}
          />
        )
      },
    }),
    [pal.link.color, navigation],
  )

  // Custom tag styles
  const tagsStyles = {
    body: {
      color: pal.text.color,
      fontSize: 16,
      lineHeight: 24,
    },
    h1: {
      color: pal.text.color,
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
    },
    h2: {
      color: pal.text.color,
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      color: pal.text.color,
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
    },
    h4: {
      color: pal.text.color,
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 6,
    },
    p: {
      color: pal.text.color,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
    strong: {
      fontWeight: 'bold',
    },
    em: {
      fontStyle: 'italic',
    },
    u: {
      textDecorationLine: 'underline',
    },
    ol: {
      marginBottom: 12,
    },
    ul: {
      marginBottom: 12,
    },
    li: {
      color: pal.text.color,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 6,
    },
    hr: {
      backgroundColor: pal.border.color,
      height: 1,
      marginVertical: 20,
    },
    address: {
      color: pal.textLight.color,
      fontSize: 14,
      fontStyle: 'italic',
      marginBottom: 12,
    },
  }

  return (
    <Layout.Screen>
      <ViewHeader title={_(msg({message: title}))} />
      <ScrollView style={[s.hContentRegion, pal.view]}>
        <View style={[s.p20]}>
          <RenderHtml
            contentWidth={width - 40} // Account for padding
            source={{html: htmlContent}}
            tagsStyles={tagsStyles}
            renderers={renderers}
            defaultTextProps={{
              selectable: true,
            }}
          />
        </View>
        <View style={s.footerSpacer} />
      </ScrollView>
    </Layout.Screen>
  )
}

// Higher-order component to create support page screens
export const createSupportPageScreen = (title: string, htmlContent: string) => {
  const SupportPageScreen = ({}: NativeStackScreenProps<
    CommonNavigatorParams,
    any
  >) => <SupportPage title={title} htmlContent={htmlContent} />
  SupportPageScreen.displayName = `${title.replace(/\s+/g, '')}Screen`
  return SupportPageScreen
}

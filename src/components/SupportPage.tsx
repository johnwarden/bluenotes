import {useMemo} from 'react'
import {Linking, useWindowDimensions, View} from 'react-native'
import RenderHtml, {type CustomTextualRenderer} from 'react-native-render-html'
import {useNavigation} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {s} from '#/lib/styles'
import {ScrollView} from '#/view/com/util/Views'
import * as Layout from '#/components/Layout'
import {ViewHeader} from '../view/com/util/ViewHeader'

interface SupportPageProps {
  title: string
  htmlContent: string
}

type SupportRouteName = Extract<
  keyof CommonNavigatorParams,
  | 'TermsOfService'
  | 'CommunityGuidelines'
  | 'CopyrightPolicy'
  | 'PrivacyPolicy'
  | 'GovernmentTermsOfService'
  | 'Support'
  | 'BetaGuide'
  | 'AboutCommunityNotes'
>

const SUPPORT_ROUTE_MAP: Record<string, SupportRouteName> = {
  '/about/support/tos': 'TermsOfService',
  '/about/support/community-guidelines': 'CommunityGuidelines',
  '/about/support/copyright': 'CopyrightPolicy',
  '/about/support/privacy-policy': 'PrivacyPolicy',
  '/about/support/tos-gov': 'GovernmentTermsOfService',
  '/about/support': 'Support',
  '/about/support/beta': 'BetaGuide',
  '/about/support/community-notes': 'AboutCommunityNotes',
}

export function SupportPage({title, htmlContent}: SupportPageProps) {
  const pal = usePalette('default')
  const navigation = useNavigation<NavigationProp>()
  const {width} = useWindowDimensions()

  // Custom renderers for handling links - memoized to avoid "component defined during render" warning
  const renderers = useMemo(() => {
    const a: CustomTextualRenderer = ({TDefaultRenderer, tnode, ...props}) => {
      const href = tnode.attributes.href

      const handlePress = () => {
        if (href) {
          if (href.startsWith('mailto:')) {
            void Linking.openURL(href)
          } else if (
            href.startsWith('http://') ||
            href.startsWith('https://')
          ) {
            void Linking.openURL(href)
          } else {
            const [baseUrl] = href.split('#')
            const route = SUPPORT_ROUTE_MAP[baseUrl]

            if (route) {
              navigation.navigate(route)
            }
          }
        }
      }

      const linkStyle = {
        color: pal.link.color,
        textDecorationLine: 'underline' as const,
      }

      return (
        <TDefaultRenderer
          {...props}
          tnode={tnode}
          onPress={handlePress}
          style={linkStyle}
        />
      )
    }
    return {a}
  }, [pal.link.color, navigation])

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
      fontWeight: '700' as const,
      marginTop: 20,
      marginBottom: 10,
    },
    h2: {
      color: pal.text.color,
      fontSize: 20,
      fontWeight: '700' as const,
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      color: pal.text.color,
      fontSize: 18,
      fontWeight: '700' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    h4: {
      color: pal.text.color,
      fontSize: 16,
      fontWeight: '700' as const,
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
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    u: {
      textDecorationLine: 'underline' as const,
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
      backgroundColor: pal.border.borderColor,
      height: 1,
      marginVertical: 20,
    },
    address: {
      color: pal.textLight.color,
      fontSize: 14,
      fontStyle: 'italic' as const,
      marginBottom: 12,
    },
  }

  return (
    <Layout.Screen>
      <ViewHeader title={title} />
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
export function createSupportPageScreen(title: string, htmlContent: string) {
  function SupportPageScreen() {
    return <SupportPage title={title} htmlContent={htmlContent} />
  }
  SupportPageScreen.displayName = `${title.replace(/\s+/g, '')}Screen`
  return SupportPageScreen
}

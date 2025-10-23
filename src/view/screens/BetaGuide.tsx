import React from 'react'
import {Image, Linking, Text, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {getStaticAssetUrl} from '#/lib/strings/url-helpers'
import {s} from '#/lib/styles'
import {useSetMinimalShellMode} from '#/state/shell'
import {ScrollView} from '#/view/com/util/Views'
import {createSinglePathSVG} from '#/components/icons/TEMPLATE'
import * as Layout from '#/components/Layout'
import {ViewHeader} from '../com/util/ViewHeader'

interface LinkProps {
  href: string
  children: React.ReactNode
}

const CommunityNotesIcon = createSinglePathSVG({
  path: 'M5.5 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm18.25 13.91c-.18-2.01-.78-3.72-1.81-4.96C20.89 10.7 19.45 10 17.75 10c-.35 0-.68.03-1.01.09-.18.54-.45 1.05-.8 1.49.74.46 1.41 1.05 1.99 1.76 1.05 1.3 1.71 2.91 2.06 4.66h3.85l-.09-1.09zM18.5 9c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM6.07 13.34c.58-.71 1.25-1.3 1.99-1.76-.35-.44-.62-.95-.8-1.49-.33-.06-.66-.09-1.01-.09-1.7 0-3.14.7-4.19 1.95C1.032 13.19.433 14.9.254 16.91L.157 18H4.01c.35-1.75 1.01-3.36 2.06-4.66zM15 8.5c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3zm-7.37 6.1c-1.07 1.32-1.69 3.15-1.88 5.31L5.66 21h12.68l-.09-1.09c-.19-2.16-.81-3.99-1.88-5.31-1.08-1.35-2.59-2.1-4.37-2.1s-3.28.75-4.37 2.1z',
})

const Link: React.FC<LinkProps> = ({href, children}) => {
  const pal = usePalette('default')
  const navigation = useNavigation<NavigationProp>()

  const handlePress = () => {
    if (href.startsWith('mailto:')) {
      Linking.openURL(href)
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
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
        '/about/support/beta': 'BetaGuide',
      }

      const [baseUrl] = href.split('#')
      const route = routeMap[baseUrl]

      if (route && navigation) {
        navigation.navigate(route as any)
      }
    }
  }

  return (
    <Text
      style={{color: pal.link.color, textDecorationLine: 'underline'}}
      onPress={handlePress}>
      {children}
    </Text>
  )
}

export const BetaGuideScreen = ({}: NativeStackScreenProps<
  CommonNavigatorParams,
  'BetaGuide'
>) => {
  const pal = usePalette('default')
  const {_} = useLingui()
  const setMinimalShellMode = useSetMinimalShellMode()
  // const {width} = useWindowDimensions()

  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  // Calculate content width accounting for sidebars and padding
  // const contentWidth = Math.min(width, 878) // Account for padding and max content width

  const styles = {
    container: {
      maxWidth: 918,
      marginHorizontal: 'auto' as const,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    image: {
      width: '100%' as const,
      // maxHeight: 500,
      // height: undefined as undefined,
      aspectRatio: 16 / 9, // Will be overridden by actual image aspect ratio
      alignSelf: 'center' as const,
      marginTop: 10,
      borderRadius: 8,
    },
    imageCaption: {
      color: pal.text.color,
      fontSize: 14,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      marginTop: 8,
      marginBottom: 20,
      opacity: 0.7,
    },
    h1: {
      color: pal.text.color,
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginTop: 20,
      marginBottom: 10,
    },
    h2: {
      color: pal.text.color,
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      color: pal.text.color,
      fontSize: 18,
      fontWeight: 'bold' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    p: {
      color: pal.text.color,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
  }

  return (
    <Layout.Screen>
      <ViewHeader title={_(msg({message: 'Beta Tester Guide'}))} />
      <ScrollView style={[s.hContentRegion, pal.view]}>
        <View style={[s.p20]}>
          <View style={styles.container}>
            <Image
              source={{
                uri: getStaticAssetUrl(
                  'images/bluesky-plus-notes-bluenotes.png',
                ),
              }}
              style={styles.image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />

            <Text style={styles.h1}>Welcome, Phase 1 Beta Testers!</Text>

            <Text style={styles.p}>
              Bluenotes is a fully-featured fork of the Bluesky social app, with
              the addition of a Community Notes feature that works just like
              Twitter/X's Community Notes.
            </Text>

            <Text style={styles.p}>
              Phase 1 of the beta is about building the foundation. We've
              invited pioneer users to test the system and seed it with notes
              and ratings. The algorithm needs diverse ratings from many
              contributors before it can identify helpful notes, so most notes
              will show "Needs more Ratings" initially. That's expected and
              normal.
            </Text>

            <Text style={styles.p}>
              Every note and rating you contribute gets us closer to the
              critical mass needed for the algorithm to work. You're not just
              testing—you're building this with us.
            </Text>

            <Text style={styles.p}>
              After working out any kinks and confirming that the algorithm
              works, we'll launch Phase 2 of the beta, in which we'll make a
              larger PR push in order to attract more users.
            </Text>

            {/* TODO: Add progress indicator showing community stats */}

            <Text style={styles.h2}>Feedback</Text>

            <Text style={styles.p}>
              Please send us your feedback by posting on Bluesky and mentioning{' '}
              <Link href="https://bluenotes.social/profile/bluenotes.social">
                <Text>@bluenotes.social</Text>
              </Link>
              .
            </Text>

            <Text style={styles.h2}>Signing In</Text>

            <Text style={styles.p}>
              Most Community Notes features require you to be signed in. You
              don't need a separate Bluenotes account: sign in with your Bluesky
              username and password.
            </Text>

            <Text style={styles.p}>
              We know that entering your Bluesky password on a different web
              site is risky if you don't trust that web site. We are working on
              implementing{' '}
              <Link href="https://docs.bsky.app/blog/oauth-atproto">
                <Text>OAuth</Text>
              </Link>{' '}
              so you don't have to do this in the future. DM us at{' '}
              <Link href="https://bluenotes.social/profile/bluenotes.social">
                <Text>@bluenotes.social</Text>
              </Link>{' '}
              if you prefer to wait for Oauth before you participate in the
              beta.
            </Text>

            <Text style={styles.p}>
              If you don't yet have a Bluesky account, create one on the{' '}
              <Link href="https://bsky.app">
                <Text>Bluesky App</Text>
              </Link>{' '}
              or right here on Bluenotes.
            </Text>

            <Text style={styles.p}>
              Once you've signed in, feel free to poke around the app, or follow
              the guide below.
            </Text>

            <Text style={styles.h2}>Features to Test</Text>

            <Text style={styles.h3}>Finding Posts to Note</Text>

            <Text style={styles.p}>
              Look for posts that could benefit from additional context: claims
              that lack sources, potentially misleading information, or posts
              where helpful context would improve understanding. You can browse
              your regular feeds or search for topics where misinformation is
              common.
            </Text>

            <Text style={styles.p}>
              Write notes sparingly and thoughtfully—quality over quantity. See{' '}
              <Link href="https://communitynotes.x.com/guide/en/contributing/examples">
                <Text>Community Notes examples</Text>
              </Link>{' '}
              for guidance.
            </Text>

            <Text style={styles.h3}>Browsing Notes</Text>

            <Text style={styles.p}>
              Once you've logged in, click the "
              <Text>
                <Text style={{flexDirection: 'row', alignItems: 'center'}}>
                  <CommunityNotesIcon
                    size="sm"
                    style={{
                      color: '#000000',
                      // pull icon down to align with normal text
                      position: 'relative',
                      top: 2.5,
                    }}
                  />{' '}
                </Text>
                Community Notes
              </Text>
              " link in the left navigation bar or click{' '}
              <Link href="https://bluenotes.social/community-notes/new">
                <Text>here</Text>
              </Link>{' '}
              to browse notes that other users have written. Note there are
              three tabs on this page, "Needs Your Help", "New" and "Rated
              Helpful".
            </Text>

            <Image
              source={{
                uri: getStaticAssetUrl('images/beta/browse-notes.png'),
              }}
              style={styles.image}
              // resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.imageCaption}>
              Screenshot of Community Notes Page
            </Text>

            <Text style={styles.h3}>Rating Notes</Text>

            <Text style={styles.p}>
              Click the "Rate" button below a note to submit your rating.
              Ideally, each tester will thoughtfully rate several notes so we
              can start collecting useful data.
            </Text>

            <Image
              source={{
                uri: getStaticAssetUrl('images/beta/rate-note.png'),
              }}
              style={styles.image}
              // resizeMode="contain"
              accessibilityIgnoresInvertColors
            />

            <Text style={styles.imageCaption}>
              Screenshot of Community Notes Rating Interface
            </Text>

            <Text style={styles.h3}>Writing Notes</Text>

            <Text style={styles.p}>
              At the bottom of the note rating page there is a "Write a Note"
              button.
            </Text>

            <Image
              source={{
                uri: getStaticAssetUrl('images/beta/rated-note.png'),
              }}
              style={styles.image}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.imageCaption}>
              Screenshot of Write a Note Button
            </Text>

            <Text style={styles.p}>
              This button will open the form for writing a new note.
            </Text>

            <Image
              source={{
                uri: getStaticAssetUrl('images/beta/add-a-note.png'),
              }}
              style={styles.image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.imageCaption}>
              Screenshot of Note Writing Interface
            </Text>

            <Text style={styles.p}>
              Please try to write helpful notes according to the{' '}
              <Link href="https://communitynotes.x.com/guide/en/contributing/examples">
                <Text>note writing guidelines</Text>
              </Link>{' '}
              page! After successfully submitting a note your note will show up
              in the{' '}
              <Link href="https://bluenotes.social/community-notes/new">
                <Text>New</Text>
              </Link>{' '}
              feed and have the status of "Needs more Ratings".
            </Text>

            <Text style={styles.h3}>Viewing Helpful Notes</Text>

            <Text style={styles.p}>
              Once the algorithm has rated a note as helpful, that note should
              be displayed wherever the corresponding post is displayed.
            </Text>

            <Image
              source={{
                uri: getStaticAssetUrl('images/beta/helpful-note.png'),
              }}
              style={styles.image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.imageCaption}>
              Screenshot of Helpful Note on a Post
            </Text>

            <Text style={styles.p}>
              To verify this, find posts that have notes that have been rated
              helpful (e.g. in the{' '}
              <Link href="https://bluenotes.social/community-notes/rated_helpful">
                <Text>Rated Helpful</Text>
              </Link>{' '}
              feed). Make sure that note is displayed wherever the post is
              displayed: when the post appears in search results, feeds, quote
              posts, etc.
            </Text>

            <Text style={styles.h2}>FAQs</Text>

            <Text style={styles.h3}>
              Will the main Bluesky app support Community Notes?
            </Text>

            <Text style={styles.p}>
              We hope so! This code has been written so that the Community Notes
              feature can easily be merged into the main Bluesky social app.
            </Text>

            <Text style={styles.h3}>Are notes and ratings anonymous?</Text>

            <Text style={styles.p}>
              Yes. All users are given an Anonymous ID, and notes/ratings
              records are written using this ID. See the{' '}
              <Link href="https://github.com/johnwarden/open-community-notes/tree/master/003-aids#readme">
                <Text>Anonymous ID (AID) Spec</Text>
              </Link>
            </Text>

            <Text style={styles.h2}>
              Are notes and ratings stored as atproto records?
            </Text>

            <Text style={styles.p}>
              Yes, records are written as vote and proposal records under the{' '}
              <Link href="https://github.com/johnwarden/open-community-notes/tree/master/002-lexicon#readme">
                <Text>pmsyk.social lexicon</Text>
              </Link>
              . For the beta this feature is temporarily switched off.
            </Text>

            <Text style={styles.h2}>Is Bluenotes a labeler?</Text>

            <Text style={styles.p}>
              Yes, Bluenotes does label posts that have notes. But you need to
              use the Bluenotes app or another Community Notes-enabled app to
              see the actual notes. The Bluenotes labeler is{' '}
              <Link href="https://bluenotes.social/profile/bluenotes-labeler.bsky.social">
                <Text>bluenotes-labeler.bsky.social</Text>
              </Link>
              . See the{' '}
              <Link href="https://github.com/johnwarden/open-community-notes/tree/master/004-labeling#readme">
                <Text>labeling architecture</Text>
              </Link>{' '}
              for more details
            </Text>

            <Text style={styles.h3}>Where is the Code?</Text>

            <Text style={styles.p}>
              Bluenotes App:{' '}
              <Link href="https://github.com/johnwarden/bluenotes#readme">
                <Text>github.com/johnwarden/bluenotes</Text>
              </Link>
            </Text>

            <Text style={styles.p}>
              Community Notes Algorithm:{' '}
              <Link href="https://github.com/twitter/communitynotes#readme">
                <Text>github.com/twitter/communitynotes</Text>
              </Link>{' '}
            </Text>

            <Text style={styles.h3}>What's Next After Phase 1?</Text>

            <Text style={styles.p}>
              Phase 2 will launch when we've collected enough data for the
              algorithm to consistently identify helpful notes. At that point,
              we'll make a larger push to attract more users and build a
              sustainable community.
            </Text>

            <Text style={styles.p}>
              As a Phase 1 pioneer, you'll be part of making that happen. Follow{' '}
              <Link href="https://bluenotes.social/profile/bluenotes.social">
                <Text>@bluenotes.social</Text>
              </Link>{' '}
              for progress updates.
            </Text>

            <Text style={styles.h2}>What is Community Notes?</Text>

            <Text style={styles.p}>
              Community Notes is a collaborative way to add helpful context to
              posts and keep people better informed, originally developed at
              Twitter. See the{' '}
              <Link href="https://communitynotes.x.com/guide/en/about/introduction">
                <Text>Community Notes Documentation on Twitter</Text>
              </Link>
              .
            </Text>

            <Text style={styles.h2}>What is the "Algorithm"?</Text>

            <Text style={styles.p}>
              Bluenotes uses Twitter's{' '}
              <Link href="https://github.com/twitter/communitynotes">
                <Text>open source Community Notes Algorithm</Text>
              </Link>{' '}
              for identifying helpful notes.
            </Text>

            <Text style={styles.p}>
              To understand how the algorithm identifies helpful notes, see the
              essay{' '}
              <Link href="https://jonathanwarden.com/understanding-community-notes/">
                <Text>Understanding Community Notes</Text>
              </Link>
              .
            </Text>

            <Text style={styles.h2}>Where is the code?</Text>

            <Text style={styles.p}>
              <Link href="https://github.com/johnwarden/social-app">
                <Text>Bluenotes Social App on Github</Text>
              </Link>{' '}
            </Text>

            <Text style={styles.h2}>What is Open Community Notes?</Text>

            <Text style={styles.p}>
              Open Community Notes is a high-level, federated architecture for a
              Community Notes system on top of ATProto. See the{' '}
              <Link href="https://github.com/johnwarden/open-community-notes/#readme">
                <Text>Open Community Notes Architecture Documents</Text>
              </Link>{' '}
            </Text>

            <Text style={styles.h2}>Who Created Bluenotes?</Text>

            <Text style={styles.p}>
              Bluenotes was developed independently by{' '}
              <Link href="https://jonathanwarden">
                <Text>Jonathan Warden</Text>
              </Link>
              , a reformed ad-tech engineer working independently on algorithms
              to make online conversations more intelligent and less polarized.
            </Text>

            {/*
            <Text style={styles.p}>
              todo: link to note-writing guidelines{'\n'}
            </Text>

*/}
          </View>
        </View>
        <View style={s.footerSpacer} />
      </ScrollView>
    </Layout.Screen>
  )
}

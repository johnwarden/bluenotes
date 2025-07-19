import {StyleSheet, Text, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePalette} from '#/lib/hooks/usePalette'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {niceDate} from '#/lib/strings/time'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import * as Dialog from '#/components/Dialog'
import {Link} from '#/components/Link'

export function NoteDetailsDialog({
  control,
  note,
}: {
  control: Dialog.DialogControlProps
  note: CommunityNote
}) {
  const pal = usePalette('default')
  const {i18n, _} = useLingui()

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.Inner label={_(msg`Note Details`)}>
        <Dialog.Close />
        <View style={styles.container}>
          <Text style={styles.title}>
            <Trans>Note Details</Trans>
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Trans>Current Status</Trans>
            </Text>
            <View style={styles.statusLine}>
              <Text style={styles.statusText}>• Needs more ratings</Text>
            </View>
            <Text style={styles.description}>
              This note hasn't yet been rated by enough contributors from
              different perspectives.
            </Text>
            <Link
              to="https://communitynotes.x.com/guide/en/contributing/notes-on-twitter"
              label={_(msg`Learn more about community notes`)}>
              <Text style={pal.link}>
                <Trans>Learn more</Trans>
              </Text>
            </Link>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Trans>Note Author</Trans>
            </Text>
            <View style={styles.authorLine}>
              <UserAvatar size={16} type="user" />
              <Text style={styles.authorText}>{note.author.pseudonym}</Text>
            </View>
            <Text style={styles.description}>
              {note.author.writingImpact} Writing Impact •{' '}
              {note.author.ratingImpact} Rating Impact
            </Text>
            {/* <Link
              to={note.author.profileUrl}
              label={_(msg`View profile of ${note.author.pseudonym}`)}>
              <Text style={pal.link}>
                <Trans>View profile</Trans>
              </Text>
            </Link> */}
          </View>

          <View style={[pal.border, styles.footer]}>
            <Text style={styles.footerText}>
              Note submitted {niceDate(i18n, new Date(note.createdAt))} • Note
              ID {note.noteId}
            </Text>
            <Link to={note.uri} label={_(msg`View source`)}>
              <Text style={[pal.link, styles.footerText]}>{note.uri}</Text>
            </Link>
          </View>
        </View>
      </Dialog.Inner>
    </Dialog.Outer>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgb(15, 20, 25)',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgb(15, 20, 25)',
    marginBottom: 8,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'rgb(15, 20, 25)',
  },
  description: {
    fontSize: 15,
    color: 'rgb(83, 100, 113)',
    marginBottom: 4,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  authorText: {
    fontSize: 15,
    color: 'rgb(15, 20, 25)',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 13,
    color: 'rgb(83, 100, 113)',
  },
})

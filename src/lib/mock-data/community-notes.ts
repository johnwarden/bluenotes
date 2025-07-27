import {faker} from '@faker-js/faker'

export interface CommunityNoteSubjectRef {
  uri: string
  cid?: string
}

export interface NoteAuthor {
  aid: string
  pseudonym: string
  writingImpact: number
  ratingImpact: number
  profileUrl: string
}

export interface CommunityNote {
  $type: 'org.opencommunitynotes.proposal'
  typ: 'post_label'
  subject: CommunityNoteSubjectRef
  label: string
  text: string
  createdAt: string
  noteId: string
  status: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
  uri: string
  author: NoteAuthor
}

export const mockNote: CommunityNote = {
  $type: 'org.opencommunitynotes.proposal',
  typ: 'post_label',
  subject: {
    uri: 'at://did:plc:xxxxxxxxxxxx/app.bsky.feed.post/3kabc123xyz',
    cid: 'bafyreibxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  label: 'context.factual_error',
  text: 'This post contains an incorrect statistic. The actual number is 42%, not 52%. Source: [https://example.com/stats](https://example.com/stats)',
  createdAt: new Date().toISOString(),
  noteId: '1939063431312875687',
  status: 'needs_more_ratings',
  uri: 'at://did:plc:xxxxxxxxxxxx/org.opencommunitynotes.proposal/3kprop123abc',
  author: {
    aid: 'anon:ab34fec9de56',
    pseudonym: 'Respectful Cave Falcon',
    writingImpact: 3,
    ratingImpact: 98,
    profileUrl: '#',
  },
}

export async function fetchNotes(_postId: string): Promise<CommunityNote[]> {
  // In a real implementation, this would fetch notes from the Community Notes PDS
  // For now, we return a list of mock notes.
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(
        Array.from({length: 5}, (_, index) => ({
          ...mockNote,
          uri: `${mockNote.uri.slice(0, -1)}${index}`, // Make each note have a unique URI
          noteId: `${mockNote.noteId}${index}`, // Also make noteId unique for good measure
          author: {
            ...mockNote.author,
            aid: `anon:${faker.string.hexadecimal({
              length: 12,
            })}`,
          },
          text: faker.lorem.paragraph(),
          createdAt: faker.date.recent().toISOString(),
        })),
      )
    }, 500)
  })
}

export async function submitVote(
  _noteId: string,
  _vote: 'helpful' | 'not_helpful' | 'somewhat_helpful',
  _reasons?: string[],
): Promise<void> {
  // This is a stub function. In a real implementation, it would submit
  // the vote to the Community Notes PDS.
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Vote submitted (mock)', {_noteId, _vote, _reasons})
      resolve()
    }, 300)
  })
}

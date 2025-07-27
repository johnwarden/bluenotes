import {type BskyAgent} from '@atproto/api'
import {sha256} from 'js-sha256'

type VoteValue = 'helpful' | 'somewhat_helpful' | 'not_helpful'

function mapVoteValue(value: VoteValue): 1 | 0 | -1 {
  switch (value) {
    case 'helpful':
      return 1
    case 'somewhat_helpful':
      return 0
    case 'not_helpful':
      return -1
  }
}

export async function createNoteRating(
  agent: BskyAgent,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  if (!agent.session) {
    throw new Error('Must be logged in to rate a note')
  }
  const aid = 'org.opencommunitynotes:' + sha256.hex(agent.session.did)

  const response = await agent.api.com.atproto.repo.createRecord({
    collection: 'org.opencommunitynotes.vote',
    repo: agent.session.did,
    record: {
      $type: 'org.opencommunitynotes.vote',
      uri: note.uri,
      ...(note.cid && {cid: note.cid}),
      val: mapVoteValue(value),
      reasons: reasons,
      aid: aid,
      createdAt: new Date().toISOString(),
    },
  })
  return response
}

export async function updateNoteRating(
  agent: BskyAgent,
  ratingUri: string,
  note: {uri: string; cid?: string},
  value: VoteValue,
  reasons: string[],
) {
  if (!agent.session) {
    throw new Error('Must be logged in to rate a note')
  }
  const aid = 'org.opencommunitynotes:' + sha256.hex(agent.session.did)
  const rkey = ratingUri.split('/').pop()
  if (!rkey) {
    throw new Error('Invalid rating URI')
  }

  return agent.api.com.atproto.repo.putRecord({
    collection: 'org.opencommunitynotes.vote',
    repo: agent.session.did,
    rkey: rkey,
    record: {
      $type: 'org.opencommunitynotes.vote',
      uri: note.uri,
      ...(note.cid && {cid: note.cid}),
      val: mapVoteValue(value),
      reasons: reasons,
      aid: aid,
      createdAt: new Date().toISOString(),
    },
  })
}

export async function deleteNoteRating(agent: BskyAgent, ratingUri: string) {
  if (!agent.session) {
    throw new Error('Must be logged in to delete a rating')
  }
  const rkey = ratingUri.split('/').pop()
  if (!rkey) {
    throw new Error('Invalid rating URI')
  }

  return agent.api.com.atproto.repo.deleteRecord({
    collection: 'org.opencommunitynotes.vote',
    repo: agent.session.did,
    rkey: rkey,
  })
}

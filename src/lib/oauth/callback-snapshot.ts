/**
 * Native: no window. Web implementation is callback-snapshot.web.ts.
 */
export function getSnapshottedOauthCallbackParams(): URLSearchParams | null {
  return null
}

export function oauthCallbackSnapshotRanBeforeStrip(): boolean {
  return false
}

export function oauthCallbackSnapshotHadParams(): boolean {
  return false
}

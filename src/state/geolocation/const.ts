import {type GeolocationStatus} from '#/state/geolocation/types'
import {type Device} from '#/storage'

export const GEOLOCATION_URL = process.env.GEOLOCATION_URL

/**
 * Default geolocation config.
 */
export const DEFAULT_GEOLOCATION_CONFIG: Device['geolocation'] = {
  countryCode: undefined,
  regionCode: undefined,
  ageRestrictedGeos: [],
  ageBlockedGeos: [],
}

/**
 * Default geolocation status.
 */
export const DEFAULT_GEOLOCATION_STATUS: GeolocationStatus = {
  countryCode: undefined,
  regionCode: undefined,
  isAgeRestrictedGeo: false,
  isAgeBlockedGeo: false,
}

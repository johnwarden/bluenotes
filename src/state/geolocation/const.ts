import {type GeolocationStatus} from '#/state/geolocation/types'
import {type Device} from '#/storage'

// export const IPCC_URL = `https://bsky.app/ipcc`
// export const BAPP_CONFIG_URL_PROD = `https://ip.bsky.app/config`
export const BAPP_CONFIG_URL = process.env.BAPP_CONFIG_URL
export const IPCC_URL = process.env.IPCC_HOST
export const GEOLOCATION_CONFIG_URL = BAPP_CONFIG_URL

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

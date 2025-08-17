# Community Notes: AppView API Specification

This document specifies the API for fetching community notes and their associated rating data from the AppView. It is designed to provide clients with the necessary information to display notes on a given subject and show the current user's rating, if available.

## 1. Endpoint: `social.pmsky.getNotes`

This endpoint retrieves all community notes associated with a specific content URI. It does not require authentication, but can optionally include user-specific rating data if a `aid` is provided.

### 1.1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uri` | `string` | Yes | The URI of the subject content (e.g., an AT-Proto post URI or an external URL). This does not need to be a strong reference. |
| `aid` | `string` | No | The anonymous ID of the user viewing the notes. If provided, the response will include a `viewer` object for each note, indicating if and how that user has rated it. |
| `limit` | `integer`| No | The maximum number of notes to return. Defaults to a server-defined limit (e.g., 50). |

### 1.2. Output

The endpoint returns an object containing a `notes` array.

#### 1.2.1. `Note` Object Structure

Each object in the `notes` array has the following structure:

| Field | Type | Description |
| :--- | :--- | :--- |
| `uri` | `string` | The AT-URI of the `social.pmsky.label` record. |
| `cid` | `string` | The CID of the `social.pmsky.label` record. |
| `author` | `object` | Information about the note's author. |
| `label` | `string` | The primary label string (e.g., `needs-context`). |
| `reason`| `string` | The specific reason for the label (e.g., `factual_error`). |
| `text` | `string` | The full text content of the note. |
| `createdAt` | `string` | The ISO 8601 timestamp of when the note was created. |
| `status` | `string` | The current consensus status of the note. Must be one of `'rated_helpful'`, `'rated_not_helpful'`, or `'needs_more_ratings'`. |
| `viewer` | `object` | **Optional.** Included only if `aid` was provided in the request and a rating by that user exists for the note. |

#### 1.2.2. `author` Object Structure

| Field | Type | Description |
| :--- | :--- | :--- |
| `aid` | `string` | The persistent, anonymous identifier of the note's author. |
| `pseudonym`| `string` | **Optional.** A system-generated pseudonym for the author (e.g., "Helpful Hedgehog"). |

#### 1.2.3. `viewer` Object Structure

| Field | Type | Description |
| :--- | :--- | :--- |
| `rating` | `string` | The rating value cast by the viewer. Must be one of `'helpful'`, `'somewhat_helpful'`, or `'not_helpful'`. |
| `reasons`| `string[]` | An array of predefined reasons justifying the rating. |
| `uri` | `string` | The AT-URI of the viewer's `social.pmsky.rating` record, which is necessary for client-side updates or deletions. |

### 1.3. Example Response

```json
{
  "notes": [
    {
      "uri": "at://did:plc:pds_host_did/social.pmsky.label/3klabelrecordkey",
      "cid": "bafyreidddddddddddddddddddddddddddddddddddd",
      "author": {
        "aid": "social.pmsky:ab34fec9de56",
        "pseudonym": "Helpful Hedgehog"
      },
      "label": "needs-context",
      "reason": "factual_error",
      "text": "This post contains an incorrect statistic. The actual number is 42%, not 52%.",
      "createdAt": "2025-06-25T19:00:00.000Z",
      "status": "rated_helpful",
      "viewer": {
        "rating": "helpful",
        "reasons": ["cites_high_quality_sources"],
        "uri": "at://did:plc:user_pds_did/social.pmsky.rating/3kratingrecordkey"
      }
    }
  ]
}
```

## 2. Out of Scope for this Specification

- **Pagination:** The API does not currently support pagination. Clients should handle cases where the number of notes exceeds the `limit`.
- **Sorting:** The sorting order of the returned notes is not defined. The client should not assume any particular order.
- **Disputes:** The API does not yet support the "labeling a label" dispute mechanism.
- **Error Handling:** Specific error types and codes are not defined in this version. Clients should handle generic network or server errors gracefully.
- **AppView Implementation:** This document does not specify how the AppView should gather, score, or cache the note and rating data. 
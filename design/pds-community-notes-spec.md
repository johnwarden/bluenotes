# PDS Specification: Open Community Notes Integration

This document specifies the necessary changes for a standard Personal Data Server (PDS) to support Open Community Notes. The focus is on enabling users to create, update, and delete ratings on community notes, which are stored as records in their own data repositories.

This specification is a companion to the [Client-Side Integration Spec](./rate-proposed-community-notes-pds-integration-spec.md) and the [Open Community Notes Lexicon](./proposals/002-lexicon/README.md).

## 1. Overview of PDS Responsibilities

The PDS's role is to act as a durable, verifiable host for a user's note ratings. The implementation philosophy is to leverage the existing AT Protocol framework as much as possible, minimizing the need for custom logic.

The PDS **does not** require any new or custom XRPC endpoints. All interactions will use the standard `com.atproto.repo` methods:

*   `com.atproto.repo.createRecord`
*   `com.atproto.repo.putRecord`
*   `com.atproto.repo.deleteRecord`

The primary responsibilities of the PDS are:
1.  **Lexicon Awareness**: Ingesting and understanding the new `social.pmsky` lexicon.
2.  **Record Validation**: Enforcing strict validation on incoming `social.pmsky.rating` records to ensure data integrity.

## 2. Lexicon Installation

To process and validate community notes records, the PDS must have the following lexicon schemas installed:

1.  `social.pmsky.label`
2.  `social.pmsky.rating`

The PDS will use these schemas to validate the structure of records during write operations.

## 3. Record Validation: `social.pmsky.rating`

The PDS MUST enforce the following validation rules upon receiving a `createRecord` or `putRecord` request for an `social.pmsky.rating` record.

### 3.1. Field-Level Validation

| Field | Type | Rules |
| :--- | :--- | :--- |
| `subject` | `com.atproto.repo.strongRef` | **Required.** Must be a valid strong reference to an existing `social.pmsky.label` record. The PDS should verify that the target `uri` and `cid` exist and correspond to a record of the correct type. |
| `val` | `string` | **Required.** The value must be one of `"helpful"`, `"somewhat_helpful"`, or `"not_helpful"`. |
| `reasons` | `string[]` | **Optional.** If present, the PDS must validate its contents based on the value of the `val` field. See section 3.2. |
| `aid` | `string` | **Required.** The value must be a deterministically generated anonymous ID. See section 4 for validation rules. |
| `createdAt` | `string` (datetime) | **Required.** Must be a valid ISO 8601 formatted datetime string. |

### 3.2. Conditional Validation for `reasons`

The `reasons` field provides additional context for a rating. Its allowed values are conditional on the `val` field.

**If `val` is `"helpful"` or `"somewhat_helpful"`, `reasons` may contain:**
* `cites_high_quality_sources`
* `is_clear`
* `addresses_claim`
* `provides_important_context`
* `is_unbiased`
* `other`

**If `val` is `"not_helpful"`, `reasons` may contain:**
* `sources_missing_or_unreliable`
* `sources_dont_support_note`
* `is_incorrect`
* `is_opinion_or_speculation`
* `is_hard_to_understand`
* `is_off_topic_or_irrelevant`
* `is_argumentative_or_biased`
* `note_not_needed`
* `is_spam_harassment_or_abuse`
* `other`

The PDS must reject any record where the `reasons` array contains values not permitted for the given `val`.

## 4. `aid` Validation

To ensure anonymity and prevent trivial spoofing, the PDS MUST validate the `aid` field. The `aid` is derived from the user's DID, which is known to the PDS from the authenticated session authorizing the write operation.

1.  **Get Authenticated User's DID**: The PDS must identify the DID of the user making the `createRecord`/`putRecord` request.
2.  **Derive Expected `aid`**: The PDS will compute the expected `aid` using the same method as the client:
    ```
    expected_aid = "social.pmsky:" + sha256_hex(user.did)
    ```
3.  **Compare and Verify**: The PDS must compare the `aid` field in the incoming record with the `expected_aid`. If they do not match exactly, the request MUST be rejected with an `InvalidRequest` error.

This server-side validation is critical. It proves that the rating was created by the owner of the DID and prevents a malicious actor from creating ratings with another user's `aid`.

## 5. Security and Privacy Considerations

The `aid` provides pseudonymity. While it is derived from a public DID, the SHA-256 hash makes reversing it to find the original DID computationally difficult.

The PDS **must not** create any indexes or API endpoints that allow for reverse-lookups (i.e., resolving an `aid` back to a DID). The purpose of the `aid` is to create a persistent but separate identity for community notes contributions, and the PDS must not compromise this separation. 
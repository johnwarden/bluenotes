# Community Notes Data Service API Specification

This document provides a detailed specification for the Community Notes Data Service API. This service is responsible for managing notes and ratings within the Community Notes system.

## Authentication and Authorization

The Community Notes Data Service uses a delegated authentication model. It does not handle user logins directly. Instead, it relies on the user's Personal Data Server (PDS) for primary authentication.

### Authentication Flow

1.  **Client-Side Authentication**: A user authenticates with their PDS via a client application, which receives a standard `accessJwt`.
2.  **API Requests**: For all authenticated endpoints, the client must include this `accessJwt` in the `Authorization` header of the request to the Community Notes service, using the `Bearer` scheme.

    `Authorization: Bearer <accessJwt>`

3.  **Server-Side Verification**: The Community Notes service verifies the token by making a request to the `com.atproto.server.getSession` endpoint on the user's PDS. If the PDS confirms the token is valid and returns the user's DID, the Community Notes service considers the user authenticated.

### Authorization

Once a user is authenticated, the Community Notes service will perform additional authorization checks based on its own business logic. For example, to write a note, a user must have a sufficient "rating impact score."

## API Endpoints

All endpoints are rooted at `/xrpc/social.pmsky`.

### `org.opencommunitynotes.createProposal`

Creates a new note on a piece of content.

*   **Method**: `POST`
*   **Lexicon**: `social.pmsky.label` (A note is a specific type of label)
*   **Authentication**: Required.
*   **Authorization**:
    *   The user must have a "rating impact score" above the required threshold.
*   **Request Body**:
    *   A valid `social.pmsky.label` record.
*   **Response**:
    *   **200 OK**: The note was successfully created. The body will contain a strong reference to the newly created note record.

### `org.opencommunitynotes.rateProposal`

Creates, updates, or deletes a rating on a note.

*   **Method**: `POST`
*   **Lexicon**: `social.pmsky.rating`
*   **Authentication**: Required.
*   **Authorization**:
    *   The user must have a "rating impact score" above the required threshold for rating.
*   **Request Body**:
    *   A valid `social.pmsky.rating` record. To delete a rating, the `val` should be set to an empty string.
*   **Response**:
    *   **200 OK**: The rating was successfully created/updated/deleted. The body will contain a strong reference to the rating record.

### `org.opencommunitynotes.getProposalsForSubject`

Retrieves all notes for a given subject (e.g., a post URI).

*   **Method**: `GET`
*   **Authentication**: Optional. If an `Authorization` header is provided, the response will include the viewer's rating on each note.
*   **Parameters**:
    *   `uri` (string, required): The URI of the subject content.
*   **Response**:
    *   **200 OK**: An array of `NoteView` objects. A `NoteView` is a `social.pmsky.label` record hydrated with the viewer's rating (if authenticated) and other relevant metadata.


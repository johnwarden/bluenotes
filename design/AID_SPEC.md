# Anonymous ID (AID) Specification

This document describes the Anonymous ID (AID) system for the Community Notes service, including generation, validation, and security properties.

## Overview

Anonymous IDs (AIDs) are pseudonymous identifiers that allow users to create and rate Community Notes while maintaining privacy. AIDs are generated deterministically from user DIDs using the service's private key as a secret salt.

## AID Format

24-character base32-encoded strings (like PLC DIDs), representing the first 120 bits of a SHA256 hash.

## AID Generation

SHA256 of user DID with the service's private key as a secret salt:

## Security Properties

The AID generation provides the following security properties:

1. **Rainbow table resistant**: The service private key prevents pre-computation attacks, or from simply guessing who a note author or rater might be and simply hashing their DID to verify.
2. **Service-specific**: Different services with different keys produce different AIDs for the same user
3. **Deterministic**: Same inputs always produce the same AID
4. **Stable**: AIDs remain constant as long as the service private key is stable

## Service ID Space Separation

Since AIDs are generated per-service, the same user should have different AIDs on different Community Notes services.

However, there is no way that a third-party can validate generated AIDs (not knowing the secret salt of the service). A malicious service could intentionally use an AID corresponding to a user on a different service.

So it is essentially that when running the algorithm, AIDs are prefixed with the service DID. They can then be hashed into a smaller integer for processing.

## Security Notes

### Private Key Management

- **Single key usage**: The service's AT Protocol private key is used for both record signing and AID generation
- **Key rotation impact**: Rotating the service private key will change all AIDs
- **Store securely**: Use the same security practices as other AT Protocol service keys
- **Backup safely**: Key loss makes existing AIDs unverifiable

### Migration Considerations

If the service private key must be rotated:

1. **Dual-key period**: Support both old and new keys temporarily
2. **Migrate AIDs**: Re-issue all notes/votes with new AIDs
3. **Update references**: Update all internal mappings
4. **Coordinate with consumers**: Notify data consumers of the AID changes

This should be extremely rare due to the impact on the anonymous identity system.



## Usage Examples

### Creating a Note

```typescript
// User authentication provides their DID
const userDid = authResult.did

// Service configuration
const serviceDid = ctx.serviceAccount.did
const servicePrivateKey = ctx.serviceAccount.key

// Generate AID for this user on this service
const creatorAid = generateAid(userDid, servicePrivateKey)

// Create note with AID
const noteRecord = {
  $type: 'social.pmsky.proposal',
  createdAt: new Date().toISOString(),
  creatorAid, // Base32 string: "mfrgg3dfmfrge2dfmfrgha"
  text: 'This claim needs more context...',
  // ... other fields
}
```

### Consumer Data Processing

```typescript
// Option 1: Prefix with service DID for global uniqueness
const globalAid = `${serviceDid}:${aid}` // "did:web:service:mfrgg3dfmfrge2dfmfrgha"

// Option 2: Hash service DID into AID for fixed-length global ID
const globalAidHash = createHash('sha256')
  .update(serviceDid)
  .update(aid)
  .digest()
const globalAid = base32.baseEncode(globalAidHash.subarray(0, 15)) // "nfrgh4dfnfrge3dfnfrhg4df"

// Option 3: Service-aware processing
const votesByService = {
  'did:web:service1': { mfrgg3dfmfrge2dfmfrgha: [...votes] },
  'did:web:service2': { nfrgh4dfnfrge3dfnfrhg4df: [...votes] },
}
```

This system provides strong privacy and security properties while remaining simple and allowing data consumers flexibility in handling cross-service identity correlation.

## ADDED Requirements

### Requirement: Valid users can register
The system SHALL register a user with a normalized email, display name, and a
password containing 15 through 64 characters inclusive. Unicode and whitespace
SHALL be accepted and no character-class composition rule SHALL be imposed.

#### Scenario: Successful registration
- **WHEN** a visitor submits a valid name, a new email, and a valid password
- **THEN** the system creates an enabled user and returns a successful response without exposing a password value

#### Scenario: Invalid registration input
- **WHEN** a visitor submits an invalid email, blank name, or password outside the declared length range
- **THEN** the system rejects the request with `BAD_REQUEST` and field-level validation information

#### Scenario: Duplicate registration
- **WHEN** a visitor submits an email already registered after normalization
- **THEN** the system rejects the request with `CONFLICT` and the stable code `EMAIL_ALREADY_REGISTERED`

### Requirement: Login returns a reusable credential
The system SHALL authenticate enabled users with email and password and SHALL
issue a database-backed session in an HttpOnly cookie for subsequent calls.

#### Scenario: Successful login
- **WHEN** an enabled user submits the correct email and password
- **THEN** the system creates a session credential and authenticated tRPC calls resolve that user

#### Scenario: Generic login failure
- **WHEN** the email is unknown, the password is wrong, or the matching user is disabled
- **THEN** the system returns the same `UNAUTHORIZED` status and public `INVALID_CREDENTIALS` message

### Requirement: Disabled users lose access
The system SHALL reject disabled users and SHALL revoke their active sessions
when an administrator disables them.

#### Scenario: Existing session is revoked
- **WHEN** an administrator disables a user who has an active session
- **THEN** the session is deleted and the next protected call is rejected as `UNAUTHORIZED`

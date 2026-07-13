## ADDED Requirements

### Requirement: Authorized administrators can inspect users
The system SHALL allow callers with `user:read` to list users with enabled
status, assigned roles, and assigned regions, and SHALL reject other callers.

#### Scenario: User list includes reverse relationships
- **WHEN** an authorized administrator lists users
- **THEN** each result includes its current role and region assignments

#### Scenario: User list is permission protected
- **WHEN** an authenticated caller without `user:read` lists users
- **THEN** the system rejects the request with `FORBIDDEN`

### Requirement: Authorized administrators can update user state
The system SHALL allow callers with `user:update` to change a display name and
enable or disable a user. Email and password changes are outside this contract.

#### Scenario: Display name update
- **WHEN** an authorized administrator submits a nonblank display name
- **THEN** the system stores and returns the updated user

#### Scenario: Enable user
- **WHEN** an authorized administrator enables a disabled user
- **THEN** the user may authenticate again with valid credentials

### Requirement: User-side assignments are transactional
The system SHALL allow callers with the corresponding management permission to
replace a user's role or region ID set atomically.

#### Scenario: Replace user roles
- **WHEN** an authorized caller submits a valid desired role ID set
- **THEN** the system adds and removes `UserRole` rows in one transaction and both user and role queries reflect the result

#### Scenario: Reject unknown assignment IDs
- **WHEN** an assignment request contains any unknown role or region ID
- **THEN** the system rejects the entire request with `BAD_REQUEST` and leaves all prior assignments unchanged

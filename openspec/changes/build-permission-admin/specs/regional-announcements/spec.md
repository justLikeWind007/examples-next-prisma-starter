## ADDED Requirements

### Requirement: Announcements belong to a region
The system SHALL require every announcement to have a valid region, title, and
content and SHALL record its creating user.

#### Scenario: Create announcement inside scope
- **WHEN** a caller with `announcement:write` creates an announcement for an assigned region
- **THEN** the system persists and returns the regional announcement

#### Scenario: Create announcement outside scope
- **WHEN** a caller with `announcement:write` targets an unassigned region
- **THEN** the system rejects the request with `FORBIDDEN` and creates nothing

### Requirement: Announcement reads enforce permission and data scope
The system SHALL require `announcement:read` and SHALL constrain list and detail
queries to the current user's assigned region IDs in Prisma.

#### Scenario: List only in-scope announcements
- **WHEN** a user scoped only to Chongqing lists announcements while Chongqing and Beijing records exist
- **THEN** the response contains Chongqing records and contains no Beijing record or metadata

#### Scenario: Direct cross-region detail lookup
- **WHEN** a user requests an announcement ID outside the user's regional scope
- **THEN** the system returns `NOT_FOUND` without disclosing that the record exists

#### Scenario: Missing read permission
- **WHEN** an authenticated user without `announcement:read` lists announcements
- **THEN** the system returns `FORBIDDEN`

### Requirement: Announcement management enforces permission and data scope
The system SHALL require `announcement:write` and an in-scope target record for
updates and deletion.

#### Scenario: Update in-scope announcement
- **WHEN** a caller with write permission updates an announcement in an assigned region using valid input
- **THEN** the system stores and returns the changed values

#### Scenario: Delete cross-region announcement
- **WHEN** a caller with write permission deletes an announcement outside the caller's regional scope
- **THEN** the system returns `NOT_FOUND` and preserves the announcement

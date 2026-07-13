## ADDED Requirements

### Requirement: Roles and permission points are manageable
The system SHALL support create, read, update, and delete for roles and
functional permission points through protected tRPC procedures.

#### Scenario: Create unique role and permission codes
- **WHEN** an authorized caller creates valid unique role and permission codes
- **THEN** the system persists and returns both records

#### Scenario: Duplicate code is rejected
- **WHEN** an authorized caller creates a role or permission with an existing normalized code
- **THEN** the system rejects the request with `CONFLICT`

### Requirement: Role relationships are bidirectional
The system SHALL maintain one `UserRole` relationship visible from both user
and role queries and one `RolePermission` relationship visible from both role
and permission queries.

#### Scenario: Role-side user assignment
- **WHEN** an authorized caller replaces a role's user ID set
- **THEN** role lookup and every affected user lookup show the same assignments

#### Scenario: Role permission assignment and removal
- **WHEN** an authorized caller replaces a role's permission ID set
- **THEN** role and permission reverse queries reflect every addition and removal

### Requirement: Functional permissions protect interfaces
The system SHALL derive a user's effective permission codes as the union of all
permissions from all assigned roles and SHALL validate required permissions on
every protected procedure.

#### Scenario: Authorized action
- **WHEN** a user's effective permission set contains the procedure's required code
- **THEN** the procedure continues to its business behavior

#### Scenario: Unauthorized action
- **WHEN** an authenticated user's effective permission set lacks the required code
- **THEN** the procedure returns `FORBIDDEN` without performing the operation

### Requirement: Referenced roles and permissions cannot be deleted
The system SHALL reject deletion of any role assigned to users or permissions
and any permission assigned to roles.

#### Scenario: Delete referenced role
- **WHEN** an authorized caller deletes a role with any user or permission association
- **THEN** the system returns `CONFLICT` with `RESOURCE_IN_USE` and preserves all data

#### Scenario: Delete unreferenced permission
- **WHEN** an authorized caller deletes a permission with no role association
- **THEN** the system deletes it and subsequent lookup does not return it

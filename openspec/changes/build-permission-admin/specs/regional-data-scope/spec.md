## ADDED Requirements

### Requirement: Regions are manageable scope units
The system SHALL support protected create, read, update, and delete operations
for uniquely coded regions.

#### Scenario: Region lookup includes references
- **WHEN** an authorized caller lists regions
- **THEN** each region includes assigned users and its announcement count

### Requirement: User regional scopes are reversible and queryable
The system SHALL keep user-to-region scope in one `UserRegion` relationship and
SHALL support assignment, removal, and reverse lookup.

#### Scenario: Assign and remove regional scope
- **WHEN** an authorized caller replaces a user's region ID set
- **THEN** user and region queries show exactly the desired relationships

#### Scenario: Empty regional scope
- **WHEN** an enabled authenticated user has no assigned region
- **THEN** all region-scoped announcement queries return no records

### Requirement: Referenced regions cannot be deleted
The system SHALL reject deletion of a region referenced by any user scope or
announcement and SHALL preserve all references.

#### Scenario: Delete referenced region
- **WHEN** an authorized caller deletes a region with users or announcements
- **THEN** the system returns `CONFLICT` with `RESOURCE_IN_USE` and reference counts

#### Scenario: Delete unreferenced region
- **WHEN** an authorized caller deletes a region with no users or announcements
- **THEN** the system deletes the region successfully

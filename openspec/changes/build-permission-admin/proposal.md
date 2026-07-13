## Why

The starter application exposes every procedure publicly and has no identity,
authorization, or data-scope model. The assessment requires a complete,
auditable permission administration workflow whose negative paths are as
explicit as its successful paths.

## What Changes

- Add email/password registration, login, database-backed sessions, and a
  disabled-user lifecycle.
- Add user administration with role and regional-scope assignments.
- Add role and functional-permission CRUD plus bidirectional relationship
  maintenance and reverse lookup.
- Add region CRUD and regional data-scope assignments.
- Add regional announcements protected by both functional permissions and
  server-side region filtering.
- Add declared conflict behavior for deleting referenced roles, permissions,
  and regions.
- Replace the starter screen with an authenticated, operational admin UI and
  add integration and browser-level acceptance evidence.

## Capabilities

### New Capabilities

- `user-authentication`: Registration, login, session handling, generic login
  failures, and disabled-user enforcement.
- `user-administration`: User listing, profile update, enable/disable, and
  role/region assignment views.
- `functional-authorization`: Role and permission-point management, relation
  maintenance, reverse lookup, and interface-level enforcement.
- `regional-data-scope`: Region management and user-to-region data scopes with
  safe referenced-record deletion behavior.
- `regional-announcements`: Announcement CRUD constrained by both permission
  codes and the current user's regional scope.

### Modified Capabilities

None. The repository has no existing OpenSpec capabilities.

## Impact

- Prisma schema, migrations, and seed data gain authentication, RBAC, region,
  and announcement entities.
- tRPC context and procedures gain session and authorization middleware.
- New authentication and admin pages replace the public post demo as the
  primary product workflow.
- New dependencies include Better Auth for authentication and Lucide React for
  interface icons; existing Zod, Prisma, Vitest, and Playwright remain the
  validation and evidence toolchain.

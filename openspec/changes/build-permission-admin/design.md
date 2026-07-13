## Context

The repository is a Next.js Pages Router application with tRPC, Prisma,
PostgreSQL, Zod, Vitest, and Playwright. It currently has one public `Post`
router, an empty request context, and no identity or authorization boundary.
The assessment values declared behavior and observable negative-path evidence
over framework breadth.

## Goals / Non-Goals

**Goals:**

- Provide secure, database-backed email/password authentication and sessions.
- Make every protected operation enforce explicit functional permissions.
- Make every announcement read/write query enforce regional data scope at the
  database boundary.
- Keep each many-to-many relationship as one source of truth while supporting
  maintenance and reverse lookup from both participating modules.
- Produce repeatable integration and browser evidence for the declared contract.

**Non-Goals:**

- Password reset, email verification, MFA, SSO, role hierarchy, explicit deny
  rules, audit-log retention, and production rate limiting.
- Deleting users. Users are disabled to preserve authorship and relationships.
- A generic policy engine. The assessment's RBAC and regional rules remain
  visible in tRPC middleware and Prisma queries.

## Decisions

### Better Auth owns authentication only

Better Auth will provide email/password credentials, a Prisma adapter,
database sessions, secure cookies, and session lookup. A public tRPC
registration wrapper will normalize email, apply the declared Zod contract,
and translate duplicate registration into a stable `CONFLICT` response.
Login uses the Better Auth client and maps nonexistent user, wrong password,
and disabled user to one public `INVALID_CREDENTIALS` response.

The password contract is 15-64 characters, permits Unicode and whitespace,
and has no composition rule. Better Auth hashes passwords; plaintext passwords
are never stored by application models.

### tRPC context is the authorization boundary

Every request resolves the Better Auth session and reloads the enabled user,
role permission codes, and region IDs from Prisma. `protectedProcedure`
requires a live enabled user. `requirePermission(code)` composes a second
middleware and returns `FORBIDDEN` for a missing permission. Disabling a user
deletes all database sessions in the same transaction.

### RBAC and regional scope are explicit

`UserRole`, `RolePermission`, and `UserRegion` are explicit join models with
composite primary keys. Assignment mutations receive the desired ID set,
validate every referenced record, then replace the relation in one transaction.
Both sides read the same join table.

Announcement procedures first require a functional permission and then add
`regionId IN currentUser.regionIds` directly to Prisma queries. List, detail,
update, and delete all apply the same object-level constraint. There is no role
name or hidden administrator bypass.

### Referenced master data uses restrict semantics

Role, Permission, and Region deletion checks reference counts and returns
`CONFLICT` with a stable `RESOURCE_IN_USE` message when any association exists.
Database foreign keys use `Restrict` as a final integrity boundary. Callers
must explicitly unbind or migrate records before deletion.

### Tests follow vertical slices

Vitest callers exercise public tRPC procedures against the training database.
Pure password/input boundaries use public registration behavior. Playwright
keeps only core user journeys: login, assignment consistency, permission
denial, and cross-region announcement invisibility. Generated tests remain
human-reviewed; skipped/healed tests do not count as passing acceptance.

## Risks / Trade-offs

- **Authentication library schema conflicts with domain relations** -> Generate
  and review Better Auth models before adding custom relations; keep one Prisma
  client and one `User` model.
- **Authorization state becomes stale** -> Reload enabled status, permission
  codes, and region IDs from Prisma on each tRPC request.
- **Parallel tests mutate shared assignments** -> Seed stable identities and
  use unique records plus deterministic reset helpers for mutating suites.
- **Registration reveals account existence** -> This is an explicit assessment
  requirement; login remains generic and does not reveal existence or status.
- **UI-only permission checks are bypassable** -> UI visibility is convenience
  only; every server procedure performs its own check.

## Migration Plan

1. Apply the new Prisma migration to the isolated assessment database.
2. Seed permission codes, an administrator role, regions, and test identities.
3. Generate Prisma Client and run registration/session integration tests.
4. Run all router tests, build, and Playwright against the seeded database.
5. Roll back locally by resetting the isolated training database; no production
   migration or data preservation is in scope.

## Open Questions

None. All ambiguous assessment behaviors are declared in the capability specs.

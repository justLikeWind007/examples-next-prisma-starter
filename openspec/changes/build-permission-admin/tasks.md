## 1. Foundation

- [x] 1.1 Add Better Auth and UI dependencies plus reproducible local environment scripts
- [x] 1.2 Add authentication, RBAC, region, and announcement Prisma models and migration
- [x] 1.3 Seed administrator, limited users, roles, permissions, regions, and announcements

## 2. Authentication and User Administration

- [x] 2.1 Add failing registration and login/session contract tests
- [x] 2.2 Implement Better Auth configuration, registration wrapper, session context, and protected procedure
- [x] 2.3 Add failing user list, update, disable, and session-revocation tests
- [x] 2.4 Implement permission-protected user administration procedures

## 3. Functional Authorization

- [x] 3.1 Add failing role, permission, bidirectional-assignment, and deletion-conflict tests
- [x] 3.2 Implement role and permission CRUD, relation transactions, and permission middleware

## 4. Regional Data Scope

- [x] 4.1 Add failing region, user-scope, reverse-lookup, and deletion-conflict tests
- [x] 4.2 Implement region CRUD and transactional user-region assignment procedures

## 5. Regional Announcements

- [x] 5.1 Add failing permission and cross-region announcement tests
- [x] 5.2 Implement announcement CRUD with functional and Prisma-level regional constraints

## 6. Product Interface

- [x] 6.1 Build registration and login pages with stable, accessible feedback
- [x] 6.2 Build the operational admin workspace for users, roles, permissions, regions, and announcements
- [x] 6.3 Add permission-aware navigation and relationship maintenance from both relevant views

## 7. Acceptance and Delivery

- [x] 7.1 Add Playwright seed/fixtures and core authentication/authorization E2E scenarios
- [x] 7.2 Run lint, typecheck, integration tests, production build, and Playwright with trace evidence
- [x] 7.3 Validate OpenSpec, reconcile implementation with every declared scenario, and update the README

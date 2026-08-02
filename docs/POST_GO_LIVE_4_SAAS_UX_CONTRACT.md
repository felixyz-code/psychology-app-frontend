# POST-GO-LIVE.4 — SaaS User Experience Contract

## Formal status

```text
PHASE: POST-GO-LIVE.4 — SaaS User Experience
STATUS: CONTRACT DOCUMENTED
IMPLEMENTATION: NOT STARTED
PRODUCTION ROLLOUT: NOT AUTHORIZED
PRIMARY REPOSITORY: frontend
SECONDARY REPOSITORY: backend
READINESS TARGET: SAAS DEMO-READY
```

This document is the frontend half of the paired contract with
`backend/docs/POST_GO_LIVE_4_FRONTEND_INTEGRATION_CONTRACT.md`. It records
architecture and UX behavior only. It authorizes no TypeScript, route, store,
interceptor, schema, API, migration, seed, test, workflow, infrastructure, or
production change.

## Repository baselines

The preflight was performed in the canonical repositories before branch
creation:

| Repository | Baseline branch | Baseline HEAD | Upstream | Ahead/behind | Working tree |
| --- | --- | --- | --- | --- | --- |
| frontend | `development` | `1e04dac1e762e0c020243dc18c6276eb764a008a` | `origin/development` | `0/0` | clean |
| backend | `development` | `f6bdea366251b34db760dc85edb69bd9e86e075a` | `origin/development` | `0/0` | clean |

The frontend contract branch is
`codex/post-go-live-4-0-saas-ux-contract`. The detached Codex worktree was
dirty and was intentionally left untouched; it is not a canonical baseline.

## Objective and readiness boundary

Phase 4 converts the certified multi-tenant backend into a frontend experience
that is secure, consistent, responsive, accessible, demonstrable, resistant to
concurrency, and free of visual cross-tenant leakage. The outcome is:

```text
SAAS DEMO-READY
```

This does not mean `PRIVATE-BETA-READY`, `PUBLIC-BETA-READY`, or
`PRODUCTION-READY`. The next maximum gate is
`NEXT-PHASE-B2-R1 — Independent Contract Review`.

## Scope

The contract covers tenant context, organization selection,
`X-Organization-Id`, preferred organization, cross-tenant invalidation,
organization administration, memberships, invitations, ownership transfer,
public freelancer signup, authorization UX, suspended and revoked states,
error handling, responsive and accessible presentation, observability, and
frontend certification.

## Explicit exclusions

The following remain outside Phase 4: branding, logo, assets, themes, password
reset, email verification, refresh tokens, session revocation, MFA, email
provider, transactional email, TLS, domain, external backups, alerts, WAF,
production rollout, billing, plans, subscriptions, trials, entitlements, SSO,
SCIM, patient portal, and clinical redesign. Infrastructure is reference-only.

## Closed authority rules

These rules are inherited and non-negotiable:

* JWT is identity-only. It contains no organization, membership, tenant,
  tenant-role, capability, or preferred-organization authority.
* `X-Organization-Id` is the request-time tenant selector and authority input;
  the backend validates the authenticated user, an `ACTIVE` membership, and an
  `ACTIVE` organization for normal tenant-aware work.
* `preferredOrganizationId` is UX-only. It never authorizes, selects a tenant
  by itself, or replaces `X-Organization-Id`; a stale preference is treated as
  `null`.
* The backend remains the final authorization authority. Hiding a control is
  an interaction affordance, not authorization.
* Ownership is role-based. There is no persisted primary-owner marker. A
  transfer is `source OWNER -> ADMIN` and `target ACTIVE membership -> OWNER`.
* Cross-tenant failures are redacted so the UI never reveals that a resource
  exists in another tenant.

## TenantContextStore

The conceptual `TenantContextStore` owns the confirmed tenant lifecycle. It is
an Angular signal-based store coordinated with `AuthStore`, the request
interceptor, router guards, and all tenant-aware feature stores. It is not a
second authorization engine.

### State model

The implementation must preserve these semantic distinctions, even if names
are adapted to local conventions:

| State | Meaning | Tenant-aware rendering |
| --- | --- | --- |
| `UNINITIALIZED` | No context attempt in this tab | Blocked |
| `LOADING` | Initial context resolution is in progress | Blocked |
| `READY` / `ACTIVE_TENANT_READY` | Confirmed active organization and membership | Allowed |
| `SWITCHING` | A generation is replacing the confirmed tenant | Blocked; old data is hidden |
| `EMPTY` / `NO_ACTIVE_TENANT` | No active selectable membership | Only empty/no-membership UX |
| `ADMIN_SUSPENDED_CONTEXT` | Suspended organization is visible for administration only | Operational tenant data blocked |
| `FORBIDDEN` | Authenticated user cannot use the requested context | Blocked |
| `ERROR` | Context load or switch failed without a safe confirmed result | Blocked; recovery UX |

`SUSPENDED` must never be presented as a normal operational tenant. A
suspended organization is an administrative context only, with an explicit
route and shell that cannot load clinical or operational tenant data.

### Store responsibilities

The store exposes conceptually:

* signals for `status`, confirmed `selectedOrganizationId`, candidate ID,
  `switchGeneration`, tenant metadata, membership, capabilities, and the last
  typed error;
* computed signals such as `hasActiveTenant`, `isSwitching`, `isSuspendedAdmin`
  and `can(capability)`;
* actions for `initialize`, `selectCandidate`, `confirm`, `resetTenantState`,
  `handleAccessLost`, and `clear`;
* one lifecycle for initial load, switching, rollback, logout, preference
  writes, and multi-tab notifications;
* coordination hooks for clearing dashboard, patients, case files, session
  notes, documents, appointments, finance, reports, organization admin,
  memberships, invitations, dialogs, and open forms.

Feature stores consume the confirmed context and generation. They do not read a
URL or preference as authority and do not keep data after a reset.

## Source of truth and persistence

| Value | Authority/lifetime |
| --- | --- |
| `candidateOrganizationId` | Ephemeral value during validation only |
| confirmed `selectedOrganizationId` | In-memory signal after backend confirmation |
| `sessionStorage` | Per-tab persistence written only after confirmation |
| `preferredOrganizationId` | Backend UX preference; never authority |
| URL | Navigation/deep-link input only; never authority |
| interceptor | Consumer of the confirmed store, not a selector |

The mandatory order is:

```text
candidateOrganizationId
→ contextual request validated
→ membership and organization confirmed
→ selectedOrganizationId confirmed
→ sessionStorage
```

The frontend must never persist a candidate before validation. A URL or stale
session value may seed a candidate, but it cannot make a tenant ready.

## Deterministic tenant-switch protocol

1. Validate the candidate as a UUID and reject a known-invalid local value.
2. Increment and capture `switchGeneration`.
3. Cancel requests where possible and invalidate all earlier generations.
4. Enter `SWITCHING`.
5. Block tenant-aware rendering and hide old tenant data.
6. Reset feature stores and close or invalidate tenant-bound dialogs and forms.
7. Keep the candidate ephemeral while the request is made.
8. Issue the contextual request with `X-Organization-Id: candidate`.
9. Accept the response only after membership, organization status, and
   capabilities are validated by the backend contract.
10. Confirm the candidate as the selected in-memory signal.
11. Write the confirmed ID to `sessionStorage` for this tab.
12. Load the minimum shell and then feature data for the new generation.
13. Resolve navigation and deep-link eligibility.
14. End `SWITCHING` only when the confirmed shell is safe to render.
15. Update the backend preference independently; a preference failure does not
   roll back a valid switch.
16. On failure, discard candidate data, keep no old tenant data visible, and
   return to a safe prior confirmed context only if it is revalidated. Else
   route to selection, forbidden, suspended-admin, or context-error UX.

There are no sleeps, no automatic mutation retries, no acceptance of an older
generation response, and no use of preferred organization as tenant
authority. A response must match both expected `organizationId` and the
current `switchGeneration` before it can update state.

## Cross-tenant invalidation contract

Every tenant-aware store implements the conceptual common operation:

```text
resetTenantState(reason, generation)
```

The reset clears data, loading/error state, selected row/detail state, cached
lists, open dialogs, unsaved tenant-bound forms, and pending actions. It is
called on a switch before new data loads, logout, membership suspension or
revocation, organization suspension, ownership transfer, and a stale or
redacted response. It must be idempotent.

The minimum inventory is dashboard, patients, case files, session notes,
documents, appointments, finance, reports, organization administration,
memberships, invitations, dialogs, and open forms. Every tenant-aware response
is checked against the expected organization ID and current generation. A
failed check is discarded and emits `stale_response_discarded`.

## HTTP interceptor contract

Requests declare metadata through `HttpContext` or an equivalent explicit
request option. The interceptor must not infer tenant behavior from a fragile
URL denylist.

| Mode | JWT | `X-Organization-Id` |
| --- | --- | --- |
| `PUBLIC` | No | No |
| `IDENTITY_ONLY` | Yes | No |
| `TENANT_AWARE` | Yes | Confirmed ID required |
| `TENANT_OPTIONAL` | Yes | Header when a confirmed context exists |

`POST /auth/login`, `POST /auth/freelancer-bootstrap`, and public signup entry
are `PUBLIC`. Login-independent authenticated calls such as preference update,
invitation accept/reject, and `GET /organizations` are `IDENTITY_ONLY`.
`/auth/context` and organization/clinical operations are `TENANT_OPTIONAL` or
`TENANT_AWARE` according to the backend endpoint matrix. The interceptor must
not attach a header to a public request, must not invent one, and must not
retry a mutation automatically.

## Routing and guards

The conceptual route set is:

```text
/context/select
/organization
/organization/memberships
/organization/invitations
/organization/ownership-transfer
/invitations/accept
/signup/freelancer
/organization/suspended
/no-active-memberships
/forbidden
/tenant-context-error
```

Guards have separate responsibilities:

* auth guard establishes identity and redirects unauthenticated users to
  login, preserving only explicitly safe navigation state;
* tenant-context guard ensures a context attempt exists and routes ambiguous
  or missing context to selection/no-memberships;
* tenant-ready guard requires `ACTIVE_TENANT_READY` for tenant-aware pages;
* suspended-admin guard permits only the administrative suspended shell;
* capability guard uses `can(capability)` for UX gating and still expects
  backend enforcement;
* invitation flow guard preserves an invitation intent without persisting the
  token.

Refresh, direct access, and deep links rehydrate identity first, revalidate
context second, and resolve the requested URL third. If access is lost during
navigation, clear tenant state and route to the least revealing recovery page.

## Capabilities UX

The frontend must not duplicate the complete authorization matrix. It consumes
backend-projected capabilities and exposes:

```text
can(capability): boolean
```

Roles are descriptive metadata only. A capability can hide or disable an
action, but the backend remains authoritative.

| Action | Capability | Backend authority | UX |
| --- | --- | --- | --- |
| Read/update organization identity | `organization.read` / `organization.manage` | Selected tenant and OWNER policy | Show admin controls only when allowed |
| List/manage memberships | `membership.read`, `membership.manage_role`, `membership.suspend`, `membership.remove` | Backend policy and owner invariant | Filter controls; handle `403`/`409` |
| Create/revoke/resend invitations | `invitation.create`, `invitation.revoke`, `invitation.resend` | Tenant policy and invitation state | Disable invalid terminal actions |
| Transfer ownership | `ownership.transfer` | Current active OWNER, eligible target, transaction | Strong confirmation; expect immediate permission loss |
| Patients | `patient.read/create/update/delete` | Tenant, capability, assignment policy | Hide unavailable operations; redact errors |
| Appointments | `appointment.read/manage` | Tenant and operational/clinical field policy | Separate scheduling from notes |
| Finance | `finance.read/manage/summary_read` | Tenant-scoped finance policy | No clinical assumptions |
| Reports | `report.read` | Backend report and redaction policy | Show only permitted report surfaces |

## Organization selection and preference

* Single active organization: the backend may resolve it automatically; the
  frontend still records a confirmed context before rendering tenant data.
* Multiple organizations: show only backend-provided selectable active
  memberships and require an explicit candidate selection.
* Valid preferred organization: use it as a candidate hint, then validate it.
* `null` or stale preference: show selection or use the sole valid membership;
  never treat it as authority.
* Zero active memberships: route to `/no-active-memberships`.
* Suspended organization: expose only the suspended administrative context;
  do not present it as an operational tenant.
* Switching does not mint a new JWT. It changes request context only.
* `sessionStorage` is per-tab and receives only the confirmed ID.
* A preference write is independent and non-blocking for a valid switch.

## Membership administration UX

The list uses the backend projection and supports minimum search plus role and
status filters. It presents role, status, display identity, timestamps, and
current-user marking without inventing an owner marker. `OWNER` is derived
from `role === OWNER`.

Role changes, suspension, reactivation, removal, and leave are mutation flows
with disabled double-submit state, no automatic retry, and explicit handling
for self-lockout, the last active OWNER, ADMIN versus OWNER limits, and `409`
concurrency. After a mutation, reload the context and capabilities because the
same JWT can now have different request-time authorization. If the current
membership is suspended or revoked, reset tenant state immediately and route
to the appropriate recovery page.

## Invitation UX

Administration provides list, create, revoke, and resend. Acceptance provides
accept and reject, deep-link entry, authenticated and unauthenticated states,
recipient mismatch handling, one-shot terminal behavior, URL scrubbing, and
no durable token persistence. Derived states are `PENDING`, `ACCEPTED`,
`REJECTED`, `REVOKED`, and `EXPIRED`.

The chosen login-preservation strategy is `history.state`: retain an
ephemeral invitation intent in navigation state while redirecting through
login, consume it once after authentication, and immediately replace/scrub the
URL. The token is never placed in `localStorage`, `sessionStorage`, logs,
analytics, clipboard helpers, or any durable store. If navigation state is
lost, require re-entry through the original link.

The frontend does not send invitation email. The backend returns a token only
where its non-production contract permits it; the frontend must never log or
telemetry-capture it.

## Ownership transfer UX

The target list contains only another `ACTIVE`, non-OWNER membership in the
selected organization. The UI uses strong confirmation that names the target,
explains immediate permission loss, and prevents double submit. It does not
implement ownership transfer as a role patch. On success, reload capabilities
and context, then navigate according to the demoted user's available surface.
On `409`, refresh the target list/context and ask for a new confirmation.

## Freelancer signup UX

`/signup/freelancer` is public and is controlled by the backend feature flag
and throttling. Fields are canonical email, name, organization name, and
password. The password must be at least 12 characters and at most 72 UTF-8
bytes; frontend hints do not replace backend validation. Handle `400`, `409`,
and `429` without exposing account existence beyond the backend message/code
contract. A successful bootstrap returns a session and an initial active owner
organization; the frontend validates that result, sets the initial confirmed
context, and navigates to the tenant shell. Email verification remains out of
scope.

## Error taxonomy

The frontend consumes stable backend `code` values and HTTP status. It never
parses human-readable messages to infer behavior.

| Status | UX behavior |
| --- | --- |
| `400` | Field/form validation; preserve safe input |
| `401` | Clear identity-dependent state and route to login |
| `403` | Forbidden surface or redacted recovery; no enumeration |
| `404` | Redacted not-found; do not reveal cross-tenant existence |
| `409` | Refresh context/resource and explain concurrent/terminal state |
| `429` | Rate-limit feedback and user-controlled retry later |
| `5xx` | Generic recoverable error with request ID |
| network | Offline/connection recovery without stale tenant rendering |

The paired backend contract defines the envelope and codes:
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`,
`TENANT_CONTEXT_REQUIRED`, `RESOURCE_NOT_FOUND`, `CONFLICT`,
`CONCURRENT_UPDATE`, `CAPABILITY_DENIED`, `INVITATION_TERMINAL`,
`INVITATION_RECIPIENT_MISMATCH`, `RATE_LIMITED`, and `UNEXPECTED_ERROR`.

## Concurrency and multiple tabs

The UI handles role changes, membership suspension/revocation, organization
suspension, ownership transfer, invitation terminal transitions, preference
changes, stale requests, and requests started before a switch. Generation
checks prevent old responses from winning. No constant polling is introduced;
reload follows user actions, navigation, or an explicit invalidation event.

`BroadcastChannel` is optional for logout, session invalidation, preference
changed, organization access lost, and membership changed. It must never carry
JWTs, full users, full capabilities, memberships, clinical data, or invitation
tokens. Each tab reloads its own context from the backend and applies its own
generation checks. `sessionStorage` remains tab-local.

## Security threat model

| Threat | Phase 4 mitigation | Deferred/operational boundary |
| --- | --- | --- |
| JWT in `localStorage` | Prefer the existing secure auth storage contract; never copy JWT into tenant events/logs | Storage migration/security expansion is separate |
| XSS | Angular escaping, safe rendering, no token persistence, CSP-compatible markup | Final CSP deployment policy |
| Invitation token | `history.state`, one-shot consumption, URL scrubbing, no logs/analytics | Email delivery is excluded |
| Tenant ID manipulation | Header is generated only from confirmed store; backend validates it | Backend remains authority |
| Cache leakage | Generation-keyed stores, reset on switch, no old shell rendering | CDN/infra policy excluded |
| History leakage | Scrub invitation URLs and avoid sensitive query data | Browser policy outside app scope |
| Tabs | Minimal `BroadcastChannel` events and backend reload | Full distributed session invalidation excluded |
| Source maps/logs | No secrets, tokens, clinical content, or full emails in telemetry | Production source-map policy deferred |
| PII/documents/clipboard/autocomplete | Minimize projections, avoid clipboard/token helpers, explicit form autocomplete policy | Broader data governance deferred |
| CORS/CSRF | Respect bearer-token request contract and same-origin deployment assumptions | TLS, WAF, and infra are excluded |

## Responsive and accessibility contract

The demo journey must be usable on desktop, tablet, and mobile. Dense tables
become readable cards or responsive rows without losing role/status actions.
Dialogs must preserve focus, support Escape and keyboard traversal, use labels
and appropriate descriptions, announce async state with `aria-live`, meet
contrast AA, and never rely on color alone. Loading, empty, forbidden,
suspended, error, and stale-response states are explicit. Respect reduced
motion and do not animate tenant transitions in a way that suggests old data
is still active.

## Observability

Conceptual events are:

```text
context_load
context_failure
organization_switch_started
organization_switch_completed
organization_switch_failed
stale_response_discarded
tenant_state_reset
authorization_denied
invitation_flow_failed
ownership_conflict
membership_state_invalidated
```

Events may include opaque request IDs, status, reason codes, generation, and
redacted organization identifiers only where the telemetry policy permits. They
must never include JWTs, invitation tokens, passwords, clinical content,
document content, or full email addresses.

## Testing and certification strategy

Phase 4 certification covers:

* unit tests for store transitions, generation checks, `can`, persistence, and
  error normalization;
* component tests for selection, suspended/no-membership, admin, invitation,
  ownership, signup, loading, empty, forbidden, and responsive states;
* integration tests for interceptor metadata, guards, context reload, feature
  reset, and preference independence;
* frontend E2E for deep links, refresh, switch, access loss, invitation login,
  mutation conflicts, and multiple tabs;
* backend certification against the paired contract, Postman flows, and seed
  fixtures;
* cross-tenant visual certification proving old tenant data is not visible;
* stale-response certification proving earlier generations cannot update UI.

Playwright is a recommended candidate for future E2E coverage, not an approved
dependency and not to be installed by this contract.

## Subphases

| Subphase | Objective | Repository | Endpoints/inputs | Dependencies | Tests | Risks | Exit gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.0 | Contract and frontend architecture | frontend + paired backend docs | Existing context contract | B2 review | Document checks | Ambiguous future DTOs | Independent review accepts contract |
| 4.1 | Tenant context foundation | frontend | `GET /auth/context`, header | AuthStore, backend context | Store/interceptor/guard | Stale responses | Confirmed context lifecycle certified |
| 4.2 | Selection and preference | frontend | `GET /auth/context`, `PUT /auth/context/preference` | 4.1 | Single/multi/stale/null/tab | Preference mistaken as authority | Selection and tab tests pass |
| 4.3 | Cross-tenant invalidation | frontend | All tenant-aware calls | 4.1 | Generation and visual isolation | Cached clinical data | No stale tenant content |
| 4.4 | Organization administration | frontend | `/organizations*` | Capabilities projection | CRUD/conflict/suspended | Suspension semantics | Admin shell certified |
| 4.5 | Membership administration | frontend | Membership routes | Membership projection | Role/status/leave/409 | Self-lockout/last owner | Context refresh certified |
| 4.6 | Invitations | frontend | Invitation admin and recipient routes | Token contract | Deep link/login/terminal | Token leakage | One-shot and scrub certified |
| 4.7 | Ownership transfer | frontend | Ownership transfer route | Role-based ownership | Double submit/409/loss | Immediate permission loss | Transfer flow certified |
| 4.8 | Freelancer signup | frontend | `POST /auth/freelancer-bootstrap` | Feature flag/throttle | 400/409/429/success | Account enumeration | Bootstrap journey certified |
| 4.9 | Authorization, suspended, errors | frontend | Error envelope and capability data | 4.1–4.8 | Error matrix/accessibility | Human-message parsing | Safe recovery certified |
| 4.10 | Cross-tenant certification | frontend + backend | Full endpoint matrix | All prior phases | E2E, Postman, seed, visual | Coverage gaps | Certification evidence accepted |
| 4.11 | Closeout | frontend + backend | Documentation and CI artifacts | 4.10 | Final validation | Scope drift | Closeout gate approved |

Every subphase requires a documented endpoint mapping, backend authority, test
evidence, and explicit sign-off. No subphase authorizes production rollout.

## Cross-Repository Contract References

The paired backend contract is:

```text
backend repository:
docs/POST_GO_LIVE_4_FRONTEND_INTEGRATION_CONTRACT.md
```

This frontend contract is:

```text
frontend repository:
docs/POST_GO_LIVE_4_SAAS_UX_CONTRACT.md
```

The two files are one distributed specification. The backend contract is the
authority for DTOs, HTTP status/codes, persistence, and authorization. This
file is the authority for frontend lifecycle, rendering, navigation, and
interaction behavior. Neither overrides the closed identity/tenant rules.

## Findings and deferred risks

* Current backend context responses do not yet project capabilities; this is a
  `REQUIRED` integration gap for capability-aware UX.
* Current membership administration response is sanitized but lacks the
  proposed display identity and current-user marker; the paired contract
  classifies the projection as `REQUIRED` and privacy-minimized.
* Current backend errors are not yet the complete stable envelope; frontend
  implementation must wait for the paired error contract or maintain a narrow
  compatibility adapter during transition.
* Suspended administrative context is an explicit semantic state, not an
  operational tenant. The implementation must not weaken that boundary.

These are contract gaps for later implementation and do not authorize code or
schema changes in B2.

## Gate and authorization statement

```text
IMPLEMENTATION: NOT AUTHORIZED
SCHEMA CHANGE: NOT AUTHORIZED
MIGRATIONS: NOT AUTHORIZED
PRODUCTION ROLLOUT: NOT AUTHORIZED
NEXT GATE: NEXT-PHASE-B2-R1 — Independent Contract Review
```

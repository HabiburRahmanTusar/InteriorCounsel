# Leave Management Refactor — Policy-Based Leave Allocation

## Purpose of this document
This is an implementation spec for an engineering agent (human or AI) to refactor the existing
per-employee, hardcoded leave-allocation system into a **policy-driven** system, where an admin
defines one or more `LeavePolicy` records, each policy bundles multiple leave types with a day
allocation, and each policy targets one (or more) **employee types**. Employees automatically
inherit the balances from the policy that matches their employee type.

This spec assumes the current system described below. If any assumption doesn't match the real
codebase, the agent should adjust file paths/model names accordingly but keep the same data model
and behavior.

---

## 1. Current System (baseline)

- `LeaveBalance` — per employee, per year, per leave type, tracks `allocated`, `used`, `remaining`.
- `LeaveRequest` — start date, end date, leave type, half-day flag, status
  (Pending/Approved/Rejected/Cancelled), remarks.
- `leave.controller.js` — working-day calculation (skips weekends + `Holiday` records), balance
  validation, overlap validation, approve/reject/cancel flows with balance deduction/refund, and a
  bulk "refresh allocations for all active employees for a given year" admin action.
- Leave types are a **hardcoded enum**: `annual (15)`, `sick (10)`, `casual (10)`, `unpaid (∞)`.
- Allocations are **flat and global** — every employee gets the same defaults, with admins able to
  hand-edit an individual's balance afterward.

**Core gap:** there's no concept of "policy" or "employee type." Allocation is uniform and manual,
so admins can't say "interns get 5 casual + 5 sick" vs "full-time staff get 10 casual + 15 annual +
10 sick" without editing every employee one by one.

---

## 2. Goals of the Refactor

1. Admin defines reusable **Leave Policies** (e.g. "Full-Time Employee Policy", "Intern Policy",
   "Contractor Policy").
2. Each policy contains a set of **(leave type → days)** pairs — a policy can include any subset of
   leave types, with independent day values per leave type.
3. Each policy is targeted at one or more **employee types** (e.g. `full_time`, `intern`,
   `contractor`, `probation`).
4. When an employee is created, or their employee type changes, or a new leave year starts, the
   system **auto-resolves** the matching policy for that employee and generates/updates their
   `LeaveBalance` rows from it — no manual per-leave-type entry needed.
5. Existing manual override capability is preserved (admin can still hand-adjust an individual's
   balance after policy-assignment, e.g. for a one-off bonus day).
6. Leave types remain extensible — moving from a hardcoded enum to a `LeaveType` reference table so
   admins can add new leave types (e.g. "Maternity", "Bereavement") without a code change.

---

## 3. New Data Model

### 3.1 `LeaveType` (new — replaces the hardcoded enum)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | e.g. "Annual Leave", "Sick Leave", "Casual Leave", "Unpaid Leave" |
| `code` | String (unique) | e.g. `annual`, `sick`, `casual`, `unpaid` — stable key for logic/migrations |
| `isPaid` | Boolean | unpaid leave = `false`, doesn't deduct from any capped balance |
| `deductsFromBalance` | Boolean | `false` for unpaid/unlimited types |
| `isActive` | Boolean | soft-disable instead of deleting |

Seed migration inserts the 4 existing types with matching `code`s so historical `LeaveRequest.type`
values map cleanly.

### 3.2 `EmployeeType` (new, or reuse an existing field if one already exists on your `Employee`/`User` model)
If the Employee/User model doesn't already have a categorical field for this, add one:
| Field | Type | Notes |
|---|---|---|
| `code` | String (unique) | e.g. `full_time`, `part_time`, `intern`, `contractor`, `probation` |
| `label` | String | display name |

> If your `Employee` model already has something like `employmentType` or `role`, reuse it as the
> targeting key instead of creating a new collection — don't introduce a duplicate taxonomy.

### 3.3 `LeavePolicy` (new)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | e.g. "Full-Time Employee Leave Policy" |
| `description` | String | optional |
| `employeeTypes` | [String/ObjectId] | one or more employee-type codes this policy applies to |
| `year` | Number | policy is versioned per calendar/fiscal year, so allocations can change year to year |
| `status` | Enum | `Draft`, `Active`, `Archived` |
| `isDefault` | Boolean | fallback policy used when an employee's type matches no other active policy |
| `createdBy` | ObjectId (Admin) | |
| `createdAt`/`updatedAt` | Date | |

### 3.4 `LeavePolicyItem` (new — the policy's leave-type/day lines)
Embedded sub-document array on `LeavePolicy`, or a separate collection — embedded is simpler and
recommended since items are always read/written with their parent policy:
```
LeavePolicy.leaveAllocations: [
  { leaveType: ObjectId(ref LeaveType), days: Number, carryForwardAllowed: Boolean, maxCarryForward: Number }
]
```

### 3.5 `LeaveBalance` (modify existing)
Add a traceability link so a balance can be regenerated/audited against the policy that produced it:
| New field | Type | Notes |
|---|---|---|
| `policy` | ObjectId (ref LeavePolicy) | which policy generated this row |
| `source` | Enum | `PolicyAssigned` \| `ManualOverride` — lets admins hand-edit without losing "this came from policy X" history |

Keep existing `employee`, `year`, `leaveType`, `allocated`, `used`, `remaining` fields — `leaveType`
now references `LeaveType._id` instead of a hardcoded string enum (migration required, see §6).

### 3.6 Validation rules for `LeavePolicy`
- An employee type should not be covered by two overlapping **Active** policies in the same year
  (ambiguous assignment) — enforce at create/update time, or if multiple matches are allowed,
  require an explicit priority/order field and document that "first match wins."
- A policy cannot go `Active` if it has zero leave allocations.
- Changing an **Active** policy's day values does **not** retroactively edit balances already
  consumed mid-year unless the admin explicitly triggers "Recalculate Balances" (see §5.4) — this
  avoids silently shrinking someone's remaining balance under their feet.

---

## 4. Assignment & Balance Generation Logic

### 4.1 Resolving an employee's policy
```
function resolvePolicyFor(employee, year):
  policy = LeavePolicy.findOne({
    employeeTypes: employee.employeeType,
    year: year,
    status: 'Active'
  })
  if not found:
    policy = LeavePolicy.findOne({ year: year, status: 'Active', isDefault: true })
  if still not found:
    flag employee as "Unassigned Policy" for admin attention; no balances generated
  return policy
```

### 4.2 When balances get (re)generated
Trigger balance generation from the resolved policy in these cases:
1. **New employee created** → generate balances for the current year immediately.
2. **Employee's `employeeType` changes** → re-resolve policy, generate/adjust balances for the
   current year (see prorating note in §4.3).
3. **Yearly rollover job** (replaces existing "bulk update for all active employees for a given
   year") → for every active employee, resolve their policy for the new year and generate balances.
4. **Admin manually re-runs "Sync from Policy"** on one employee or in bulk — idempotent, does not
   touch `used` days, only reconciles `allocated`/`remaining` deltas.

### 4.3 Mid-year employee-type changes (edge case — decide and document behavior)
Two reasonable options; pick one and note it in the code:
- **Simple (recommended default):** on type change, recompute `allocated` from the new policy as of
  today, keep `used` as-is, recompute `remaining = allocated - used`. No proration by month.
- **Prorated (optional, more complex):** prorate the new policy's days by remaining months in the
  year. Only implement if the business explicitly asks for it — flag as a follow-up, don't build it
  speculatively.

### 4.4 Manual overrides still work
Admins can still hand-edit an individual `LeaveBalance.allocated` value directly, exactly as today.
Mark `source: 'ManualOverride'` on that row so a later "Sync from Policy" doesn't clobber it without
a warning — surface a confirmation ("This balance was manually overridden — overwrite with policy
value?") before resetting it.

### 4.5 Unpaid leave
Leave types with `deductsFromBalance: false` never get a `LeaveBalance` row generated at all — the
existing controller logic that skips balance checks for unpaid leave stays the same, just now driven
by the `LeaveType.deductsFromBalance` flag instead of a hardcoded `type === 'unpaid'` check.

---

## 5. API Surface (additions)

### Admin endpoints
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/admin/leave-types` | create a leave type |
| `GET` | `/api/admin/leave-types` | list leave types |
| `PATCH` | `/api/admin/leave-types/:id` | edit / deactivate a leave type |
| `POST` | `/api/admin/leave-policies` | create a policy (name, year, employeeTypes[], leaveAllocations[]) |
| `GET` | `/api/admin/leave-policies` | list policies (filter by year/status/employeeType) |
| `GET` | `/api/admin/leave-policies/:id` | policy detail |
| `PATCH` | `/api/admin/leave-policies/:id` | edit a Draft policy, or edit an Active policy's metadata (not its days without a recalculation flag) |
| `POST` | `/api/admin/leave-policies/:id/activate` | Draft → Active |
| `POST` | `/api/admin/leave-policies/:id/archive` | Active → Archived |
| `POST` | `/api/admin/leave-policies/:id/assign-preview` | dry-run: list which employees this policy would apply to |
| `POST` | `/api/admin/leave-policies/sync-balances` | bulk: resolve + (re)generate balances for all employees for a given year (replaces old "bulk refresh") |
| `POST` | `/api/admin/employees/:id/sync-balance` | resolve + regenerate balance for a single employee |

### Employee endpoints (unchanged in shape, different source of truth)
- `GET /api/leave/balance` — now reads `LeaveBalance` rows that were populated by policy resolution;
  response shape stays the same so the frontend doesn't need to change.
- `GET /api/leave/policy` (new, optional) — lets an employee see which policy applies to them and
  its full allocation breakdown, for transparency.

---

## 6. Migration Plan

1. **Create `LeaveType` collection**, seed with the 4 existing types (`annual`, `sick`, `casual`,
   `unpaid`) preserving current default day values as their `code`.
2. **Add `employeeType` field** to `Employee`/`User` model if it doesn't exist; backfill from
   whatever existing field indicates employment category, or default everyone to a single type
   (e.g. `full_time`) if the concept doesn't exist yet.
3. **Create a default `LeavePolicy`** for the current year with `isDefault: true`, `employeeTypes:
   ['full_time']` (or all existing types), and allocations matching today's hardcoded defaults
   (annual 15 / sick 10 / casual 10). This guarantees zero behavior change on day one of rollout.
4. **Migrate `LeaveBalance.leaveType`** from string enum to `ObjectId` ref, mapping old string values
   to the new `LeaveType._id`s by `code`. Set `policy` to the default policy created in step 3 and
   `source: 'PolicyAssigned'` for all pre-existing rows.
5. **Migrate `LeaveRequest.type`** the same way (string → ref), or keep it as a denormalized `code`
   string if you'd rather not touch historical request records — either is fine as long as it's
   consistent with how the controller reads it.
6. **Deploy code**, run the sync-balances job once to confirm generated balances match pre-migration
   values exactly (this is your regression check).
7. Only after step 6 is verified, allow admins to create *additional* non-default policies.

---

## 7. Controller/Service Changes Needed in `leave.controller.js`

- Replace hardcoded default allocation logic with a call to `resolvePolicyFor(employee, year)` +
  `generateBalancesFromPolicy(employee, policy)`.
- Replace `type === 'unpaid'` checks with `leaveType.deductsFromBalance === false`.
- Keep working-day calculation, holiday skipping, half-day handling, overlap validation, and
  approve/reject/cancel balance deduction/refund logic **unchanged** — none of that is affected by
  where the allocation number came from.
- Add new service functions: `resolvePolicyFor`, `generateBalancesFromPolicy`, `syncEmployeeBalance`,
  `syncAllBalancesForYear`.
- Add validation: reject `LeaveRequest` creation if the employee has no resolved policy for the
  leave type they're requesting (surfaces the "Unassigned Policy" case from §4.1 as a clear error
  rather than a silent 0-balance).

---

## 8. Suggested Implementation Order (for the agent)

1. `LeaveType` model + seed migration.
2. `LeavePolicy` model (with embedded `leaveAllocations`) + validation rules.
3. `employeeType` field on Employee (if missing) + backfill.
4. Default policy creation migration + `LeaveBalance`/`LeaveRequest` reference migration.
5. Service layer: `resolvePolicyFor`, `generateBalancesFromPolicy`, sync endpoints.
6. Admin API routes + controller for policy CRUD and sync actions.
7. Wire employee creation / employee-type-change hooks to auto-generate balances.
8. Regression test: confirm balances pre- and post-migration match for all existing employees.
9. Frontend: admin policy builder UI (name, year, employee types multi-select, leave-type/day rows),
   employee-facing "your policy" read-only view.
10. Docs/README update describing the new policy model for future admins.

---

## 9. Open Questions to Confirm Before Building
- Does the `Employee`/`User` model already have a field that represents employee type/category? If
  yes, name it here so step 3 above reuses it instead of duplicating.
- Should a policy be allowed to target **multiple** employee types (as scoped above), or is it
  strictly one type per policy? (Spec above assumes multiple for flexibility.)
- Mid-year employee-type change: simple recompute or prorate? (Default recommended: simple, §4.3.)
- Should leave carry-forward across years be in scope now, or a later phase? (Field is stubbed in
  §3.4 but no logic is specified here — treat as future work unless requested.)

# Design Decisions & System Architecture

This document captures key architectural and product design decisions for the art subscription platform, including the rationale behind them.

---

## Subscription Cycle Lock Date Architecture

### Decision

Implement a **global monthly lock date** that freezes collector selections and creator releases 7 days before fulfillment.

### Rationale

**Core Product Requirement:**

- This is a **subscription service** with predictable, regular monthly deliveries
- Collectors expect consistent, high-quality booklets every month
- Booklets must contain **30-40 pages minimum** to provide worthwhile value
- Inconsistent page counts (5 pages one month, 35 the next) would damage the product experience

**The Problem Being Solved:**
Without a lock date, the platform faces the "no new art" fulfillment failure:

1. Collector subscribes to creators
2. Fulfillment day arrives
3. Creators haven't uploaded enough new art
4. System cannot assemble minimum 30-40 page booklet
5. Cannot fulfill → cannot charge → bad experience for everyone

**Why Lock Date is Necessary:**

1. **Predictable Fulfillment**
   - Platform knows 7 days in advance whether fulfillment is possible
   - Time to detect and resolve insufficient content issues
   - POD orders can be prepared and queued

2. **Quality Guarantee**
   - Ensures every shipped booklet meets minimum page threshold
   - Maintains consistent value proposition for collectors
   - Prevents "empty month" scenarios

3. **Operational Window**
   - Time for booklet PDF generation (future phase)
   - Time for POD order submission and processing
   - Buffer for handling edge cases and errors

4. **Proactive Problem Resolution**
   - Notifications sent before lock date: "You need 15 more pages"
   - Collectors can adjust creator subscriptions or release selections
   - Creators reminded to publish releases before deadline
   - System prevents fulfillment failures rather than reacting to them

### Trade-offs Accepted

**Added Complexity:**

- ❌ UI must enforce cycle status (OPEN/LOCKED/PROCESSING/COMPLETE)
- ❌ Release creation/editing gated by cycle status
- ❌ Collector selection changes gated by cycle status
- ❌ Notification system required to keep users informed
- ❌ Status transition logic and date-based automation

**UX Friction:**

- ❌ Deadlines create pressure (mitigated by notifications)
- ❌ "Locked" states can feel restrictive
- ❌ Requires user education about cycle timing

**Benefits Gained:**

- ✅ Reliable monthly delivery schedule
- ✅ Consistent booklet quality (30-40 pages)
- ✅ No surprise fulfillment failures
- ✅ Time to fix problems before they impact users
- ✅ Sustainable operations for POD integration

### Alternatives Considered & Rejected

**Option: Best-Effort Fulfillment (No Lock Date)**

- Collectors can change selections anytime
- Ship whatever is available on fulfillment day
- **Rejected:** Unpredictable page counts destroy value proposition

**Option: Flexible Minimum (Ship Anything)**

- Allow booklets with 5-50 pages
- **Rejected:** Inconsistent value, some months worthless

**Option: Creator Commitment Model**

- Creators commit to X artworks per month
- **Rejected:** Unrealistic for artists, kills creative freedom

**Option: Platform-Filled Content**

- Fill gaps with reprints or filler art
- **Rejected:** Defeats "new art every month" promise

### Implementation Guidelines

**For Developers:**

- All release creation/editing must check cycle status
- All collector selection changes must check cycle status
- Display cycle status prominently in UI (countdown to lock, locked badge)
- Notification system is critical infrastructure, not optional

**For Product/UX:**

- Educate users about cycle timing during onboarding
- Use countdown timers to create urgency without panic
- Frame lock date as "securing your booklet" not "deadline pressure"
- Provide clear visibility into cycle status at all times

**For Operations:**

- Lock date should be 7 days before fulfillment (configurable)
- Notification cadence: 7 days out, 3 days out, lock confirmation
- Monitor insufficient content scenarios and trigger interventions

---

## Booklet Page Requirements

### Decision

Minimum booklet size: **30-40 pages**

### Rationale

- Provides substantial value for monthly subscription price
- Justifies POD printing costs and shipping
- Creates satisfying physical product experience
- Aligns with standard booklet/zine formats

### Implementation

- Configured via `BookletConstraint` model (admin-adjustable)
- Planning assumption: **1 artwork = 1 page** (orientation-aware layout deferred)
- Fulfillment blocked if minimum not met at lock date
- Collectors notified proactively if approaching lock date with insufficient pages

---

## Release Auto-Assignment Background Job

### Decision

Move `publishRelease()` auto-assignment of releases to active subscribers from synchronous execution to a **background job via BullMQ**.

### Rationale

**The Problem Being Solved:**
When a creator publishes a release, the system automatically assigns it to all their active subscribers. Previously, this happened synchronously in the same HTTP request as the publish action, which created several issues:

1. **Blocking Publish Action**
   - If a creator has many subscribers (e.g., 100+), the auto-assignment loop iterates over each subscriber, performing DB queries and inserts
   - The publish button appears to "hang" with no progress feedback
   - Request timeouts could interrupt the process mid-execution

2. **No Visibility Into Assignment**
   - Creators don't see _who_ got the release or how many were skipped
   - Subscribers who hit the artwork limit are silently skipped
   - No way to monitor or retry failed assignments

3. **Irreversible**
   - Once published, selections are already in collectors' booklets
   - No "publish without auto-assign" option for creators who prefer manual control

4. **Reliability**
   - If the server crashes during assignment, partial state may persist
   - No retry mechanism for transient failures

**Why Background Job is Necessary:**

1. **Non-Blocking UX**
   - Publish action returns instantly with success confirmation
   - Auto-assignment runs asynchronously in the pdf-worker service
   - Creators see predictable, fast response times regardless of subscriber count

2. **Resilience**
   - BullMQ provides retry logic (3 attempts with exponential backoff)
   - Jobs survive server restarts via Redis persistence
   - Failed jobs can be inspected and retried manually via admin

3. **Observability**
   - Job logs show assigned/skipped counts per release
   - Failed jobs surface error messages for debugging
   - Future: can add progress tracking for long-running assignments

4. **Scalability**
   - pdf-worker can process multiple auto-assign jobs in parallel
   - Can scale worker independently of the Next.js app
   - No risk of HTTP request timeouts

### Implementation

**Architecture:**

```
Creator clicks "Publish"
  ↓
publishRelease() flips status → enqueues { releaseId, creatorProfileId, cycleId }
  ↓
Creator sees success immediately
  ↓
pdf-worker processes job in background:
  → Verify release is published
  → Get artwork range limits from BookletConstraint
  → Find active subscriptions for creator
  → For each subscriber:
    - Check existing selection (skip if exists)
    - Check artwork limit (skip if would exceed)
    - Create CollectorReleaseSelection row
    - Collect userId for notification
  → Create EmailNotificationLog records for notified users
```

**Files Changed:**

- `apps/mvp/lib/queue/auto-assign.ts` — BullMQ queue helper
- `apps/mvp/lib/actions/releases.ts` — `publishRelease()` now enqueues instead of awaiting
- `apps/pdf-worker/src/auto-assign/` — NestJS module with processor, types, module
- `apps/pdf-worker/prisma/schema.prisma` — added `User`, `CollectorCreatorSubscription`, `BookletConstraint`, `EmailNotificationLog` models
- `apps/pdf-worker/src/app.module.ts` — registered `AutoAssignModule`

**Job Data:**

```typescript
{
  releaseId: string;
  creatorProfileId: string;
  cycleId: string;
}
```

**Job Result:**

```typescript
{
  assignedCount: number;
  skippedAtLimitCount: number;
}
```

### Trade-offs Accepted

**Added Complexity:**

- ❌ Requires BullMQ + Redis infrastructure (already exists for booklet generation)
- ❌ pdf-worker schema must stay in sync with MVP schema
- ❌ Slightly more complex debugging (job logs vs direct server logs)

**UX Changes:**

- ✅ Publish action is now instant and non-blocking
- ✅ No more "stuck" publish button for creators with many subscribers
- ⚠️ Creators no longer see immediate confirmation that assignments happened (could add notification in future)

**Operational Benefits:**

- ✅ Retry logic handles transient DB failures
- ✅ Job persistence survives server crashes
- ✅ Can monitor job queue for backlogs
- ✅ Can add admin UI for job inspection/retry

### Alternatives Considered & Rejected

**Option: Keep Synchronous but Optimize**

- Batch DB operations, use transactions, add progress feedback
- **Rejected:** Still blocks HTTP request, timeout risk remains, no retry mechanism

**Option: Fire-and-Forget (void call)**

- Use `void autoAssignPublishedReleaseToActiveSubscribers()` without await
- **Rejected:** Unreliable, no error handling, partial state if server crashes during processing

**Option: Creator Preview + Confirm**

- Show "This will add to 47 booklets, 3 skipped" before committing
- **Rejected:** Adds friction to publish flow, doesn't solve blocking issue

**Option: Opt-In Per Subscriber**

- Collectors explicitly add releases instead of auto-assign
- **Rejected:** Changes product model (currently auto-assign is core feature), reduces engagement

### Future Considerations

**Potential Enhancements:**

1. **Creator Dashboard** — Show assignment stats after publish (assigned/skipped counts)
2. **Progress Tracking** — Real-time progress for large subscriber counts
3. **Manual Retry** — Admin UI to retry failed auto-assign jobs
4. **Assignment Audit Log** — Track all auto-assign events for analytics
5. **Opt-Out Toggle** — Allow creators to disable auto-assign per-release

**When to Revisit:**

- If auto-assignment jobs consistently fail (indicates DB or logic issues)
- If creators complain about lack of visibility into assignments
- If queue backlogs become a bottleneck (scale workers or add parallel processing)

---

## Future Considerations

### When This Design May Need Revision

1. **If creator upload patterns stabilize**
   - After 6+ months, if creators reliably upload sufficient art
   - Could reduce lock date window from 7 days to 3 days

2. **If collector churn is high due to deadline pressure**
   - Monitor onboarding completion rates
   - Monitor selection completion rates before lock date
   - May need better notification UX or grace periods

3. **If POD processing becomes faster**
   - If Peecho turnaround improves significantly
   - Could reduce operational buffer window

4. **If we add "rollover" content**
   - Allow collectors to bank unused selections for future months
   - Could soften impact of insufficient content scenarios

### Metrics to Watch

- % of cycles where collectors meet minimum page count
- % of collectors who complete selections before lock date
- Creator upload patterns (how close to lock date do they publish?)
- Fulfillment failure rate (should be near 0%)
- Customer satisfaction with booklet consistency

---

## Document History

- **2025-01-XX**: Initial documentation of cycle lock date architecture

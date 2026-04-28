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

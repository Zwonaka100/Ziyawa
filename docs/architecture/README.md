# Ziyawa Architecture Pack

This folder is the operational floor plan for the platform.

Use it for four things:

1. Understand the full platform shape before changing anything.
2. Locate the owning route, API, and dashboard branch for a bug or feature request.
3. See the main user and money flows without digging through the whole repo first.
4. Keep a maintainable architecture map that evolves with the codebase.

This pack is the canonical technical map.

[MASTER.md](../../MASTER.md) remains the narrative product and business overview.

## Files

1. [01-platform-tree.md](./01-platform-tree.md)
   Full platform tree and branch ownership map.

2. [02-route-tree.md](./02-route-tree.md)
   App Router page inventory grouped by product area.

3. [03-api-tree.md](./03-api-tree.md)
   API route inventory grouped by capability.

4. [04-branch-maintenance.md](./04-branch-maintenance.md)
   Update protocol, smoke checklist, and branch debugging guide.

5. [05-launch-readiness-audit.md](./05-launch-readiness-audit.md)
   Operational review of what is ready, risky, incomplete, or inconsistent.

6. [06-event-ops-plan.md](./06-event-ops-plan.md)
   Concrete plan for reaching real-event operational confidence.

7. [07-benchmark-recommendations.md](./07-benchmark-recommendations.md)
   Pre-code recommendations benchmarked against mature ticketing operations patterns.

## How To Use This Pack

If something breaks:

1. Start in [01-platform-tree.md](./01-platform-tree.md) to identify the branch.
2. Jump to [02-route-tree.md](./02-route-tree.md) for the page surface.
3. Jump to [03-api-tree.md](./03-api-tree.md) for the server surface.
4. Use [04-branch-maintenance.md](./04-branch-maintenance.md) to run the right checks and update docs after the fix.

## Update Rule

Every change touching one of these areas should update this pack in the same PR or working session:

- new page route
- new API route
- changed booking/payment/reporting flow
- changed role access or dashboard behavior
- changed state machine, cron behavior, or domain logic

If the code changes and this pack is not updated, the floor plan is stale.

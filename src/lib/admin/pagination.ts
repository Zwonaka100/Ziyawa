/**
 * Page sizes shared between an admin loader and the client table that renders
 * its results.
 *
 * This file must never import anything server-only. The constant used to live
 * in src/lib/admin/transactions.ts, and importing it from a 'use client' table
 * pulled that module's createAdminServiceClient — and through it next/headers —
 * into the browser bundle, which fails the build with an opaque
 * "Ecmascript file had an error" pointing at src/lib/supabase/server.ts.
 *
 * The two numbers have to agree. When the loader fetched 20 per page and the
 * table computed its page count from 25, the pager reported too few pages and
 * the last rows could not be reached at all.
 */
export const TRANSACTIONS_PAGE_SIZE = 20

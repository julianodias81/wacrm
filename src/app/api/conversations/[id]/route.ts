import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * DELETE /api/conversations/[id]
 *
 * Owner-only — deleting a conversation wipes its message history.
 * `requireRole('owner')` throws a clear 403 before the delete even
 * runs for anyone else; the `conversations_delete` RLS policy
 * (migration 038) enforces the same threshold as a backstop, so a
 * future caller that bypasses this route still can't delete as a
 * non-owner. `ctx.supabase` is the RLS-scoped SSR client, not a
 * service-role bypass — no separate admin client needed.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const ctx = await requireRole('owner')

    const { error } = await ctx.supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId)

    if (error) {
      console.error('Error deleting conversation:', error)
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

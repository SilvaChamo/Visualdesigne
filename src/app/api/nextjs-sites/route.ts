import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminOrReseller } from '@/lib/panel-api-auth'
import { ensurePanelNextjsSitesSchema } from '@/lib/panel-nextjs-sites-schema'

export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export interface NextJsSiteRow {
  id: string
  domain: string
  name: string | null
  hostingNote: string | null
  adminUrl: string | null
  pm2ProcessName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

function rowToClient(r: Record<string, unknown>): NextJsSiteRow {
  return {
    id: String(r.id),
    domain: String(r.domain),
    name: r.name ? String(r.name) : null,
    hostingNote: r.hosting_note ? String(r.hosting_note) : null,
    adminUrl: r.admin_url ? String(r.admin_url) : null,
    pm2ProcessName: r.pm2_process_name ? String(r.pm2_process_name) : null,
    notes: r.notes ? String(r.notes) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

async function requireAdmin() {
  const auth = await requireAdminOrReseller()
  if ('error' in auth) return auth
  if (auth.user.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Apenas administradores' }, { status: 403 }) }
  }
  return auth
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await ensurePanelNextjsSitesSchema()

  const { data, error } = await db()
    .from('panel_nextjs_sites')
    .select('*')
    .order('domain', { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  return NextResponse.json({ success: true, sites: (data || []).map(rowToClient) })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await ensurePanelNextjsSitesSchema()

  const body = await req.json().catch(() => ({}))
  const domain = String(body.domain || '').trim().toLowerCase()
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório.' }, { status: 400 })
  }

  const payload = {
    domain,
    name: body.name ? String(body.name).trim() : null,
    hosting_note: body.hostingNote ? String(body.hostingNote).trim() : null,
    admin_url: body.adminUrl ? String(body.adminUrl).trim() : null,
    pm2_process_name: body.pm2ProcessName ? String(body.pm2ProcessName).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db()
    .from('panel_nextjs_sites')
    .upsert(payload, { onConflict: 'domain' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  return NextResponse.json({ success: true, site: rowToClient(data) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '').trim()
  if (!id) {
    return NextResponse.json({ success: false, error: 'id obrigatório.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.domain !== undefined) updates.domain = String(body.domain).trim().toLowerCase()
  if (body.name !== undefined) updates.name = body.name ? String(body.name).trim() : null
  if (body.hostingNote !== undefined) updates.hosting_note = body.hostingNote ? String(body.hostingNote).trim() : null
  if (body.adminUrl !== undefined) updates.admin_url = body.adminUrl ? String(body.adminUrl).trim() : null
  if (body.pm2ProcessName !== undefined) {
    updates.pm2_process_name = body.pm2ProcessName ? String(body.pm2ProcessName).trim() : null
  }
  if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null

  const { data, error } = await db()
    .from('panel_nextjs_sites')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  if (!data) return NextResponse.json({ success: false, error: 'Site não encontrado.' }, { status: 404 })
  return NextResponse.json({ success: true, site: rowToClient(data) })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ success: false, error: 'id obrigatório.' }, { status: 400 })
  }

  const { error } = await db().from('panel_nextjs_sites').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 502 })
  return NextResponse.json({ success: true })
}

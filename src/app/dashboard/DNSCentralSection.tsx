'use client'

import { DNSZoneEditorSection } from './HostingSections'
import type { DirectAdminWebsite } from '@/lib/directadmin-api'

/** DNS Central — editor de zona (leitura instantânea do espelho). */
export function DNSCentralSection({
  sites,
  initialDomain,
  isActive,
}: {
  sites: DirectAdminWebsite[]
  initialDomain?: string
  isActive?: boolean
}) {
  return <DNSZoneEditorSection sites={sites} initialDomain={initialDomain} variant="central" isActive={isActive} />
}

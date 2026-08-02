'use client'

import { WebmailSection } from '@/components/dashboard/WebmailSection'

export default function DevPreviewX() {
  return (
    <div className="min-h-screen bg-gray-100">
      <WebmailSection sites={[]} userEmail="teste@visualdesignmoz.com" isAdmin />
    </div>
  )
}

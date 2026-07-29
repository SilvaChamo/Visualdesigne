'use client';

import { useState } from 'react';
import { EmailTemplates } from '@/components/admin/EmailTemplates';
import { RichTextEditor } from '@/components/RichTextEditor';
import { CompanyLogoUpload } from '@/components/admin/CompanyLogoUpload';

export default function DevPreviewMailMarketing() {
  const [content, setContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        <button data-preview-role="admin" onClick={() => setIsAdmin(true)} className={`px-3 py-1 rounded border ${isAdmin ? 'bg-black text-white' : 'bg-white'}`}>Admin</button>
        <button data-preview-role="reseller" onClick={() => setIsAdmin(false)} className={`px-3 py-1 rounded border ${!isAdmin ? 'bg-black text-white' : 'bg-white'}`}>Revendedor</button>
        <button onClick={() => setShowTemplates(true)} className="px-3 py-1 rounded border bg-white">Reabrir templates</button>
      </div>
      {!isAdmin && (
        <div className="p-4 border rounded bg-white max-w-md">
          <CompanyLogoUpload value={logoUrl} onChange={setLogoUrl} />
        </div>
      )}
      <RichTextEditor value={content} onChange={setContent} />
      {showTemplates && (
        <EmailTemplates
          onSelect={(html) => { setContent(html); setShowTemplates(false); }}
          onClose={() => setShowTemplates(false)}
          isAdminAccount={isAdmin}
          brandLogoUrl={logoUrl}
        />
      )}
    </div>
  );
}

'use client';

import DomainSearch from '@/components/DomainSearch';

/** Registo de domínios via serviço Dynadot (UI neutra — sem marcas de fornecedor). */
export function RegistrarDomainsSection() {
  return (
    <div className="w-full">
      <DomainSearch isAdmin />
    </div>
  );
}

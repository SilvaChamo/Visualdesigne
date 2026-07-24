'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { PanelHeader } from '@/components/panel/PanelHeader';
import { panelBtnSecondary } from '@/lib/panel-ui';
import { usePanelSidebarCollapsed } from '@/hooks/usePanelSidebarCollapsed';
import { EncomendasSidebar, type EncomendasSection } from '@/components/encomendas/EncomendasSidebar';
import { EncomendasListSection } from '@/components/encomendas/EncomendasListSection';
import { EncomendasLayoutsSection } from '@/components/encomendas/EncomendasLayoutsSection';
import { EncomendasMensagensSection } from '@/components/encomendas/EncomendasMensagensSection';
import { EncomendasPagamentosSection } from '@/components/encomendas/EncomendasPagamentosSection';

const SECTION_META: Record<EncomendasSection, { title: string; description: string }> = {
  encomendas: { title: 'Encomendas', description: 'Painel VisualDesign — acompanhamento de pedidos e aprovação de layouts' },
  layouts: { title: 'Layouts', description: 'Layouts de design enviados pela equipa, por fase, para sua aprovação' },
  mensagens: { title: 'Mensagens', description: 'Fale com a equipa sobre uma encomenda específica' },
  pagamentos: { title: 'Pagamentos', description: 'Estado e instruções de pagamento das suas encomendas' },
};

export default function EncomendasPage() {
  const [activeSection, setActiveSection] = useState<EncomendasSection>('encomendas');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const { isCollapsed, setIsCollapsed } = usePanelSidebarCollapsed();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setSessionEmail(data.user?.email ?? null);
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const meta = SECTION_META[activeSection];

  return (
    <div className="panel-shell font-panel flex h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950">
      <EncomendasSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        sessionUser={sessionEmail}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <PanelHeader
          title={meta.title}
          description={meta.description}
          actions={
            <button type="button" onClick={handleSignOut} className={panelBtnSecondary}>
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeSection === 'encomendas' && <EncomendasListSection />}
          {activeSection === 'layouts' && <EncomendasLayoutsSection />}
          {activeSection === 'mensagens' && <EncomendasMensagensSection />}
          {activeSection === 'pagamentos' && <EncomendasPagamentosSection />}
        </main>
      </div>
    </div>
  );
}

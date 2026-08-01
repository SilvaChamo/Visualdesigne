'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { PanelHeader } from '@/components/panel/PanelHeader';
import { panelBtnSecondary } from '@/lib/panel-ui';
import { usePanelSidebarCollapsed } from '@/hooks/usePanelSidebarCollapsed';
import { EncomendasSidebar, type EncomendasSection } from '@/components/encomendas/EncomendasSidebar';
import { EncomendasListSection } from '@/components/encomendas/EncomendasListSection';
import { EncomendasMensagensSection } from '@/components/encomendas/EncomendasMensagensSection';
import { EncomendasPagamentosSection } from '@/components/encomendas/EncomendasPagamentosSection';
import { EncomendasPerfilSection } from '@/components/encomendas/EncomendasPerfilSection';

const SECTION_META: Record<EncomendasSection, { title: string; description: string }> = {
  encomendas: { title: 'Encomendas', description: 'Painel VisualDesign — acompanhamento de pedidos e aprovação de layouts' },
  mensagens: { title: 'Mensagens', description: 'Fale com a equipa, veja layouts e anexos de uma encomenda específica' },
  pagamentos: { title: 'Pagamentos', description: 'Estado e instruções de pagamento das suas encomendas' },
  perfil: { title: 'O Meu Perfil', description: 'Edite os seus dados de contacto, empresa e senha' },
};

const VALID_SECTIONS: EncomendasSection[] = ['encomendas', 'mensagens', 'pagamentos', 'perfil'];

export default function EncomendasPage() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const initialSection = VALID_SECTIONS.includes(sectionParam as EncomendasSection)
    ? (sectionParam as EncomendasSection)
    : 'encomendas';
  const initialQuotationId = searchParams.get('quotationId');

  const [activeSection, setActiveSection] = useState<EncomendasSection>(initialSection);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [unreadMensagens, setUnreadMensagens] = useState(0);
  const { isCollapsed, setIsCollapsed } = usePanelSidebarCollapsed();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setSessionEmail(data.user?.email ?? null);
    })();
  }, []);

  const refreshUnreadMensagens = () => {
    fetch('/api/cotacoes')
      .then((r) => r.json())
      .then((data) => { if (data.success) setUnreadMensagens(data.unreadTotal || 0); })
      .catch(() => {});
  };

  useEffect(() => { refreshUnreadMensagens(); }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const meta = SECTION_META[activeSection];

  return (
    <div className="panel-shell font-panel flex h-full overflow-hidden bg-gray-50 dark:bg-zinc-950">
      <EncomendasSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        sessionUser={sessionEmail}
        unreadCounts={{ mensagens: unreadMensagens }}
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
          {activeSection === 'mensagens' && <EncomendasMensagensSection initialQuotationId={initialQuotationId} onMessageSent={refreshUnreadMensagens} />}
          {activeSection === 'pagamentos' && <EncomendasPagamentosSection />}
          {activeSection === 'perfil' && <EncomendasPerfilSection />}
        </main>
      </div>
    </div>
  );
}

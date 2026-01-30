
import React, { useState, useEffect } from 'react';
import { Quote, QuoteStatus, QuoteStatus as Status } from './types';
import QuoteDashboard from './components/QuoteDashboard';
import QuoteForm from './components/QuoteForm';
import MaterialReport from './components/MaterialReport';
import StatusReport from './components/StatusReport';
import { supabase } from './lib/supabase';
import { Layout, Plus, FileText, ChevronLeft, Menu, X, BarChart3, Activity, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'materials' | 'statusReport'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dados do Supabase ao iniciar
  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      if (data) setQuotes(data);
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
      // Fallback para localStorage se o Supabase falhar na configuração inicial
      const saved = localStorage.getItem('aorubro_quotes');
      if (saved) setQuotes(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const now = new Date().toISOString();
    const initialMaterials = Array.from({ length: 5 }, () => ({
      id: crypto.randomUUID(),
      supplier: '',
      description: '',
      value: 0,
      valueWithMargin: 0
    }));

    const newQuote: Quote = {
      id: crypto.randomUUID(),
      commercial: '',
      date: new Date().toISOString().split('T')[0],
      client: '',
      nif: '',
      supplier: '',
      quoteNumber: '',
      materials: initialMaterials,
      laborHours: 0,
      laborDays: 0,
      laborPeople: 1,
      distanceKm: 0,
      kmRate: 0.5,
      designHours: 0,
      designRate: 35,
      rounding: 0,
      status: QuoteStatus.DRAFT,
      createdAt: now
    };
    setActiveQuote(newQuote);
    setView('form');
    setIsSidebarOpen(false);
  };

  const handleSaveQuote = async (quote: Quote) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .upsert(quote);

      if (error) throw error;

      await fetchQuotes(); // Recarregar lista atualizada
      setView('dashboard');
    } catch (err) {
      console.error('Erro ao guardar no Supabase:', err);
      alert('Erro ao guardar na nuvem. Os dados serão guardados localmente como backup.');

      // Fallback local
      setQuotes(prev => {
        const index = prev.findIndex(q => q.id === quote.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = quote;
          localStorage.setItem('aorubro_quotes', JSON.stringify(updated));
          return updated;
        }
        const updated = [quote, ...prev];
        localStorage.setItem('aorubro_quotes', JSON.stringify(updated));
        return updated;
      });
      setView('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este orçamento?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchQuotes();
    } catch (err) {
      console.error('Erro ao eliminar no Supabase:', err);
      setQuotes(prev => {
        const updated = prev.filter(q => q.id !== id);
        localStorage.setItem('aorubro_quotes', JSON.stringify(updated));
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setActiveQuote(quote);
    setView('form');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between no-print sticky top-0 z-[60]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
            <Layout className="text-slate-900" size={18} />
          </div>
          <span className="font-bold tracking-tight uppercase text-xs">Budgetly AORUBRO</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[50] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col no-print z-[55] transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Layout className="text-slate-900" size={24} />
          </div>
          <h1 className="font-black text-xl tracking-tighter uppercase">Budgetly AORUBRO</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-yellow-500 text-slate-900 font-bold shadow-lg shadow-yellow-500/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <FileText size={20} />
            <span>Orçamentos</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Relatórios</div>

          <button
            onClick={() => { setView('statusReport'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'statusReport' ? 'bg-yellow-500 text-slate-900 font-bold shadow-lg shadow-yellow-500/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Activity size={20} />
            <span>Fluxo de Trabalho</span>
          </button>

          <button
            onClick={() => { setView('materials'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'materials' ? 'bg-yellow-500 text-slate-900 font-bold shadow-lg shadow-yellow-500/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <BarChart3 size={20} />
            <span>Materiais</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações Rápidas</div>
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
          >
            <Plus size={20} />
            <span>Novo Orçamento</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-black border border-slate-600">G</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black truncate uppercase">Gerência</p>
              <p className="text-[10px] text-slate-500 font-bold">Conetado à Nuvem</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col w-full bg-[#f8fafc]">
        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-yellow-500" size={48} />
              <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Sincronizando com Supabase...</p>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Painel de Orçamentos</h2>
                <p className="text-sm text-slate-500 font-medium">Dados geridos remotamente via Supabase.</p>
              </div>
              <button
                onClick={handleCreateNew}
                className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                <Plus size={20} className="text-yellow-500" />
                Criar Orçamento
              </button>
            </div>
            <QuoteDashboard
              quotes={quotes}
              onEdit={handleEditQuote}
              onDelete={handleDeleteQuote}
            />
          </div>
        )}

        {view === 'materials' && (
          <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Relatório de Materiais</h2>
              <p className="text-sm text-slate-500 font-medium">Análise detalhada de custos e margens por item.</p>
            </div>
            <MaterialReport quotes={quotes} />
          </div>
        )}

        {view === 'statusReport' && (
          <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Fluxo de Trabalho</h2>
              <p className="text-sm text-slate-500 font-medium">Rastreio temporal de todas as fases da proposta.</p>
            </div>
            <StatusReport quotes={quotes} />
          </div>
        )}

        {view === 'form' && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="bg-white/80 backdrop-blur-md border-b px-4 md:px-8 py-4 flex items-center gap-4 no-print sticky top-0 z-40">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-slate-900"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-black text-slate-900 truncate">
                  {activeQuote?.quoteNumber ? `ORÇAMENTO #${activeQuote.quoteNumber}` : 'NOVO ORÇAMENTO'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Editor de Proposta Técnica</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 ${activeQuote?.status === Status.APPROVED ? 'bg-green-50 border-green-200 text-green-700' :
                  activeQuote?.status === Status.PENDING_APPROVAL ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                  {activeQuote?.status}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#f8fafc]">
              {activeQuote && (
                <QuoteForm
                  quote={activeQuote}
                  allQuotes={quotes}
                  onSave={handleSaveQuote}
                  onCancel={() => setView('dashboard')}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

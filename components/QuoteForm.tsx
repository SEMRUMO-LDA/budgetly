
import React, { useState, useMemo, useRef } from 'react';
import { Quote, MaterialItem, LABOR_RATES, QuoteStatus } from '../types';
import { Trash2, Plus, Calculator, Save, Printer, Send, CheckCircle, Info, Loader2, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface QuoteFormProps {
  quote: Quote;
  allQuotes: Quote[];
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ quote, allQuotes, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Quote>(quote);
  const [isExporting, setIsExporting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const quoteNumberRef = useRef<HTMLInputElement>(null);

  const clientSuggestions = useMemo(() => {
    const clients = allQuotes.map(q => q.client).filter(c => !!c);
    return Array.from(new Set(clients)).sort();
  }, [allQuotes]);

  const supplierSuggestions = useMemo(() => {
    const suppliers = allQuotes.flatMap(q => q.materials.map(m => m.supplier)).filter(s => !!s);
    return Array.from(new Set(suppliers)).sort();
  }, [allQuotes]);

  const calculateTotals = useMemo(() => {
    const materialSubtotal = formData.materials.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const materialTotalWithMargin = formData.materials.reduce((sum, item) => sum + (Number(item.valueWithMargin) || 0), 0);

    let laborTotal = 0;
    if (formData.laborDays > 0) {
      laborTotal = (LABOR_RATES.daily as any)[formData.laborPeople] * formData.laborDays;
    } else {
      laborTotal = (LABOR_RATES.hourly as any)[formData.laborPeople] * formData.laborHours;
    }

    const travelTotal = formData.distanceKm * formData.kmRate;
    const designTotal = formData.designHours * formData.designRate;
    const calculatedSubtotal = materialTotalWithMargin + laborTotal + travelTotal + designTotal;

    const isManualTotal = formData.rounding > 0;
    const grandTotal = isManualTotal ? formData.rounding : calculatedSubtotal;

    return {
      materialSubtotal,
      materialTotalWithMargin,
      laborTotal,
      travelTotal,
      designTotal,
      calculatedSubtotal,
      grandTotal,
      isManualTotal,
      profit: isManualTotal
        ? (formData.rounding - (materialSubtotal + laborTotal + travelTotal + designTotal))
        : (materialTotalWithMargin - materialSubtotal)
    };
  }, [formData]);

  const exportAsJpg = async () => {
    if (!summaryRef.current) return;

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const node = summaryRef.current;

      const dataUrl = await toJpeg(node, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        style: {
          borderRadius: '0',
          margin: '0',
          padding: '60px',
          width: '1200px',
          boxSizing: 'border-box',
          display: 'block',
          backgroundColor: '#ffffff',
          overflow: 'visible'
        }
      });

      const link = document.createElement('a');
      const safeClientName = (formData.client || 'CLIENTE').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toUpperCase();
      const fileName = `VALIDACAO_TECNICA_${formData.quoteNumber || 'ORC'}_${safeClientName}.jpg`;
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (err) {
      console.error('Erro ao exportar imagem:', err);
      alert('Erro ao gerar imagem. Tente novamente ou use Imprimir PDF.');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendForApproval = async () => {
    const success = await exportAsJpg();
    if (!success) return;
    const now = new Date().toISOString();
    onSave({
      ...formData,
      status: QuoteStatus.PENDING_APPROVAL,
      sentForApprovalAt: formData.sentForApprovalAt || now
    });
  };

  const handleApproveValues = () => {
    const now = new Date().toISOString();
    onSave({
      ...formData,
      status: QuoteStatus.APPROVED,
      approvedAt: formData.approvedAt || now
    });
  };

  const handleSendToSales = () => {
    if (!formData.quoteNumber || formData.quoteNumber.trim() === '') {
      alert('BLOQUEIO: Para enviar ao comercial, deve primeiro emitir o orçamento no software e colocar o respetivo número no campo "Nº ORÇAMENTO SOFTWARE".');
      quoteNumberRef.current?.focus();
      return;
    }
    const now = new Date().toISOString();
    onSave({
      ...formData,
      status: QuoteStatus.SENT,
      sentToSalesAt: formData.sentToSalesAt || now
    });
  };

  const handleMaterialChange = (id: string, field: keyof MaterialItem, value: any) => {
    const newMaterials = formData.materials.map(item => {
      if (item.id === id) {
        let updatedValue = value;
        if (field === 'supplier' || field === 'description') {
          updatedValue = String(value).toUpperCase();
        }
        const updatedItem = { ...item, [field]: updatedValue };
        if (field === 'value') {
          const numValue = parseFloat(value) || 0;
          updatedItem.valueWithMargin = Number((numValue * 1.5).toFixed(2));
        }
        return updatedItem;
      }
      return item;
    });
    setFormData({ ...formData, materials: newMaterials });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { id: crypto.randomUUID(), supplier: '', description: '', value: 0, valueWithMargin: 0 }]
    });
  };

  const removeMaterial = (id: string) => {
    if (formData.materials.length > 1) {
      setFormData({ ...formData, materials: formData.materials.filter(m => m.id !== id) });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-40 md:pb-24">
      <datalist id="clients-list">
        {clientSuggestions.map(client => <option key={client} value={client} />)}
      </datalist>
      <datalist id="suppliers-list">
        {supplierSuggestions.map(supplier => <option key={supplier} value={supplier} />)}
      </datalist>

      {/* Status Alert */}
      <div className={`p-4 rounded-xl border-l-8 flex flex-col md:flex-row items-start md:items-center justify-between no-print gap-4 shadow-sm ${formData.status === QuoteStatus.PENDING_APPROVAL ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
          formData.status === QuoteStatus.APPROVED ? 'bg-blue-50 border-blue-400 text-blue-800' :
            formData.status === QuoteStatus.SENT ? 'bg-green-50 border-green-400 text-green-800' :
              'bg-slate-900 border-yellow-500 text-white'
        }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.status === QuoteStatus.DRAFT ? 'bg-yellow-500 text-slate-900' : 'bg-white/10'}`}>
            <Info size={20} />
          </div>
          <div>
            <p className="font-black uppercase tracking-wider text-xs">ESTADO: {formData.status}</p>
            <p className="text-xs opacity-80 font-medium uppercase">
              {formData.status === QuoteStatus.DRAFT && "PASSO 1: PREPARAR PROPOSTA E ENVIAR PARA VALIDAÇÃO DE MARGENS."}
              {formData.status === QuoteStatus.PENDING_APPROVAL && "PASSO 2: AGUARDAR OK DA GERÊNCIA SOBRE OS CUSTOS APRESENTADOS."}
              {formData.status === QuoteStatus.APPROVED && "PASSO 3: VALORES ACEITES. EMITA NO SOFTWARE E COLOQUE O NÚMERO PARA CONCLUIR."}
              {formData.status === QuoteStatus.SENT && "PASSO FINAL: ORÇAMENTO ENVIADO E REGISTADO COM SUCESSO."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 p-4 md:p-10 space-y-8 md:space-y-12">
        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comercial Solicitante</label>
            <select
              value={formData.commercial}
              onChange={e => setFormData({ ...formData, commercial: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 border-2 rounded-xl p-3 focus:border-yellow-500 focus:bg-white outline-none transition-all font-bold text-slate-900 uppercase"
            >
              <option value="">Selecione...</option>
              <option value="VÂNIA S.">VÂNIA S.</option>
              <option value="ROBERTO O.">ROBERTO O.</option>
              <option value="BRUNO C.">BRUNO C.</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Pedido</label>
            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-50 border-slate-100 border-2 rounded-xl p-3 focus:border-yellow-500 focus:bg-white outline-none transition-all font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Orçamento Software</label>
            <input
              ref={quoteNumberRef}
              type="text"
              value={formData.quoteNumber}
              onChange={e => setFormData({ ...formData, quoteNumber: e.target.value.toUpperCase() })}
              className={`w-full bg-slate-50 border-2 rounded-xl p-3 focus:border-yellow-500 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 uppercase ${!formData.quoteNumber && formData.status === QuoteStatus.APPROVED ? 'border-red-400 bg-red-50 ring-2 ring-red-100' : 'border-slate-100'}`}
              placeholder={formData.status === QuoteStatus.APPROVED ? "OBRIGATÓRIO AQUI!" : "Ex: 2024/045"}
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidade / Cliente</label>
            <input
              type="text"
              list="clients-list"
              value={formData.client}
              onChange={e => setFormData({ ...formData, client: e.target.value.toUpperCase() })}
              className="w-full bg-slate-50 border-slate-100 border-2 rounded-xl p-4 focus:border-yellow-500 focus:bg-white outline-none transition-all font-black text-lg text-slate-900 uppercase"
              placeholder="NOME DA EMPRESA OU PARTICULAR..."
            />
          </div>
        </div>

        {/* --- Materials Table --- */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              <Calculator className="text-yellow-500" />
              1. TABELA DE MATERIAIS E FABRICO
            </h3>
            <button onClick={addMaterial} className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-all no-print shadow-lg shadow-slate-900/10">
              <Plus size={16} className="text-yellow-500" /> NOVO ITEM
            </button>
          </div>

          <div className="border-2 border-slate-100 rounded-2xl overflow-x-auto scrollbar-hide shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-left border-b-2 border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">FORNECEDOR</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO TÉCNICA</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">CUSTO (€)</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right bg-yellow-50/50">C/ MARGEM (€)</th>
                  <th className="p-4 w-16 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.materials.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <input type="text" list="suppliers-list" value={item.supplier} onChange={e => handleMaterialChange(item.id, 'supplier', e.target.value)} className="w-full bg-transparent p-2 outline-none focus:bg-white focus:ring-1 ring-yellow-500 rounded-lg text-xs font-bold text-slate-700 uppercase" placeholder="Fornecedor..." />
                    </td>
                    <td className="p-2">
                      <input type="text" value={item.description} onChange={e => handleMaterialChange(item.id, 'description', e.target.value)} className="w-full bg-transparent p-2 outline-none focus:bg-white focus:ring-1 ring-yellow-500 rounded-lg text-xs font-medium text-slate-600 uppercase" placeholder="Detalhes do material..." />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.01" value={item.value || ''} onChange={e => handleMaterialChange(item.id, 'value', e.target.value)} className="w-full bg-transparent p-2 text-right outline-none font-bold focus:bg-white focus:ring-1 ring-yellow-500 rounded-lg text-xs" />
                    </td>
                    <td className="p-2 bg-yellow-50/10">
                      <input type="number" step="0.01" value={item.valueWithMargin || ''} onChange={e => handleMaterialChange(item.id, 'valueWithMargin', e.target.value)} className="w-full bg-transparent p-2 text-right outline-none font-black text-slate-900 focus:bg-white focus:ring-1 ring-yellow-500 rounded-lg text-xs" />
                    </td>
                    <td className="p-2 text-center no-print">
                      <button onClick={() => removeMaterial(item.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                <tr>
                  <td colSpan={2} className="p-4 text-right text-[10px] uppercase tracking-widest">SOMA DE MATERIAIS</td>
                  <td className="p-4 text-right text-xs">{calculateTotals.materialSubtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€</td>
                  <td className="p-4 text-right text-yellow-400 text-xs">{calculateTotals.materialTotalWithMargin.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* --- Labor Table --- */}
        <div className="space-y-4">
          <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
            <Clock className="text-yellow-500" />
            2. MÃO-DE-OBRA E MONTAGEM
          </h3>
          <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left border-b-2 border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TIPO DE INTERVENÇÃO</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-center">Nº TÉCNICOS</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-center">QUANTIDADE</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right">VALOR UNIT.</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right bg-slate-100/50">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-4 text-xs font-bold text-slate-700 uppercase">EXECUÇÃO TÉCNICA / MONTAGEM EXTERNA</td>
                  <td className="p-4">
                    <select
                      value={formData.laborPeople}
                      onChange={e => setFormData({ ...formData, laborPeople: parseInt(e.target.value) as any })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-yellow-500 uppercase"
                    >
                      <option value={1}>1 PESSOA</option>
                      <option value={2}>2 PESSOAS</option>
                      <option value={3}>3 PESSOAS</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="H"
                        value={formData.laborHours || ''}
                        onChange={e => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || 0, laborDays: 0 })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-yellow-500"
                      />
                      <input
                        type="number"
                        placeholder="DIAS"
                        value={formData.laborDays || ''}
                        onChange={e => setFormData({ ...formData, laborDays: parseFloat(e.target.value) || 0, laborHours: 0 })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-yellow-500"
                      />
                    </div>
                  </td>
                  <td className="p-4 text-right text-xs font-bold text-slate-400">
                    {formData.laborDays > 0
                      ? `${(LABOR_RATES.daily as any)[formData.laborPeople]}€ / DIA`
                      : `${(LABOR_RATES.hourly as any)[formData.laborPeople]}€ / H`
                    }
                  </td>
                  <td className="p-4 text-right text-sm font-black text-slate-900 bg-slate-50/30">
                    {calculateTotals.laborTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="p-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">SOMA MÃO-DE-OBRA</td>
                  <td className="p-4 text-right text-sm font-black text-slate-900">{calculateTotals.laborTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* --- Logistics & Design Table --- */}
        <div className="space-y-4">
          <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
            <MapPin className="text-yellow-500" />
            3. LOGÍSTICA E DESIGN
          </h3>
          <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left border-b-2 border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">RUBRICA</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-center">QUANTIDADE</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right">TARIFA UNIT.</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right bg-slate-100/50">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Travel Row */}
                <tr>
                  <td className="p-4 text-xs font-bold text-slate-700 uppercase">DESLOCAÇÃO E TRANSPORTE (KM TOTAL)</td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={formData.distanceKm || ''}
                      onChange={e => setFormData({ ...formData, distanceKm: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-yellow-500"
                    />
                  </td>
                  <td className="p-4 text-right text-xs font-bold text-slate-400">
                    {formData.kmRate.toFixed(2)}€ / KM
                  </td>
                  <td className="p-4 text-right text-sm font-black text-slate-900 bg-slate-50/30">
                    {calculateTotals.travelTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                  </td>
                </tr>
                {/* Design Row */}
                <tr>
                  <td className="p-4 text-xs font-bold text-slate-700 uppercase">DESIGN GRÁFICO E ARTE FINAL (HORAS)</td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={formData.designHours || ''}
                      onChange={e => setFormData({ ...formData, designHours: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-yellow-500"
                    />
                  </td>
                  <td className="p-4 text-right text-xs font-bold text-slate-400">
                    {formData.designRate.toFixed(2)}€ / H
                  </td>
                  <td className="p-4 text-right text-sm font-black text-slate-900 bg-slate-50/30">
                    {calculateTotals.designTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="p-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">SOMA LOGÍSTICA / DESIGN</td>
                  <td className="p-4 text-right text-sm font-black text-slate-900">{(calculateTotals.travelTotal + calculateTotals.designTotal).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* --- JPG PREVIEW SECTION --- */}
        <div className="pt-10 border-t-2 border-slate-50 no-print">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PRÉ-VISUALIZAÇÃO INTERNA</p>
              <p className="text-xs text-slate-500 font-medium italic uppercase">O JPG exportado terá estas dimensões e margens exatas.</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold uppercase">1200PX × VARIÁVEL</span>
          </div>

          <div className="bg-slate-100 p-4 md:p-12 rounded-[2rem] overflow-x-auto scrollbar-hide flex justify-start lg:justify-center border-4 border-dashed border-slate-200">
            <div
              ref={summaryRef}
              style={{ width: '1100px', minWidth: '1100px', backgroundColor: '#ffffff' }}
              className="p-16 space-y-16 shadow-2xl bg-white border border-slate-100"
            >
              <div className="flex justify-between items-start border-b-8 border-slate-900 pb-12">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">VALIDAÇÃO TÉCNICA</h2>
                  <p className="text-2xl text-slate-500 font-black tracking-tight uppercase">REF. ORÇAMENTO: <span className="text-slate-900">{formData.quoteNumber || 'PENDENTE'}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">SOLICITADO POR</p>
                  <p className="text-3xl font-black text-slate-900 leading-none mb-2 uppercase">{formData.commercial || 'N/A'}</p>
                  <p className="text-base font-bold text-slate-500 uppercase">{format(new Date(formData.date), 'dd MMMM yyyy', { locale: pt }).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-16">
                <div className="col-span-8 space-y-12">
                  <div className="bg-slate-50 p-10 rounded-3xl border-l-[12px] border-slate-900">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">ENTIDADE / CLIENTE FINAL</p>
                    <p className="text-4xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{formData.client || 'CONSUMIDOR FINAL'}</p>
                  </div>

                  <div className="space-y-6">
                    <p className="text-sm font-black text-slate-900 uppercase border-b-4 border-slate-900 pb-3 tracking-widest">DISCRIMINAÇÃO DE CUSTOS UNIFICADA</p>
                    <table className="w-full table-fixed text-sm">
                      <thead className="text-left text-slate-400">
                        <tr>
                          <th className="pb-6 font-black uppercase text-[10px] tracking-widest w-[25%]">ORIGEM</th>
                          <th className="pb-6 font-black uppercase text-[10px] tracking-widest w-[35%]">ESPECIFICAÇÃO TÉCNICA</th>
                          <th className="pb-6 text-right font-black uppercase text-[10px] tracking-widest w-[20%]">CUSTO (€)</th>
                          <th className="pb-6 text-right font-black uppercase text-[10px] tracking-widest w-[20%] bg-yellow-50/50">C/ MARGEM (€)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.materials.filter(m => (m.description?.trim() !== '') || (Number(m.value) > 0)).map(m => (
                          <tr key={m.id}>
                            <td className="py-5 pr-8 font-black text-slate-800 align-top break-words text-xs uppercase tracking-tight">
                              {m.supplier || 'STOCK'}
                            </td>
                            <td className="py-5 pr-8 text-xs text-slate-600 align-top break-words leading-relaxed font-medium uppercase">
                              {m.description || 'N/A'}
                            </td>
                            <td className="py-5 text-right font-bold text-slate-900 align-top text-base">
                              {Number(m.value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base bg-yellow-50/20">
                              {Number(m.valueWithMargin).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        ))}

                        {(formData.laborHours > 0 || formData.laborDays > 0) && (
                          <tr className="bg-slate-50/50">
                            <td className="py-5 pr-8 font-black text-slate-900 uppercase text-[11px] tracking-widest align-top">
                              MÃO-DE-OBRA
                            </td>
                            <td className="py-5 pr-8 text-xs text-slate-600 align-top leading-relaxed font-medium uppercase">
                              EXECUÇÃO TÉCNICA ({formData.laborPeople} PERS.) • {formData.laborDays > 0 ? `${formData.laborDays} DIAS` : `${formData.laborHours} HORAS`}
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base">
                              {calculateTotals.laborTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base bg-yellow-50/20">
                              {calculateTotals.laborTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        )}

                        {formData.distanceKm > 0 && (
                          <tr>
                            <td className="py-5 pr-8 font-black text-slate-900 uppercase text-[11px] tracking-widest align-top">
                              LOGÍSTICA
                            </td>
                            <td className="py-5 pr-8 text-xs text-slate-600 align-top leading-relaxed font-medium uppercase">
                              DESLOCAÇÃO E TRANSPORTE ({formData.distanceKm} KM)
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base">
                              {calculateTotals.travelTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base bg-yellow-50/20">
                              {calculateTotals.travelTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        )}

                        {formData.designHours > 0 && (
                          <tr>
                            <td className="py-5 pr-8 font-black text-slate-900 uppercase text-[11px] tracking-widest align-top">
                              ARTE FINAL
                            </td>
                            <td className="py-5 pr-8 text-xs text-slate-600 align-top leading-relaxed font-medium uppercase">
                              DESIGN E FECHO DE FICHEIRO ({formData.designHours}H)
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base">
                              {calculateTotals.designTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                            <td className="py-5 text-right font-black text-slate-900 align-top text-base bg-yellow-50/20">
                              {calculateTotals.designTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {formData.notes && (
                    <div className="p-10 bg-yellow-50 rounded-[2.5rem] border-4 border-yellow-200 shadow-sm">
                      <p className="text-[11px] font-black text-yellow-600 uppercase mb-4 tracking-[0.2em]">OBSERVAÇÕES TÉCNICAS IMPORTANTES</p>
                      <p className="text-base text-slate-800 whitespace-pre-wrap font-bold leading-relaxed italic uppercase">"{formData.notes}"</p>
                    </div>
                  )}
                </div>

                <div className="col-span-4">
                  <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-yellow-500 flex flex-col justify-between min-h-[650px] sticky top-16">
                    <div className="space-y-10">
                      <div>
                        <p className="text-[14px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-3">MARGEM DE FABRICO</p>
                        <p className="text-5xl font-black tracking-tighter text-yellow-50 leading-none">
                          {calculateTotals.profit.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </p>
                      </div>


                    </div>

                    <div className="pt-12 border-t-4 border-yellow-500/40">
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                        {calculateTotals.isManualTotal ? 'VALOR FINAL ACORDADO' : 'PREÇO SUGERIDO (S/ IVA)'}
                      </p>
                      <p className="text-6xl font-black text-yellow-400 tracking-tighter leading-tight mb-8">
                        {calculateTotals.grandTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </p>
                      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700">
                        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider leading-relaxed text-center">
                          DOCUMENTO INTERNO CONFIDENCIAL PARA USO DA GERÊNCIA DA AORUBRO.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes & Adjusted Totals */}
        <div className="pt-8 border-t-2 border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-10 no-print">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">NOTAS ADICIONAIS P/ COMERCIAL</label>
            <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value.toUpperCase() })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 h-40 outline-none focus:border-yellow-500 focus:bg-white text-sm font-medium shadow-inner transition-all uppercase" placeholder="EX: PRAZO DE ENTREGA PREVISTO PARA 12 DIAS ÚTEIS..." />
          </div>

          <div className="w-full md:w-96 space-y-5">
            <div className="flex justify-between items-center text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs font-black uppercase tracking-widest">SUBTOTAL CALCULADO</span>
              <span className="font-black text-slate-900">{calculateTotals.calculatedSubtotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 bg-slate-50 p-3 rounded-xl border-2 border-yellow-500 shadow-lg shadow-yellow-500/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">VALOR FINAL (FIXO)</span>
              <input type="number" value={formData.rounding || ''} onChange={e => setFormData({ ...formData, rounding: parseFloat(e.target.value) || 0 })} className="w-24 text-right border-2 border-slate-200 rounded-lg p-2 text-xs font-black outline-none focus:border-yellow-500 bg-yellow-50" />
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border-b-8 border-yellow-500 text-right shadow-2xl">
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-2">
                {calculateTotals.isManualTotal ? 'VALOR FINAL ACORDADO' : 'PREÇO FINAL PROPOSTO'}
              </p>
              <p className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">
                {calculateTotals.grandTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Action Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 md:p-5 px-6 md:px-10 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row items-center justify-between no-print z-50 gap-4">
        <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest px-4 transition-colors">CANCELAR</button>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 text-slate-700 border-2 border-slate-200 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all">
            <Printer size={18} /> <span>PDF</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          <button onClick={() => onSave(formData)} className="flex items-center justify-center gap-2 bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all">
            <Save size={18} /> <span>GUARDAR</span>
          </button>

          {formData.status === QuoteStatus.DRAFT && (
            <button
              onClick={handleSendForApproval}
              disabled={isExporting}
              className={`flex items-center justify-center gap-3 ${isExporting ? 'bg-slate-300 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'} text-slate-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20 active:scale-95`}
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              <span>{isExporting ? 'A GERAR...' : 'ENVIAR VALIDAÇÃO'}</span>
            </button>
          )}

          {formData.status === QuoteStatus.PENDING_APPROVAL && (
            <button onClick={handleApproveValues} className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-600/20">
              <CheckCircle size={18} /> <span>VALIDAR VALORES</span>
            </button>
          )}

          {formData.status === QuoteStatus.APPROVED && (
            <button onClick={handleSendToSales} className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20">
              <Send size={18} /> <span>ENVIAR AO COMERCIAL</span>
            </button>
          )}

          {formData.status === QuoteStatus.SENT && (
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest">
              <CheckCircle2 size={18} className="text-green-600" />
              <span>CONCLUÍDO</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteForm;

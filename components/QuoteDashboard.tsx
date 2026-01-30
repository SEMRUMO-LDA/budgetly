
import React from 'react';
import { Quote, QuoteStatus } from '../types';
import { Edit2, Trash2, Clock, CheckCircle2, AlertCircle, Send, ExternalLink, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface QuoteDashboardProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

const QuoteDashboard: React.FC<QuoteDashboardProps> = ({ quotes, onEdit, onDelete }) => {
  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.SENT: return <CheckCircle2 className="text-green-600" size={16} />;
      case QuoteStatus.APPROVED: return <CheckCircle className="text-blue-500" size={16} />;
      case QuoteStatus.PENDING_APPROVAL: return <Clock className="text-yellow-500" size={16} />;
      case QuoteStatus.REJECTED: return <AlertCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  const getStatusClass = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.SENT: return "bg-green-50 text-green-800 border-green-200 shadow-sm shadow-green-100";
      case QuoteStatus.APPROVED: return "bg-blue-50 text-blue-700 border-blue-200";
      case QuoteStatus.PENDING_APPROVAL: return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case QuoteStatus.REJECTED: return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const calculateTotal = (quote: Quote) => {
    if (quote.rounding > 0) return quote.rounding;

    const materials = quote.materials.reduce((sum, m) => sum + (Number(m.valueWithMargin) || 0), 0);
    const labor = quote.laborDays > 0 
      ? (quote.laborDays * (quote.laborPeople === 1 ? 200 : quote.laborPeople === 2 ? 350 : 425)) 
      : (quote.laborHours * (quote.laborPeople === 1 ? 30 : quote.laborPeople === 2 ? 50 : 75));
    const travel = quote.distanceKm * quote.kmRate;
    const design = quote.designHours * quote.designRate;
    return materials + labor + travel + design;
  };

  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 md:p-20 text-center shadow-inner">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="text-slate-200" size={40} />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sem orçamentos ativos</h3>
        <p className="text-slate-500 max-w-sm mx-auto font-medium uppercase">Os orçamentos criados pelos comerciais aparecerão aqui para validação e controlo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
              <th className="px-6 py-5 w-32">DATA</th>
              <th className="px-6 py-5">CLIENTE</th>
              <th className="px-6 py-5 w-40">Nº ORÇAMENTO</th>
              <th className="px-6 py-5 w-44">ESTADO</th>
              <th className="px-6 py-5 w-32">COMERCIAL</th>
              <th className="px-6 py-5 text-right w-40">TOTAL (S/ IVA)</th>
              <th className="px-6 py-5 text-center w-32">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {quotes.map((quote) => (
              <tr key={quote.id} className={`hover:bg-slate-50/80 transition-all group ${quote.status === QuoteStatus.SENT ? 'bg-green-50/20' : ''}`}>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-xs font-bold text-slate-900">
                    {format(new Date(quote.date), 'dd MMM yyyy', { locale: pt }).toUpperCase()}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]" title={quote.client || 'Consumidor Final'}>
                    {quote.client || <span className="text-slate-300 font-normal italic">CONSUMIDOR FINAL</span>}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className={`font-black text-xs uppercase ${quote.quoteNumber ? 'text-slate-900' : 'text-slate-400 italic font-normal'}`}>
                    {quote.quoteNumber || 'PENDENTE'}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${getStatusClass(quote.status)}`}>
                    {getStatusIcon(quote.status)}
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="text-[11px] text-slate-600 font-black uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded inline-block">
                    {quote.commercial || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className={`text-sm font-black ${quote.status === QuoteStatus.SENT ? 'text-green-700' : 'text-slate-900'}`}>
                    {calculateTotal(quote).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onEdit(quote)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(quote.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all"
                      onClick={() => onEdit(quote)}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuoteDashboard;

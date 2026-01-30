
import React, { useState } from 'react';
import { Quote, QuoteStatus } from '../types';
import { Search, Clock, CheckCircle2, Send, FilePlus, UserCheck, Calendar, ArrowRight, History, Zap } from 'lucide-react';
import { format, differenceInHours, differenceInDays, formatDistanceStrict } from 'date-fns';
import { pt } from 'date-fns/locale';

interface StatusReportProps {
  quotes: Quote[];
}

const StatusReport: React.FC<StatusReportProps> = ({ quotes }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotes = quotes.filter(q => 
    q.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.commercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStepData = (quote: Quote) => {
    const steps = [
      { label: 'Criação', date: quote.createdAt, icon: FilePlus, color: 'bg-slate-200 text-slate-500' },
      { label: 'Validação', date: quote.sentForApprovalAt, icon: Send, color: 'bg-yellow-100 text-yellow-600' },
      { label: 'Aprovação', date: quote.approvedAt, icon: UserCheck, color: 'bg-blue-100 text-blue-600' },
      { label: 'Enviado', date: quote.sentToSalesAt, icon: CheckCircle2, color: 'bg-green-100 text-green-600' }
    ];

    // Determinar o índice atual baseado no status
    let activeIndex = 0;
    if (quote.status === QuoteStatus.PENDING_APPROVAL) activeIndex = 1;
    if (quote.status === QuoteStatus.APPROVED) activeIndex = 2;
    if (quote.status === QuoteStatus.SENT) activeIndex = 3;

    return { steps, activeIndex };
  };

  const getTimeDiff = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
        return formatDistanceStrict(new Date(end), new Date(start), { locale: pt });
    } catch (e) {
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar orçamento..." 
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-yellow-500 transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-2xl border flex items-center gap-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                <Clock size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Aberto</p>
                <p className="text-xl font-black text-slate-900">{quotes.filter(q => q.status !== QuoteStatus.SENT).length}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concluídos</p>
                <p className="text-xl font-black text-slate-900">{quotes.filter(q => q.status === QuoteStatus.SENT).length}</p>
            </div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        {filteredQuotes.length > 0 ? filteredQuotes.map((q) => {
          const { steps, activeIndex } = getStepData(q);
          
          return (
            <div key={q.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                
                {/* Info Block */}
                <div className="w-full lg:w-1/4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase">#{q.quoteNumber || 'S/ REF'}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{q.commercial}</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 uppercase truncate" title={q.client}>
                    {q.client || 'CONSUMIDOR FINAL'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">Iniciado em {format(new Date(q.createdAt), "dd 'de' MMM, HH:mm", { locale: pt })}</p>
                </div>

                {/* Stepper Block */}
                <div className="flex-1 w-full py-4">
                  <div className="relative flex items-center justify-between">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0" />
                    
                    {/* Active Line Progress */}
                    <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-yellow-500 rounded-full z-0 transition-all duration-700" 
                        style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = idx <= activeIndex;
                      const isLast = idx === steps.length - 1;
                      const timeTaken = idx > 0 ? getTimeDiff(steps[idx-1].date, steps[idx].date) : null;

                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-4 border-white shadow-sm
                            ${isCompleted ? 'bg-yellow-500 text-slate-900' : 'bg-slate-100 text-slate-300'}
                          `}>
                            <Icon size={18} />
                          </div>
                          
                          {/* Label e Time */}
                          <div className="absolute top-12 whitespace-nowrap text-center">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isCompleted ? 'text-slate-900' : 'text-slate-300'}`}>
                              {step.label}
                            </p>
                            {timeTaken && isCompleted && (
                                <p className="text-[8px] font-bold text-green-500 flex items-center justify-center gap-0.5 mt-0.5">
                                    <Zap size={8} /> {timeTaken}
                                </p>
                            )}
                            {step.date && isCompleted && (
                                <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                                    {format(new Date(step.date), 'dd/MM HH:mm')}
                                </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Time Badge */}
                <div className="w-full lg:w-48 flex flex-col items-end justify-center pt-8 lg:pt-0">
                    <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-right w-full lg:w-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lead Time Total</p>
                        <p className="text-sm font-black text-slate-900">
                            {q.sentToSalesAt ? getTimeDiff(q.createdAt, q.sentToSalesAt) : 'Em curso...'}
                        </p>
                    </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="font-black text-slate-400 uppercase tracking-widest">Sem registos no fluxo de trabalho</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusReport;

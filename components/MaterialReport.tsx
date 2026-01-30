
import React, { useState } from 'react';
import { Quote } from '../types';
import { Search, Download, Filter, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MaterialReportProps {
  quotes: Quote[];
}

const MaterialReport: React.FC<MaterialReportProps> = ({ quotes }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allMaterials = quotes.flatMap(quote => 
    quote.materials.map(material => ({
      ...material,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      quoteDate: quote.date,
      client: quote.client,
      commercial: quote.commercial
    }))
  ).sort((a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime());

  const filteredMaterials = allMaterials.filter(m => 
    m.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBase = filteredMaterials.reduce((sum, m) => sum + (Number(m.value) || 0), 0);
  const totalMargin = filteredMaterials.reduce((sum, m) => sum + (Number(m.valueWithMargin) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por fornecedor, cliente ou material..." 
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-yellow-500 transition-all text-sm shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-slate-900/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Base</span>
            <span className="text-lg font-black">{totalBase.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <div className="bg-yellow-500 text-slate-900 px-5 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-yellow-500/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Total Comercial</span>
            <span className="text-lg font-black">{totalMargin.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                <th className="px-6 py-5">Data/Orçamento</th>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5">Fornecedor</th>
                <th className="px-6 py-5">Descrição do Material</th>
                <th className="px-6 py-5 text-right">Custo Base (€)</th>
                <th className="px-6 py-5 text-right">Valor Comercial (€)</th>
                <th className="px-6 py-5 text-center">Rácio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMaterials.length > 0 ? filteredMaterials.map((m, idx) => (
                <tr key={`${m.quoteId}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-900">{format(new Date(m.quoteDate), 'dd/MM/yyyy')}</div>
                    <div className="text-[10px] text-slate-400 font-medium">#{m.quoteNumber || 'PENDENTE'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]" title={m.client}>
                      {m.client || 'CONSUMIDOR FINAL'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                      {m.supplier || 'STOCK/INTERNO'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 font-medium line-clamp-1" title={m.description}>
                      {m.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {Number(m.value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-black text-yellow-600">
                      {Number(m.valueWithMargin).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className="bg-green-50 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-green-200">
                        +50%
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    Nenhum material encontrado com os critérios de pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaterialReport;

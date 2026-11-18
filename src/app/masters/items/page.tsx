'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Upload, Search, Layers } from 'lucide-react';
import { repository } from '@/lib/db';
import { Item } from '@/types';
import CsvImportModal from '@/components/common/CsvImportModal';

export default function ItemsMasterPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'raw_material' | 'material'>('ALL');
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  const loadItems = useCallback(async () => {
    const data = await repository.getItems();
    setItems(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems();
  }, [loadItems]);

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    await repository.importItems(rows);
    await loadItems();
  };

  const filtered = items.filter((item) => {
    const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchText =
      item.item_id.toLowerCase().includes(search.toLowerCase()) ||
      item.item_name.includes(search) ||
      (item.supplier_name && item.supplier_name.includes(search));
    return matchCategory && matchText;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#00D2FF]" />
            原材料・資材マスタ管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            規格量（発注ロット単位）・単価・安全在庫・発注先の管理
          </p>
        </div>

        <button
          onClick={() => setIsCsvOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90 transition-colors self-start"
        >
          <Upload className="w-4 h-4" />
          CSVインポート
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#1E2132] p-1 rounded-xl border border-slate-800 flex items-center self-start">
          {[
            { key: 'ALL', label: 'すべて' },
            { key: 'raw_material', label: '原材料' },
            { key: 'material', label: '資材' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key as 'ALL' | 'raw_material' | 'material')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === tab.key
                  ? 'bg-[#00D2FF] text-[#121420]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="品目ID・品目名・発注先で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1E2132] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#00D2FF]"
          />
        </div>
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
              <th className="py-3.5 px-4 font-medium">品目ID</th>
              <th className="py-3.5 px-4 font-medium">区分</th>
              <th className="py-3.5 px-4 font-medium">品目名</th>
              <th className="py-3.5 px-4 font-medium text-right">規格量</th>
              <th className="py-3.5 px-4 font-medium text-right">単価</th>
              <th className="py-3.5 px-4 font-medium text-right">安全在庫</th>
              <th className="py-3.5 px-4 font-medium text-right">現在庫</th>
              <th className="py-3.5 px-4 font-medium">発注先</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filtered.map((item) => (
              <tr key={item.item_id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-[#00D2FF]">{item.item_id}</td>
                <td className="py-3 px-4">
                  {item.category === 'raw_material' ? (
                    <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300">原材料</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-300">資材</span>
                  )}
                </td>
                <td className="py-3 px-4 font-medium text-slate-100">{item.item_name}</td>
                <td className="py-3 px-4 text-right font-mono">
                  {item.spec_qty} {item.unit}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  ¥{item.unit_price.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400">
                  {item.safety_stock} {item.unit}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-400">
                  {item.current_stock} {item.unit}
                </td>
                <td className="py-3 px-4 text-slate-300">{item.supplier_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CsvImportModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        title="原材料・資材マスタ CSVインポート"
        expectedHeaders={[
          'item_id',
          'item_name',
          'category',
          'spec_qty',
          'unit',
          'unit_price',
          'safety_stock',
          'supplier_name',
        ]}
        sampleRow="R010,P15菓子パンミックス,raw_material,20,kg,344,300,〇〇商事"
        onImport={handleCsvImport}
      />
    </div>
  );
}
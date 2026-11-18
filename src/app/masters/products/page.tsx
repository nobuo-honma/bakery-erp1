'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Upload, Search, PackageCheck } from 'lucide-react';
import { repository } from '@/lib/db';
import { Product } from '@/types';
import { calcPacksPerCase } from '@/lib/erp-logic';
import CsvImportModal from '@/components/common/CsvImportModal';

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    const data = await repository.getProducts();
    setProducts(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, [loadProducts]);

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    await repository.importProducts(rows);
    await loadProducts();
  };

  const filtered = products.filter(
    (p) =>
      p.product_id.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name.includes(search) ||
      p.flavor_name.includes(search)
  );

  const lotRuleBadge = (rule: string) => {
    switch (rule) {
      case 'NO_DAY_00':
        return <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300">日00固定</span>;
      case 'ASSORT_MANUAL':
        return <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-300">アソート連番</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300">通常採番</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-[#00D2FF]" />
            製品マスタ管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            製品規格・1kgあたり製造数・1c/sおよび1p換算ルールの管理
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

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="コード・製品名・味で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1E2132] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#00D2FF]"
        />
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
              <th className="py-3.5 px-4 font-medium">コード</th>
              <th className="py-3.5 px-4 font-medium">製品名</th>
              <th className="py-3.5 px-4 font-medium">製造種類（味）</th>
              <th className="py-3.5 px-4 font-medium text-right">1kg製造数</th>
              <th className="py-3.5 px-4 font-medium text-right">1c/s入数</th>
              <th className="py-3.5 px-4 font-medium text-right">1p必要数</th>
              <th className="py-3.5 px-4 font-medium text-right">1c/sあたりp数</th>
              <th className="py-3.5 px-4 font-medium">ロット採番</th>
              <th className="py-3.5 px-4 font-medium">受注可否</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filtered.map((p) => (
              <tr key={p.product_id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-[#00D2FF]">{p.product_id}</td>
                <td className="py-3 px-4 font-medium text-slate-100">{p.product_name}</td>
                <td className="py-3 px-4 text-slate-300">{p.flavor_name}</td>
                <td className="py-3 px-4 text-right font-mono">{p.pieces_per_kg} 個</td>
                <td className="py-3 px-4 text-right font-mono">
                  {p.pieces_per_cs} {p.is_assort ? 'p' : '個'}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {p.is_assort ? '各1個(計3個)' : `${p.pieces_per_pack} 個`}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-400">
                  {calcPacksPerCase(p.pieces_per_cs, p.pieces_per_pack)} p
                </td>
                <td className="py-3 px-4">{lotRuleBadge(p.lot_rule_type)}</td>
                <td className="py-3 px-4">
                  {p.is_active === 1 ? (
                    <span className="text-xs text-emerald-400">有効</span>
                  ) : (
                    <span className="text-xs text-slate-500">FD専用(単品不可)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CsvImportModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        title="製品マスタ CSVインポート"
        expectedHeaders={[
          'product_id',
          'product_name',
          'flavor_name',
          'pieces_per_kg',
          'pieces_per_cs',
          'pieces_per_pack',
          'lot_rule_type',
        ]}
        sampleRow="C3,キュウメイパン,チョコチップ,29,48,2,NORMAL"
        onImport={handleCsvImport}
      />
    </div>
  );
}
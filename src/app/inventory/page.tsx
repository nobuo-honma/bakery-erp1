'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Package, History, SlidersHorizontal } from 'lucide-react';
import { repository } from '@/lib/db';
import { Item, InventoryLog } from '@/types';

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  const [editingTarget, setEditingTarget] = useState<{ type: 'ITEM' | 'PRODUCT'; id: string; current: number } | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [reason, setReason] = useState('定期棚卸し');

  const loadAll = useCallback(async () => {
    const [iData, logData] = await Promise.all([
      repository.getItems(),
      repository.getInventoryLogs(),
    ]);
    setItems(iData);
    setLogs(logData);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;

    await repository.updateInventoryStock({
      target_type: editingTarget.type,
      target_id: editingTarget.id,
      new_stock: newStockVal,
      reason,
    });

    setEditingTarget(null);
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-[#00D2FF]" />
          在庫管理 ＆ 棚卸し・履歴
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          原材料・資材・製品ロットの現在庫管理および棚卸調整・変更履歴の追跡
        </p>
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white">原材料・資材 在庫一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
                <th className="py-3 px-4">品目ID</th>
                <th className="py-3 px-4">品目名</th>
                <th className="py-3 px-4 text-right">現在庫</th>
                <th className="py-3 px-4 text-right">安全在庫</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {items.map((item) => (
                <tr key={item.item_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-[#00D2FF]">{item.item_id}</td>
                  <td className="py-3 px-4 text-slate-100">{item.item_name}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    {item.current_stock} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    {item.safety_stock} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingTarget({ type: 'ITEM', id: item.item_id, current: item.current_stock });
                        setNewStockVal(item.current_stock);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-[#00D2FF] hover:text-[#121420] text-xs rounded-lg transition-colors"
                    >
                      棚卸修正
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-[#00D2FF]" />
          在庫変動・棚卸履歴ログ
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
                <th className="py-3 px-4">日時</th>
                <th className="py-3 px-4">区分</th>
                <th className="py-3 px-4">対象ID</th>
                <th className="py-3 px-4 text-right">変更後数量</th>
                <th className="py-3 px-4">理由</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {logs.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">{log.created_at}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-200">
                      {log.target_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#00D2FF]">{log.target_id}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">{log.change_qty}</td>
                  <td className="py-3 px-4 text-slate-300">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1E2132] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#00D2FF]" />
              在庫数・棚卸修正
            </h2>
            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">対象ID: {editingTarget.id}</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(Number(e.target.value))}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">修正理由・備考 *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#00D2FF] text-[#121420]"
                >
                  変更を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
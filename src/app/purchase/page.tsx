'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Calculator, CheckCircle, Printer } from 'lucide-react';
import { repository } from '@/lib/db';
import { floor2 } from '@/lib/erp-logic';
import { Item, UnplannedRequirementResult } from '@/types';

interface CalculatedRequirement {
  item: Item;
  rawRequiredQty: number;
  recommendedLots: number;
  inputLots: number;
}

export default function PurchaseManagementPage() {
  const [requirements, setRequirements] = useState<CalculatedRequirement[]>([]);
  const [unplannedSummary, setUnplannedSummary] = useState<UnplannedRequirementResult['unplannedDetails']>([]);
  const [isOrderedSuccess, setIsOrderedSuccess] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const calculateRequirements = useCallback(async () => {
    const { unplannedDetails, allBom, allItems } = await repository.getUnplannedRequirements();
    setUnplannedSummary(unplannedDetails);

    const accumulator: Record<string, number> = {};

    for (const detail of unplannedDetails) {
      const orderCs = Number(detail.order_cs);
      const totalPieces = orderCs * Number(detail.pieces_per_cs);
      const baseFlourKg = totalPieces / Number(detail.pieces_per_kg);

      const productBoms = allBom.filter((b) => b.product_id === detail.product_id);
      for (const b of productBoms) {
        let needed = 0;
        if (b.calc_basis === 'production_qty') {
          needed = baseFlourKg * Number(b.usage_rate);
        } else if (b.calc_basis === 'order_qty') {
          needed = orderCs * Number(b.usage_rate);
        }
        accumulator[b.item_id] = (accumulator[b.item_id] || 0) + needed;
      }
    }

    const calcList: CalculatedRequirement[] = allItems
      .filter((item: Item) => accumulator[item.item_id] !== undefined && accumulator[item.item_id] > 0)
      .map((item: Item) => {
        const flooredRequired = floor2(accumulator[item.item_id]);
        const netShortage = flooredRequired + Number(item.safety_stock) - Number(item.current_stock);
        const recLots = netShortage > 0 ? Math.ceil(netShortage / Number(item.spec_qty)) : 0;

        return {
          item,
          rawRequiredQty: flooredRequired,
          recommendedLots: recLots,
          inputLots: recLots,
        };
      });

    setRequirements(calcList);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    calculateRequirements();
  }, [calculateRequirements]);

  const handleLotChange = (itemId: string, lots: number) => {
    setRequirements((prev) =>
      prev.map((req) => (req.item.item_id === itemId ? { ...req, inputLots: Math.max(0, lots) } : req))
    );
  };

  const handleConfirmPurchase = async () => {
    const targetOrders = requirements
      .filter((r) => r.inputLots > 0)
      .map((r) => ({
        po_date: new Date().toISOString().split('T')[0],
        supplier_name: r.item.supplier_name || '未設定発注先',
        item_id: r.item.item_id,
        order_lots: r.inputLots,
        total_qty: floor2(r.inputLots * r.item.spec_qty),
      }));

    if (targetOrders.length === 0) return;
    await repository.createPurchaseOrders(targetOrders);
    setIsOrderedSuccess(true);
    setTimeout(() => setIsOrderedSuccess(false), 4000);
  };

  const totalOrderAmount = requirements.reduce((sum, r) => {
    const qty = r.inputLots * r.item.spec_qty;
    return sum + qty * r.item.unit_price;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#00D2FF]" />
            原材料・資材 発注管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            未計画の受注データからBOM所要量を自動算出（小数点第3位以下切り捨て）
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSlipModal(true)}
            disabled={requirements.filter((r) => r.inputLots > 0).length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2132] border border-slate-700 text-slate-200 font-semibold text-sm hover:border-[#00D2FF] disabled:opacity-40"
          >
            <Printer className="w-4 h-4 text-[#00D2FF]" />
            発注書プレビュー
          </button>

          <button
            onClick={handleConfirmPurchase}
            disabled={requirements.filter((r) => r.inputLots > 0).length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90 disabled:opacity-40"
          >
            <CheckCircle className="w-4 h-4" />
            発注データを確定登録
          </button>
        </div>
      </div>

      {isOrderedSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          発注データを登録しました。
        </div>
      )}

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-4">
        <h2 className="text-xs font-bold text-[#00D2FF] uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Calculator className="w-4 h-4" />
          計算対象の未計画受注（{unplannedSummary.length} 明細）
        </h2>
        {unplannedSummary.length === 0 ? (
          <p className="text-sm text-slate-400">現在、製造未計画の受注はありません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unplannedSummary.map((d) => (
              <span
                key={d.detail_id}
                className="px-3 py-1.5 rounded-lg bg-[#121420] border border-slate-800 text-xs text-slate-200"
              >
                <span className="font-mono text-[#00D2FF] mr-1">[{d.product_id}]</span>
                {d.product_name}（{d.flavor_name}）: <strong>{d.order_cs} c/s</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
              <th className="py-3.5 px-4 font-medium">品目ID / 名称</th>
              <th className="py-3.5 px-4 font-medium">発注先</th>
              <th className="py-3.5 px-4 font-medium text-right">受注必要量</th>
              <th className="py-3.5 px-4 font-medium text-right">現在庫 / 安全在庫</th>
              <th className="py-3.5 px-4 font-medium text-right">規格量</th>
              <th className="py-3.5 px-4 font-medium text-right">推奨ロット</th>
              <th className="py-3.5 px-4 font-medium text-right">発注ロット数</th>
              <th className="py-3.5 px-4 font-medium text-right">発注総量</th>
              <th className="py-3.5 px-4 font-medium text-right">概算金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {requirements.map((r) => {
              const totalOrderQty = floor2(r.inputLots * r.item.spec_qty);
              const subtotal = Math.floor(totalOrderQty * r.item.unit_price);
              return (
                <tr key={r.item.item_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-[#00D2FF] mr-1.5">{r.item.item_id}</span>
                    <span className="font-medium text-white">{r.item.item_name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-xs">{r.item.supplier_name || '未設定'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                    {r.rawRequiredQty.toFixed(2)} {r.item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                    {r.item.current_stock} / {r.item.safety_stock} {r.item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    {r.item.spec_qty} {r.item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#00D2FF]">
                    {r.recommendedLots}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      min={0}
                      value={r.inputLots}
                      onChange={(e) => handleLotChange(r.item.item_id, Number(e.target.value))}
                      className="w-20 bg-[#121420] border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-white focus:border-[#00D2FF] focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {totalOrderQty} {r.item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">
                    ¥{subtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-[#121420]/70 font-bold">
              <td colSpan={8} className="py-3.5 px-4 text-right text-slate-300">
                発注概算合計金額（税抜）
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-lg text-[#00D2FF]">
                ¥{Math.floor(totalOrderAmount).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-xl w-full max-w-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-widest">発 注 書</h2>
                <p className="text-xs text-slate-600 mt-1">
                  発行日: {new Date().toLocaleDateString('ja-JP')}
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-700 print:hidden"
              >
                印刷 / PDF保存
              </button>
            </div>

            <table className="w-full text-left border-collapse text-xs border border-slate-400 mb-6">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400">
                  <th className="p-2 border-r border-slate-400">発注先</th>
                  <th className="p-2 border-r border-slate-400">品目コード</th>
                  <th className="p-2 border-r border-slate-400">品目名</th>
                  <th className="p-2 border-r border-slate-400 text-right">発注ロット</th>
                  <th className="p-2 border-r border-slate-400 text-right">合計数量</th>
                  <th className="p-2 text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                {requirements
                  .filter((r) => r.inputLots > 0)
                  .map((r) => {
                    const qty = floor2(r.inputLots * r.item.spec_qty);
                    const amt = Math.floor(qty * r.item.unit_price);
                    return (
                      <tr key={r.item.item_id} className="border-b border-slate-300">
                        <td className="p-2 border-r border-slate-400">{r.item.supplier_name || '-'}</td>
                        <td className="p-2 border-r border-slate-400 font-mono">{r.item.item_id}</td>
                        <td className="p-2 border-r border-slate-400">{r.item.item_name}</td>
                        <td className="p-2 border-r border-slate-400 text-right">{r.inputLots}</td>
                        <td className="p-2 border-r border-slate-400 text-right">
                          {qty} {r.item.unit}
                        </td>
                        <td className="p-2 text-right">¥{amt.toLocaleString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className="flex justify-end print:hidden">
              <button
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Calendar as CalendarIcon, BarChart3, Plus, CalendarDays } from 'lucide-react';
import { repository } from '@/lib/db';
import { Product, ProductionPlan } from '@/types';

export default function ProductionPage() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'gantt'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [subFlavor, setSubFlavor] = useState('');
  const [plannedCs, setPlannedCs] = useState<number>(10);
  const [eventTitle, setEventTitle] = useState('');

  const loadData = useCallback(async () => {
    const [pData, prodData] = await Promise.all([
      repository.getProductionPlans(),
      repository.getProducts(),
    ]);
    setPlans(pData);
    setProducts(prodData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const selectedProduct = products.find((p) => p.product_id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planDate) return;

    let qtyPieces = 0;
    let baseKg = 0;

    if (selectedProduct) {
      qtyPieces = plannedCs * selectedProduct.pieces_per_cs;
      baseKg = qtyPieces / selectedProduct.pieces_per_kg;
    }

    await repository.createProductionPlan({
      plan_date: planDate,
      product_id: productId || 'EVENT',
      sub_flavor: subFlavor,
      planned_qty_pieces: qtyPieces,
      planned_base_kg: Math.floor(baseKg * 100) / 100,
      event_title: eventTitle,
    });

    setIsModalOpen(false);
    setEventTitle('');
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#00D2FF]" />
            製造計画管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            アソート分割製造対応カレンダー ＆ ガントチャート進捗表 ＆ 施設行事登録
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1E2132] p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-[#00D2FF] text-[#121420]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> カレンダー
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'gantt' ? 'bg-[#00D2FF] text-[#121420]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> ガントチャート
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 製造計画・行事追加
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.plan_id} className="bg-[#1E2132] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[#00D2FF] font-bold">{p.plan_date}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {p.status}
                </span>
              </div>

              {p.event_title ? (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                  <span className="text-xs text-amber-400 font-semibold">【施設行事】</span>
                  <p className="text-sm font-bold text-white mt-0.5">{p.event_title}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-bold text-white">
                    {p.product_name} ({p.flavor_name})
                  </h3>
                  {p.sub_flavor && (
                    <p className="text-xs text-[#00D2FF] mt-0.5">↳ 製造味分割: {p.sub_flavor}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs bg-[#121420] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">予定数量:</span>
                    <span className="font-mono font-bold text-white">
                      {p.planned_qty_pieces} 個 ({p.planned_base_kg} kg)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#00D2FF] uppercase tracking-wider">
            製造プロセス進捗・ガントチャートビュー
          </h2>
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.plan_id} className="bg-[#121420] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#00D2FF]">{p.plan_date}</span>
                    <span className="text-sm font-bold text-white">
                      {p.event_title ? `[行事] ${p.event_title}` : `${p.product_name} (${p.sub_flavor || p.flavor_name})`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-1/3">
                  <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#00D2FF] h-full w-3/4"></div>
                  </div>
                  <span className="text-xs font-mono text-slate-300">進行中</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1E2132] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">製造計画 / 施設行事 登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">日付 *</label>
                <input
                  type="date"
                  required
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">登録種別</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="">施設行事イベントとして登録</option>
                  {products.filter((p) => p.is_active === 1).map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      [{p.product_id}] {p.product_name} - {p.flavor_name}
                    </option>
                  ))}
                </select>
              </div>

              {productId ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">アソート等の製造味分割（任意）</label>
                    <input
                      type="text"
                      placeholder="例: チョコチップ分を製造"
                      value={subFlavor}
                      onChange={(e) => setSubFlavor(e.target.value)}
                      className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">製造予定ケース数 (c/s) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={plannedCs}
                      onChange={(e) => setPlannedCs(Number(e.target.value))}
                      className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">行事タイトル *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: ワークセンター・やまびこ 慰労会"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#00D2FF] text-[#121420]"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
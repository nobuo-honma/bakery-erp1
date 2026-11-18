'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Truck, CheckCircle, PackagePlus } from 'lucide-react';
import { repository } from '@/lib/db';
import { generateLotNumber } from '@/lib/erp-logic';
import { Order, Product, ProductLot, OrderDetail } from '@/types';

export default function ShipmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<ProductLot[]>([]);

  const [genDate, setGenDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [genProductId, setGenProductId] = useState('');
  const [genCs, setGenCs] = useState<number>(50);
  const [manualSeq, setManualSeq] = useState('01');

  const [selectedDetailId, setSelectedDetailId] = useState<number>(0);
  const [selectedLotNumber, setSelectedLotNumber] = useState('');
  const [shipCs, setShipCs] = useState<number>(10);
  const [shipDate, setShipDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shipTime, setShipTime] = useState('10:00');

  const loadAll = useCallback(async () => {
    const [oData, pData, lData] = await Promise.all([
      repository.getOrders(),
      repository.getProducts(),
      repository.getProductLots(),
    ]);
    setOrders(oData);
    setProducts(pData);
    setLots(lData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handleGenerateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.product_id === genProductId);
    if (!prod) return;

    const lotNumber = generateLotNumber({
      manufactureDate: genDate,
      productId: prod.product_id,
      lotRuleType: prod.lot_rule_type,
      manualSeq,
    });

    await repository.createProductLot({
      lot_number: lotNumber,
      product_id: prod.product_id,
      manufacture_date: genDate,
      manufactured_cs: genCs,
    });

    await loadAll();
    alert(`ロット番号 [${lotNumber}] を自動採番・登録しました。`);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailId || !selectedLotNumber) return;

    await repository.createShipment({
      detail_id: selectedDetailId,
      lot_number: selectedLotNumber,
      shipped_cs: shipCs,
      actual_ship_date: shipDate,
      actual_ship_time: shipTime,
    });

    await loadAll();
    alert('出荷実績を登録し、製品在庫数を減算しました。');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#00D2FF]" />
          出荷管理 ＆ ロット自動採番
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          製造日・製品種別に応じた例外対応ロジック付きロット自動採番と出荷実績の記録
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#00D2FF]" />
            製品ロット自動採番・製造登録
          </h2>
          <form onSubmit={handleGenerateLot} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">製造日 *</label>
              <input
                type="date"
                required
                value={genDate}
                onChange={(e) => setGenDate(e.target.value)}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">製品選択 *</label>
              <select
                required
                value={genProductId}
                onChange={(e) => setGenProductId(e.target.value)}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value="">製品を選択してください</option>
                {products.filter((p) => p.is_active === 1).map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    [{p.product_id}] {p.product_name} - {p.flavor_name}
                  </option>
                ))}
              </select>
            </div>
            {genProductId && products.find((p) => p.product_id === genProductId)?.lot_rule_type === 'ASSORT_MANUAL' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">アソート手動連番 (例: 01) *</label>
                <input
                  type="text"
                  required
                  value={manualSeq}
                  onChange={(e) => setManualSeq(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">製造ケース数 (c/s) *</label>
              <input
                type="number"
                min={1}
                required
                value={genCs}
                onChange={(e) => setGenCs(Number(e.target.value))}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90"
            >
              ロット番号を自動採番して登録
            </button>
          </form>
        </div>

        <div className="bg-[#1E2132] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            受注別・ロット別 出荷実績入力
          </h2>
          <form onSubmit={handleCreateShipment} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">対象受注明細 *</label>
              <select
                required
                value={selectedDetailId}
                onChange={(e) => setSelectedDetailId(Number(e.target.value))}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value={0}>受注明細を選択してください</option>
                {orders.flatMap((o) =>
                  o.details.map((d: OrderDetail) => (
                    <option key={d.detail_id} value={d.detail_id}>
                      発注No:{o.order_no} / [{d.product_id}] {d.product_name} ({d.order_cs} c/s)
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">出荷ロット番号 *</label>
              <select
                required
                value={selectedLotNumber}
                onChange={(e) => setSelectedLotNumber(e.target.value)}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              >
                <option value="">ロット番号を選択してください</option>
                {lots.map((l) => (
                  <option key={l.lot_number} value={l.lot_number}>
                    {l.lot_number} ({l.product_name} - 残庫:{l.current_stock_cs}c/s)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">実出荷ケース数 *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={shipCs}
                  onChange={(e) => setShipCs(Number(e.target.value))}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">出荷時間 *</label>
                <input
                  type="time"
                  required
                  value={shipTime}
                  onChange={(e) => setShipTime(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">実出荷日 *</label>
              <input
                type="date"
                required
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
                className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-[#121420] font-semibold text-sm hover:bg-emerald-400"
            >
              出荷実績を確定する
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
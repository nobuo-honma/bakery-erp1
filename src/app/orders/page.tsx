'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutGrid,
  List,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Hash,
  ShoppingCart,
  X,
} from 'lucide-react';
import { repository } from '@/lib/db';
import { Order, Product, Customer, OrderDetail } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [orderNo, setOrderNo] = useState('');
  const [customerId, setCustomerId] = useState<number>(0);
  const [orderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledShipDate, setScheduledShipDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState<Array<{ product_id: string; order_cs: number }>>([
    { product_id: '', order_cs: 1 },
  ]);

  const loadAll = useCallback(async () => {
    const [oData, pData, cData] = await Promise.all([
      repository.getOrders(),
      repository.getProducts(),
      repository.getCustomers(),
    ]);
    setOrders(oData);
    setProducts(pData.filter((p: Product) => p.is_active === 1));
    setCustomers(cData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handleAddDetailRow = () => {
    setDetails([...details, { product_id: '', order_cs: 1 }]);
  };

  const handleRemoveDetailRow = (index: number) => {
    if (details.length <= 1) return;
    setDetails(details.filter((_, i: number) => i !== index));
  };

  const handleDetailChange = (index: number, field: 'product_id' | 'order_cs', value: string | number) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDetails = details.filter((d) => d.product_id && d.order_cs > 0);
    if (!customerId || !orderNo || validDetails.length === 0) return;

    await repository.createOrder({
      order_no: orderNo,
      customer_id: customerId,
      order_date: orderDate,
      scheduled_ship_date: scheduledShipDate,
      delivery_date: deliveryDate,
      notes,
      details: validDetails,
    });

    setOrderNo('');
    setNotes('');
    setDetails([{ product_id: '', order_cs: 1 }]);
    setIsModalOpen(false);
    await loadAll();
  };

  const statusBadge = (status: Order['status']) => {
    const styles: Record<Order['status'], { label: string; cls: string }> = {
      UNPLANNED: { label: '未計画', cls: 'bg-[#FF2D55]/20 text-[#FF2D55] border-[#FF2D55]/30' },
      PLANNED: { label: '計画済', cls: 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/30' },
      IN_PROGRESS: { label: '製造中', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      SHIPPED: { label: '出荷完了', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    };
    const s = styles[status] || styles.UNPLANNED;
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#00D2FF]" />
            受注管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            受注データの登録・カード／一覧表示の切り替え
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1E2132] p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'card' ? 'bg-[#00D2FF] text-[#121420]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> カード
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-[#00D2FF] text-[#121420]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" /> 一覧
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新規受注登録
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.order_id}
              className="bg-[#1E2132] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-[#00D2FF]" />
                    発注No: {order.order_no}
                  </span>
                  {statusBadge(order.status)}
                </div>

                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{order.customer_name || '出荷先未設定'}</span>
                </h3>

                <div className="bg-[#121420] rounded-xl p-3 space-y-2 border border-slate-800/80 mb-4">
                  {order.details.map((d: OrderDetail) => (
                    <div key={d.detail_id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">
                        <span className="font-mono text-[#00D2FF] mr-1.5">[{d.product_id}]</span>
                        {d.product_name}（{d.flavor_name}）
                      </span>
                      <span className="font-mono font-bold text-white">{d.order_cs} c/s</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00D2FF]" />
                  出荷予定: <strong className="text-slate-200">{order.scheduled_ship_date}</strong>
                </span>
                <span>納期: {order.delivery_date}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1E2132] border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
                <th className="py-3.5 px-4 font-medium">ステータス</th>
                <th className="py-3.5 px-4 font-medium">発注No.</th>
                <th className="py-3.5 px-4 font-medium">出荷先</th>
                <th className="py-3.5 px-4 font-medium">注文製品・数量(c/s)</th>
                <th className="py-3.5 px-4 font-medium">出荷予定日</th>
                <th className="py-3.5 px-4 font-medium">納期日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">{statusBadge(order.status)}</td>
                  <td className="py-3 px-4 font-mono text-slate-200">{order.order_no}</td>
                  <td className="py-3 px-4 font-medium text-white">{order.customer_name}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {order.details.map((d: OrderDetail) => (
                        <div key={d.detail_id} className="text-xs text-slate-300">
                          <span className="font-mono text-[#00D2FF] mr-1">[{d.product_id}]</span>
                          {d.product_name} {d.flavor_name} :{' '}
                          <span className="font-mono font-bold text-white">{d.order_cs} c/s</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200">{order.scheduled_ship_date}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{order.delivery_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1E2132] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">新規受注登録</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">出荷先 *</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(Number(e.target.value))}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value={0}>出荷先を選択してください</option>
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">発注No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: PO-20261118-01"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">出荷予定日 *</label>
                  <input
                    type="date"
                    required
                    value={scheduledShipDate}
                    onChange={(e) => setScheduledShipDate(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">納期日 *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#00D2FF]">
                    注文製品・製造種類（複数追加可能）
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDetailRow}
                    className="text-xs flex items-center gap-1 text-[#00D2FF] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> 行を追加
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {details.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        required
                        value={row.product_id}
                        onChange={(e) => handleDetailChange(idx, 'product_id', e.target.value)}
                        className="flex-1 bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="">製品・種類を選択...</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            [{p.product_id}] {p.product_name} - {p.flavor_name} ({p.pieces_per_cs}
                            {p.is_assort ? 'p' : '個'}/cs)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        required
                        value={row.order_cs}
                        onChange={(e) => handleDetailChange(idx, 'order_cs', Number(e.target.value))}
                        className="w-24 bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-right text-white font-mono"
                      />
                      <span className="text-xs text-slate-400">c/s</span>

                      <button
                        type="button"
                        onClick={() => handleRemoveDetailRow(idx)}
                        disabled={details.length <= 1}
                        className="p-2 text-slate-500 hover:text-[#FF2D55] disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#00D2FF] text-[#121420] hover:bg-[#00D2FF]/90"
                >
                  受注を登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
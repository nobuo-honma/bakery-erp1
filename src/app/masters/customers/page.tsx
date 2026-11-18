'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Upload, Plus, Building2, X } from 'lucide-react';
import { repository } from '@/lib/db';
import { Customer } from '@/types';
import CsvImportModal from '@/components/common/CsvImportModal';

export default function CustomersMasterPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const loadCustomers = useCallback(async () => {
    const data = await repository.getCustomers();
    setCustomers(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
  }, [loadCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;
    await repository.createCustomer({
      customer_name: customerName,
      postal_code: postalCode,
      address,
      contact_info: contactInfo,
      contact_person: contactPerson,
    });
    setCustomerName('');
    setPostalCode('');
    setAddress('');
    setContactInfo('');
    setContactPerson('');
    setIsAddOpen(false);
    await loadCustomers();
  };

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    await repository.importCustomers(rows);
    await loadCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#00D2FF]" />
            出荷先マスタ管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            納品先・自治体・取引企業の住所および担当者情報の管理
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCsvOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2132] border border-slate-700 text-slate-200 font-semibold text-sm hover:border-[#00D2FF] transition-colors"
          >
            <Upload className="w-4 h-4 text-[#00D2FF]" />
            CSVインポート
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D2FF] text-[#121420] font-semibold text-sm hover:bg-[#00D2FF]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規出荷先登録
          </button>
        </div>
      </div>

      <div className="bg-[#1E2132] border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-[#121420]/50">
              <th className="py-3.5 px-4 font-medium">ID</th>
              <th className="py-3.5 px-4 font-medium">出荷先名</th>
              <th className="py-3.5 px-4 font-medium">郵便番号</th>
              <th className="py-3.5 px-4 font-medium">住所</th>
              <th className="py-3.5 px-4 font-medium">連絡先</th>
              <th className="py-3.5 px-4 font-medium">担当者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {customers.map((c) => (
              <tr key={c.customer_id} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono text-slate-400">{c.customer_id}</td>
                <td className="py-3 px-4 font-bold text-white">{c.customer_name}</td>
                <td className="py-3 px-4 font-mono text-slate-300">{c.postal_code || '-'}</td>
                <td className="py-3 px-4 text-slate-300">{c.address || '-'}</td>
                <td className="py-3 px-4 font-mono text-slate-300">{c.contact_info || '-'}</td>
                <td className="py-3 px-4 text-slate-300">{c.contact_person || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1E2132] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">新規出荷先登録</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">出荷先名 *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">郵便番号</label>
                  <input
                    type="text"
                    placeholder="047-0000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">連絡先</label>
                  <input
                    type="text"
                    placeholder="0134-00-0000"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">住所</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">担当者</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-[#121420] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
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

      <CsvImportModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        title="出荷先マスタ CSVインポート"
        expectedHeaders={['customer_name', 'postal_code', 'address', 'contact_info', 'contact_person']}
        sampleRow="小樽市防災危機管理課,047-8660,北海道小樽市花園2丁目12-1,0134-32-4111,防災担当"
        onImport={handleCsvImport}
      />
    </div>
  );
}
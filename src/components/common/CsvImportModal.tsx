'use client';

import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseCSV } from '@/lib/csv-parser';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedHeaders: string[];
  sampleRow: string;
  onImport: (rows: Record<string, string>[]) => Promise<void>;
}

export default function CsvImportModal({
  isOpen,
  onClose,
  title,
  expectedHeaders,
  sampleRow,
  onImport,
}: CsvImportModalProps) {
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          setError('ヘッダー行とデータ行を含むCSVを選択してください。');
          return;
        }

        const headers = parsed[0];
        const missing = expectedHeaders.filter((h: string) => !headers.includes(h));
        if (missing.length > 0) {
          setError(`必須列が不足しています: ${missing.join(', ')}`);
          return;
        }

        const records = parsed.slice(1).map((row: string[]) => {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = row[idx] ?? '';
          });
          return obj;
        });

        setPreviewRows(records);
      } catch {
        setError('CSVの解析に失敗しました。文字コード（UTF-8）を確認してください。');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirm = async () => {
    if (previewRows.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onImport(previewRows);
      setPreviewRows([]);
      onClose();
    } catch (err: unknown) {
      const errObj = err as Error;
      setError(errObj?.message || 'インポート処理中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1E2132] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#00D2FF]" />
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="bg-[#121420] p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-[#00D2FF]">CSVフォーマット仕様（UTF-8 / 1行目ヘッダー）</p>
            <p className="font-mono text-slate-400 break-all">{expectedHeaders.join(',')}</p>
            <p className="font-mono text-slate-500 break-all">例: {sampleRow}</p>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-[#00D2FF] rounded-xl p-6 cursor-pointer transition-colors bg-[#121420]/50">
            <FileText className="w-8 h-8 text-[#00D2FF] mb-2" />
            <span className="text-sm text-slate-300">CSVファイルを選択してください</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {error && (
            <div className="flex items-center gap-2 text-sm text-[#FF2D55] bg-[#FF2D55]/10 border border-[#FF2D55]/30 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-sm text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{previewRows.length} 件のデータが読み込み可能です</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={previewRows.length === 0 || isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#00D2FF] text-[#121420] hover:bg-[#00D2FF]/90 disabled:opacity-40"
          >
            {isSubmitting ? '登録中...' : 'インポート実行'}
          </button>
        </div>
      </div>
    </div>
  );
}
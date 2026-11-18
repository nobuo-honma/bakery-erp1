/**
 * 小数点第3位以下を切り捨てて小数点第2位まで返す
 */
export function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * 1c/sあたりのパック数（p）を計算
 */
export function calcPacksPerCase(piecesPerCs: number, piecesPerPack: number): number {
  if (piecesPerPack === 3) {
    return piecesPerCs; // アソートの場合はパック数自体がcs入数として機能
  }
  return Math.floor(piecesPerCs / piecesPerPack);
}

/**
 * 製造日からロット番号を自動採番する
 */
const DAY_KANA_MAP: Record<number, string> = {
  1: 'ア', 2: 'イ', 3: 'ウ', 4: 'エ', 5: 'オ',
  6: 'カ', 7: 'キ', 8: 'ク', 9: 'ケ', 10: 'コ',
  11: 'サ', 12: 'シ', 13: 'ス', 14: 'セ', 15: 'ソ',
  16: 'ナ', 17: 'ニ', 18: 'ヌ', 19: 'ネ', 20: 'ノ',
  21: 'ハ', 22: 'ヒ', 23: 'フ', 24: 'ヘ', 25: 'ホ',
  26: 'マ', 27: 'ミ', 28: 'ム', 29: 'メ', 30: 'モ',
  31: 'ヤ'
};

const MONTH_ALPHA_MAP: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F',
  7: 'G', 8: 'H', 9: 'I', 10: 'J', 11: 'K', 12: 'L'
};

export function generateLotNumber(params: {
  manufactureDate: string;
  productId: string;
  lotRuleType: 'NORMAL' | 'NO_DAY_00' | 'ASSORT_MANUAL';
  manualSeq?: string;
}): string {
  const [yearStr, monthStr, dayStr] = params.manufactureDate.split('-');
  const yy = yearStr.slice(-2);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (params.lotRuleType === 'ASSORT_MANUAL') {
    const seq = (params.manualSeq || '01').padStart(2, '0');
    return `${yy}${params.productId}${seq}`;
  }

  const monthAlpha = MONTH_ALPHA_MAP[month] || '';

  if (params.lotRuleType === 'NO_DAY_00') {
    return `00${monthAlpha}${yy}${params.productId}`;
  }

  const dayKana = DAY_KANA_MAP[day] || '';
  return `${dayKana}${monthAlpha}${yy}${params.productId}`;
}
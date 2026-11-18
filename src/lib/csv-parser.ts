/**
 * 簡易CSVパーサー（各マスタのインポート用）
 */
export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r\n|\n/);
  return lines
    .filter((line: string) => line.trim() !== '')
    .map((line: string) => {
      const row: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      row.push(currentValue.trim());
      return row;
    });
}
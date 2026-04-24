import * as XLSX from 'xlsx';

/**
 * Export data as CSV and trigger download
 */
export function exportCSV(data, filename = 'export') {
 if (!data || data.length === 0) return;
 const headers = Object.keys(data[0]);
 const csvRows = [
 headers.join(','),
 ...data.map(row =>
 headers.map(h => {
 let val = row[h] ?? '';
 if (typeof val === 'object') val = JSON.stringify(val);
 val = String(val).replace(/"/g, '""');
 return `"${val}"`;
 }).join(',')
 ),
 ];
 const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
 downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data as Excel (.xlsx) and trigger download
 */
export function exportExcel(data, filename = 'export', sheetName = 'Sheet1') {
 if (!data || data.length === 0) return;
 const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, sheetName);
 XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Open print dialog for PDF-like export
 */
export function exportPDF(title = 'Report') {
 const printWindow = window.open('', '_blank');
 if (!printWindow) return;

 const tableEl = document.querySelector('[data-export-table]');
 if (!tableEl) {
 printWindow.close();
 return;
 }

 printWindow.document.write(`
 <!DOCTYPE html>
 <html><head><title>${title}</title>
 <style>
 body { font-family: 'Inter', -apple-system, sans-serif; padding: 24px; color: #111; }
 h1 { font-size: 20px; margin-bottom: 16px; }
 table { width: 100%; border-collapse: collapse; font-size: 13px; }
 th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
 th { background: #f5f5f5; font-weight: 600; }
 tr:nth-child(even) { background: #fafafa; }
 .print-date { font-size: 12px; color: #666; margin-bottom: 12px; }
 @media print { body { padding: 0; } }
 </style></head><body>
 <h1>${title}</h1>
 <p class="print-date">Generated: ${new Date().toLocaleString('en-IN')}</p>
 ${tableEl.outerHTML}
 </body></html>
 `);
 printWindow.document.close();
 printWindow.onload = () => { printWindow.print(); };
}

/**
 * Flatten a data object for export (handles Firestore timestamps, nested objects)
 */
export function flattenForExport(data, columns) {
 if (!data || data.length === 0) return [];
 return data.map(row => {
 const flat = {};
 (columns || Object.keys(row)).forEach(col => {
 let val = row[col.key || col];
 // Handle Firestore timestamps
 if (val && typeof val === 'object' && typeof val.toDate === 'function') {
 val = val.toDate().toLocaleDateString('en-IN');
 } else if (val && typeof val === 'object') {
 val = JSON.stringify(val);
 }
 flat[col.label || col.key || col] = val ?? '';
 });
 return flat;
 });
}

function downloadBlob(blob, filename) {
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
}

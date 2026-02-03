import { ProductionRecord } from '../types';
import { COMMON_COMMENTS } from '../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const STORAGE_KEY = 'pigmea_production_data_v1';
const CUSTOM_COMMENTS_KEY = 'pigmea_custom_comments_v1';
const SYNC_CHANNEL = new BroadcastChannel('pigmea_realtime_sync');
const LOCAL_EVENT_NAME = 'pigmea_local_update';

// --- DATA MANAGEMENT ---

const getRecordsInternal = (): ProductionRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getRecords = (): ProductionRecord[] => {
  return getRecordsInternal();
};

export const getAvailableComments = (): string[] => {
  const customData = localStorage.getItem(CUSTOM_COMMENTS_KEY);
  const customComments = customData ? JSON.parse(customData) : [];
  // Merge defaults with custom, remove duplicates, sort alphabetically
  return Array.from(new Set([...COMMON_COMMENTS, ...customComments])).sort();
};

const notifyUpdates = () => {
  // Notify other tabs
  SYNC_CHANNEL.postMessage({ type: 'UPDATE' });
  // Notify current tab components immediately
  window.dispatchEvent(new Event(LOCAL_EVENT_NAME));
};

export const saveRecord = (record: ProductionRecord): ProductionRecord[] => {
  const current = getRecordsInternal();
  const updated = [record, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  // Logic to save new custom comment if it's not in the default list
  if (record.changesComment && !COMMON_COMMENTS.includes(record.changesComment)) {
    const customData = localStorage.getItem(CUSTOM_COMMENTS_KEY);
    const customComments: string[] = customData ? JSON.parse(customData) : [];
    
    if (!customComments.includes(record.changesComment)) {
      customComments.push(record.changesComment);
      localStorage.setItem(CUSTOM_COMMENTS_KEY, JSON.stringify(customComments));
    }
  }

  notifyUpdates();
  return updated;
};

export const deleteRecord = (id: string): void => {
  const current = getRecordsInternal();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyUpdates();
};

export const deleteCustomComment = (commentToDelete: string): string[] => {
  const customData = localStorage.getItem(CUSTOM_COMMENTS_KEY);
  if (!customData) return getAvailableComments();

  let customComments: string[] = JSON.parse(customData);
  customComments = customComments.filter(c => c !== commentToDelete);
  
  localStorage.setItem(CUSTOM_COMMENTS_KEY, JSON.stringify(customComments));
  return getAvailableComments();
};

export const clearAllRecords = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  // We do NOT clear CUSTOM_COMMENTS_KEY so autocomplete keeps getting smarter
  notifyUpdates();
};

// Real-time Subscription Mechanism
export const subscribeToRecords = (callback: (records: ProductionRecord[]) => void) => {
  // Initial load
  callback(getRecordsInternal());

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'UPDATE') {
      callback(getRecordsInternal());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback(getRecordsInternal());
    }
  };

  const handleLocalUpdate = () => {
    callback(getRecordsInternal());
  };

  SYNC_CHANNEL.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);
  window.addEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);

  return () => {
    SYNC_CHANNEL.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);
  };
};

// --- EXPORT FUNCTIONS ---

export const exportToExcel = (records: ProductionRecord[]) => {
  // Format data for Excel
  const data = records.map(r => ({
    'Fecha': r.date,
    'Turno': r.shift,
    'Jefe de Turno': r.boss,
    'Máquina': r.machine,
    'Metros': r.meters,
    'Cambios': r.changesCount,
    'Comentarios/Incidencias': r.changesComment
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Producción");
  
  // Auto-width columns (approximate)
  const wscols = [
    {wch: 12}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 30}
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `Reporte_Produccion_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToPDF = (records: ProductionRecord[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Reporte de Producción - Registro Jefe de Turnos", 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);

  // Table Data
  const tableColumn = ["Fecha", "Turno", "Jefe", "Máquina", "Metros", "Cambios", "Comentarios"];
  const tableRows = records.map(r => [
    r.date,
    r.shift,
    r.boss,
    r.machine,
    r.meters.toLocaleString(),
    r.changesCount,
    r.changesComment
  ]);

  // Generate Table
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Blue header
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`Reporte_Produccion_${new Date().toISOString().slice(0, 10)}.pdf`);
};
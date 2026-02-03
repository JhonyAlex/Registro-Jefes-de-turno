import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, remove, set } from 'firebase/database';
import { ProductionRecord } from '../types';
import { COMMON_COMMENTS } from '../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- FIREBASE SETUP ---

const firebaseConfig = {
  apiKey: "AIzaSyD_qVRzPGYgf6fdxsNMnwwqTWk8Hphtiuk",
  authDomain: "registro-jefe-de-turno-2026.firebaseapp.com",
  projectId: "registro-jefe-de-turno-2026",
  storageBucket: "registro-jefe-de-turno-2026.firebasestorage.app",
  messagingSenderId: "135445352312",
  appId: "1:135445352312:web:0dc221e5e8bd748280428d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const RECORDS_REF = 'productionRecords';
const CUSTOM_COMMENTS_REF = 'customComments';

// --- DATA MANAGEMENT ---

export const getAvailableComments = async (): Promise<string[]> => {
  const commentsRef = ref(db, CUSTOM_COMMENTS_REF);
  return new Promise((resolve) => {
    onValue(commentsRef, (snapshot) => {
      const customComments: string[] = snapshot.exists() ? snapshot.val() : [];
      // Merge defaults with custom, remove duplicates, sort alphabetically
      const allComments = Array.from(new Set([...COMMON_COMMENTS, ...customComments])).sort();
      resolve(allComments);
    }, { onlyOnce: true });
  });
};

export const saveRecord = async (record: Omit<ProductionRecord, 'id'>): Promise<void> => {
    const recordsRef = ref(db, RECORDS_REF);
    const newRecordRef = push(recordsRef);
    await set(newRecordRef, record);

  // Logic to save new custom comment if it's not in the default list
  if (record.changesComment && !COMMON_COMMENTS.includes(record.changesComment)) {
    const commentsRef = ref(db, CUSTOM_COMMENTS_REF);
    onValue(commentsRef, async (snapshot) => {
        const currentComments: string[] = snapshot.exists() ? snapshot.val() : [];
        if (!currentComments.includes(record.changesComment)) {
            await set(ref(db, `${CUSTOM_COMMENTS_REF}/${currentComments.length}`), record.changesComment);
        }
    }, { onlyOnce: true });
  }
};

export const deleteRecord = (id: string): Promise<void> => {
  const recordRef = ref(db, `${RECORDS_REF}/${id}`);
  return remove(recordRef);
};

export const deleteCustomComment = async (commentToDelete: string): Promise<void> => {
    const commentsRef = ref(db, CUSTOM_COMMENTS_REF);
    onValue(commentsRef, (snapshot) => {
        if (snapshot.exists()) {
            const currentComments: string[] = snapshot.val();
            const updatedComments = currentComments.filter(c => c !== commentToDelete);
            set(commentsRef, updatedComments);
        }
    }, { onlyOnce: true });
};


export const clearAllRecords = (): Promise<void> => {
  const recordsRef = ref(db, RECORDS_REF);
  return remove(recordsRef);
};

// Real-time Subscription Mechanism
export const subscribeToRecords = (callback: (records: ProductionRecord[]) => void) => {
  const recordsRef = ref(db, RECORDS_REF);

  const listener = onValue(recordsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Firebase returns an object, so we convert it to an array
      const recordsArray: ProductionRecord[] = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).reverse(); // Reverse to show latest records first
      callback(recordsArray);
    } else {
      callback([]); // No records found
    }
  });

  // Return the unsubscribe function
  return () => listener();
};


// --- EXPORT FUNCTIONS (No changes needed here) ---

export const exportToExcel = (records: ProductionRecord[]) => {
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

  const wscols = [
    {wch: 12}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 30}
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `Reporte_Produccion_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToPDF = (records: ProductionRecord[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Reporte de Producción - Registro Jefe de Turnos", 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);

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

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`Reporte_Produccion_${new Date().toISOString().slice(0, 10)}.pdf`);
};

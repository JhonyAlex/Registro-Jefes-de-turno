import { ProductionRecord } from '../types';
import { COMMON_COMMENTS, COMMON_OPERATORS } from '../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  where,
  writeBatch
} from 'firebase/firestore';

const RECORDS_COLLECTION = 'production_records';
const SETTINGS_COLLECTION = 'app_settings';
const COMMENTS_DOC_ID = 'custom_comments';
const OPERATORS_DOC_ID = 'custom_operators';

// Local cache to serve synchronous get requests if needed immediately
let localRecordsCache: ProductionRecord[] = [];
let localCommentsCache: string[] = [];
let localOperatorsCache: string[] = [];

// Subscribers for settings updates
type SettingsCallback = (comments: string[], operators: string[]) => void;
const settingsSubscribers: SettingsCallback[] = [];

const notifySettingsSubscribers = () => {
  const comments = localCommentsCache.length > 0 ? localCommentsCache : COMMON_COMMENTS;
  const operators = localOperatorsCache.length > 0 ? localOperatorsCache : COMMON_OPERATORS;
  settingsSubscribers.forEach(cb => cb(comments, operators));
};

// --- REAL-TIME LISTENERS INITIALIZATION ---

const initCommentsListener = () => {
  const docRef = doc(db, SETTINGS_COLLECTION, COMMENTS_DOC_ID);
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      localCommentsCache = (data.list || []).sort();
    } else {
      setDoc(docRef, { list: COMMON_COMMENTS }).catch(err => console.log("Init comments unavailable"));
      localCommentsCache = COMMON_COMMENTS;
    }
    notifySettingsSubscribers();
  }, (err) => console.warn("Comments listener warning:", err.code));
};

const initOperatorsListener = () => {
  const docRef = doc(db, SETTINGS_COLLECTION, OPERATORS_DOC_ID);
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      localOperatorsCache = (data.list || []).sort();
    } else {
      if (COMMON_OPERATORS.length > 0) {
        setDoc(docRef, { list: COMMON_OPERATORS }).catch(err => console.log("Init operators unavailable"));
        localOperatorsCache = COMMON_OPERATORS;
      } else {
        setDoc(docRef, { list: [] }).catch(err => console.log("Init operators empty doc creation failed"));
        localOperatorsCache = [];
      }
    }
    notifySettingsSubscribers();
  }, (err) => console.warn("Operators listener warning:", err.code));
};

// Start listening immediately
initCommentsListener();
initOperatorsListener();

// --- PUBLIC API ---

// Allow components to subscribe to settings changes (comments/operators)
export const subscribeToSettings = (callback: SettingsCallback) => {
  settingsSubscribers.push(callback);
  // Send immediate current state
  const comments = localCommentsCache.length > 0 ? localCommentsCache : COMMON_COMMENTS;
  const operators = localOperatorsCache.length > 0 ? localOperatorsCache : COMMON_OPERATORS;
  callback(comments, operators);

  // Return unsubscribe function
  return () => {
    const index = settingsSubscribers.indexOf(callback);
    if (index > -1) {
      settingsSubscribers.splice(index, 1);
    }
  };
};

export const getAvailableComments = (): string[] => {
  return localCommentsCache.length > 0 ? localCommentsCache : COMMON_COMMENTS;
};

export const getAvailableOperators = (): string[] => {
  return localOperatorsCache.length > 0 ? localOperatorsCache : COMMON_OPERATORS;
};

export const saveRecord = async (record: ProductionRecord): Promise<void> => {
  try {
    // 1. Save the record to Firestore
    await setDoc(doc(db, RECORDS_COLLECTION, record.id), record);

    // 2. Handle Custom Comments
    if (record.changesComment) {
      const docRef = doc(db, SETTINGS_COLLECTION, COMMENTS_DOC_ID);
      await updateDoc(docRef, { list: arrayUnion(record.changesComment) })
        .catch(async (err) => {
          if (err.code === 'not-found') await setDoc(docRef, { list: [record.changesComment] });
        });
    }

    // 3. Handle Custom Operators & Cleanup Test Data
    if (record.operator) {
      const docRef = doc(db, SETTINGS_COLLECTION, OPERATORS_DOC_ID);
      
      const testOperatorsToRemove = ["Operario 1", "Operario 2"];
      const isTestOp = testOperatorsToRemove.includes(record.operator);
      
      if (!isTestOp) {
         await updateDoc(docRef, { list: arrayUnion(record.operator) })
          .catch(async (err) => {
            if (err.code === 'not-found') await setDoc(docRef, { list: [record.operator] });
          });
          
         // Clean up test data if present in our local cache
         const hasTestOps = localOperatorsCache.some(op => testOperatorsToRemove.includes(op));
         if (hasTestOps) {
            await updateDoc(docRef, { list: arrayRemove(...testOperatorsToRemove) });
         }
      } else {
        await updateDoc(docRef, { list: arrayUnion(record.operator) });
      }
    }

  } catch (e: any) {
    console.error("Error saving record:", e);
    if (e.code === 'permission-denied') {
      alert("Error de Permisos: Configure las Reglas de Firestore.");
    }
    throw e;
  }
};

export const deleteRecord = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, RECORDS_COLLECTION, id));
  } catch (e) {
    console.error("Error deleting record:", e);
    alert("Error al borrar. Verifique su conexión.");
  }
};

// --- COMMENT MANAGEMENT ---
export const deleteCustomComment = async (commentToDelete: string): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, COMMENTS_DOC_ID);
    await updateDoc(docRef, { list: arrayRemove(commentToDelete) });
  } catch (e) {
    console.error("Error deleting comment:", e);
  }
};

export const renameCustomComment = async (oldName: string, newName: string): Promise<void> => {
  if (!oldName || !newName || oldName === newName) return;
  try {
    const batch = writeBatch(db);
    const settingsRef = doc(db, SETTINGS_COLLECTION, COMMENTS_DOC_ID);
    
    await updateDoc(settingsRef, { list: arrayRemove(oldName) });
    await updateDoc(settingsRef, { list: arrayUnion(newName) });

    const q = query(collection(db, RECORDS_COLLECTION), where('changesComment', '==', oldName));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => batch.update(doc.ref, { changesComment: newName }));
    await batch.commit();
  } catch (e) {
    console.error("Error renaming comment globally:", e);
    throw new Error("No se pudo renombrar el comentario.");
  }
};

// --- OPERATOR MANAGEMENT ---
export const deleteCustomOperator = async (operatorToDelete: string): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, OPERATORS_DOC_ID);
    await updateDoc(docRef, { list: arrayRemove(operatorToDelete) });
  } catch (e) {
    console.error("Error deleting operator:", e);
  }
};

export const renameCustomOperator = async (oldName: string, newName: string): Promise<void> => {
  if (!oldName || !newName || oldName === newName) return;
  try {
    const batch = writeBatch(db);
    const settingsRef = doc(db, SETTINGS_COLLECTION, OPERATORS_DOC_ID);
    
    await updateDoc(settingsRef, { list: arrayRemove(oldName) });
    await updateDoc(settingsRef, { list: arrayUnion(newName) });

    const q = query(collection(db, RECORDS_COLLECTION), where('operator', '==', oldName));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => batch.update(doc.ref, { operator: newName }));
    await batch.commit();
  } catch (e) {
    console.error("Error renaming operator globally:", e);
    throw new Error("No se pudo renombrar el operario.");
  }
};

export const clearAllRecords = async (): Promise<void> => {
  const q = query(collection(db, RECORDS_COLLECTION));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
};

export const subscribeToRecords = (
  callback: (records: ProductionRecord[]) => void,
  onError?: (errorMsg: string) => void
) => {
  const q = query(collection(db, RECORDS_COLLECTION), orderBy('timestamp', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const records: ProductionRecord[] = [];
    snapshot.forEach((doc) => {
      records.push(doc.data() as ProductionRecord);
    });
    localRecordsCache = records;
    callback(records);
    if (onError) onError('');
  }, (error) => {
    console.error("Firestore Error:", error);
    let msg = "Error de conexión con la base de datos.";
    if (error.code === 'permission-denied') msg = "ACCESO DENEGADO.";
    else if (error.code === 'unavailable') msg = "Servicio no disponible (Offline).";
    if (onError) onError(msg);
  });
  return unsubscribe;
};

// --- EXPORT FUNCTIONS ---

export const exportToExcel = (records: ProductionRecord[]) => {
  const data = records.map(r => ({
    'Fecha': r.date,
    'Turno': r.shift,
    'Jefe de Turno': r.boss,
    'Máquina': r.machine,
    'Operario': r.operator || '',
    'Metros': r.meters,
    'Cambios': r.changesCount,
    'Comentarios/Incidencias': r.changesComment
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Producción");
  
  const wscols = [
    {wch: 12}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 12}, {wch: 10}, {wch: 30}
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

  const tableColumn = ["Fecha", "Turno", "Jefe", "Máquina", "Operario", "Mts", "Cambios", "Incidencias"];
  const tableRows = records.map(r => [
    r.date,
    r.shift,
    r.boss,
    r.machine,
    r.operator || '-',
    r.meters.toLocaleString(),
    r.changesCount,
    r.changesComment
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }, 
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`Reporte_Produccion_${new Date().toISOString().slice(0, 10)}.pdf`);
};
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PlusCircle, List, User, Trash2, Lock, AlertCircle, Filter, X } from 'lucide-react';
import ShiftForm from './components/ShiftForm';
import Dashboard from './components/Dashboard';
import { subscribeToRecords, clearAllRecords, deleteRecord } from './services/storageService';
import { ProductionRecord, FilterState } from './types';
import { MACHINES, BOSSES } from './constants';

type View = 'dashboard' | 'entry' | 'list';
type DeleteMode = 'all' | 'single';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('entry');
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  
  // Filtering State
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    machine: '',
    boss: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('all');
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = subscribeToRecords((updatedRecords) => {
      setRecords(updatedRecords);
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchDate = (!filters.startDate || r.date >= filters.startDate) && 
                        (!filters.endDate || r.date <= filters.endDate);
      const matchMachine = !filters.machine || r.machine === filters.machine;
      const matchBoss = !filters.boss || r.boss === filters.boss;
      return matchDate && matchMachine && matchBoss;
    });
  }, [records, filters]);

  const handleRecordSaved = () => {
    // No manual reload needed, subscription handles it
  };

  const initiateDeleteAll = () => {
    setDeleteMode('all');
    setRecordToDelete(null);
    setShowDeleteModal(true);
  };

  const initiateDeleteSingle = (id: string) => {
    setDeleteMode('single');
    setRecordToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    // Universal Password Check for ANY deletion
    if (passwordInput === 'Pigmea.2026') {
      if (deleteMode === 'all') {
        clearAllRecords();
      } else if (deleteMode === 'single' && recordToDelete) {
        deleteRecord(recordToDelete);
      }
      closeDeleteModal();
    } else {
      setDeleteError('Clave incorrecta. Autorización denegada.');
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPasswordInput('');
    setDeleteError('');
    setRecordToDelete(null);
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', machine: '', boss: '' });
  };

  const NavItem = ({ view, icon: Icon, label, mobileOnly = false }: { view: View; icon: any; label: string, mobileOnly?: boolean }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full md:w-auto 
        ${mobileOnly ? 'flex-col gap-1 py-1 px-1 justify-center' : ''}
        ${currentView === view 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <Icon className={`${mobileOnly ? 'w-6 h-6' : 'w-5 h-5'}`} />
      <span className={`${mobileOnly ? 'text-[10px]' : 'font-medium'}`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
      
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden md:flex bg-white border-r border-slate-200 w-64 flex-shrink-0 z-20 h-screen sticky top-0 flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/50">
            R
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Registro Jefe<br/>de Turnos</h1>
        </div>
        
        <nav className="p-4 flex flex-col gap-1 flex-1">
          <NavItem view="entry" icon={PlusCircle} label="Registro" />
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="list" icon={List} label="Historial" />
        </nav>
        
        <div className="mt-auto p-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Estado del Sistema</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Almacenamiento Local
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">Datos guardados en este dispositivo.</p>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen pb-28 md:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Global Filter Bar (Visible in Dashboard & List) */}
          {(currentView === 'dashboard' || currentView === 'list') && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-700 text-sm">Filtros de Datos</span>
                  {(filters.startDate || filters.endDate || filters.machine || filters.boss) && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">Activos</span>
                  )}
                </div>
                <div className="text-blue-600 text-xs font-bold hover:underline">
                  {showFilters ? 'Ocultar' : 'Mostrar'}
                </div>
              </div>
              
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Desde</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border rounded text-sm" 
                           value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Hasta</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border rounded text-sm"
                           value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Máquina</label>
                    <select className="w-full p-2 bg-slate-50 border rounded text-sm"
                            value={filters.machine} onChange={e => setFilters({...filters, machine: e.target.value})}>
                      <option value="">Todas</option>
                      {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Jefe de Turno</label>
                    <select className="w-full p-2 bg-slate-50 border rounded text-sm"
                            value={filters.boss} onChange={e => setFilters({...filters, boss: e.target.value})}>
                      <option value="">Todos</option>
                      {BOSSES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                     <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 font-medium">
                       Limpiar Filtros
                     </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'entry' && (
            <div className="animate-fade-in-up">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Registro de Turno</h2>
                <p className="text-slate-500 text-sm">Ingresa los datos de producción en tiempo real.</p>
              </div>
              <ShiftForm onRecordSaved={handleRecordSaved} />
              
              {/* Mini Recent List */}
              <div className="mt-8 mb-20 md:mb-0">
                <div className="flex justify-between items-end mb-4">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Últimos Registros</h3>
                   <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                     <span className="w-2 h-2 bg-green-500 rounded-full"></span> Sincronizado
                   </span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
                  {records.slice(0, 3).map(r => (
                    <div key={r.id} className="p-4 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 block">{r.machine}</span>
                        <span className="text-xs text-slate-500">{r.shift} • {r.boss}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-blue-600 block">{r.meters.toLocaleString()} m</span>
                        <span className="text-xs text-slate-400">{r.changesCount} cambios</span>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <div className="p-4 text-center text-slate-400 italic text-sm">Sin registros hoy</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'dashboard' && (
            <div className="animate-fade-in">
              <Dashboard records={filteredRecords} />
            </div>
          )}

          {currentView === 'list' && (
            <div className="animate-fade-in mb-20 md:mb-0">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Historial</h2>
                  <span className="text-sm bg-slate-200 px-3 py-1 rounded-full text-slate-600 font-medium mt-1 inline-block">
                    {filteredRecords.length} registros
                  </span>
                </div>
                
                {records.length > 0 && (
                  <button 
                    onClick={initiateDeleteAll}
                    className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors text-sm font-bold border border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Borrar Todo
                  </button>
                )}
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Máq.</th>
                        <th className="px-6 py-4 text-right">Metros</th>
                        <th className="px-6 py-4 text-center hidden sm:table-cell">Cambios</th>
                        <th className="px-6 py-4 hidden sm:table-cell">Comentarios</th>
                        <th className="px-6 py-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{r.date}</div>
                            <div className="text-xs">{r.shift}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 text-xs font-bold">
                              {r.machine}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">
                            {r.meters.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600 hidden sm:table-cell">
                            {r.changesCount}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate hidden sm:table-cell" title={r.changesComment}>
                            {r.changesComment}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => initiateDeleteSingle(r.id)}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              title="Borrar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    {records.length > 0 ? 'No hay resultados con los filtros actuales.' : 'Base de datos vacía.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION (Fixed & High Z-Index) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-40 flex justify-around items-center px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] h-[70px]">
        <NavItem view="entry" icon={PlusCircle} label="Registro" mobileOnly />
        <NavItem view="dashboard" icon={LayoutDashboard} label="Data" mobileOnly />
        <NavItem view="list" icon={List} label="Historial" mobileOnly />
      </nav>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {deleteMode === 'all' ? '¿Borrar todo el historial?' : '¿Borrar registro?'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {deleteMode === 'all' 
                  ? 'Esta acción es irreversible y borrará los datos.'
                  : 'Se solicitará clave de supervisor para confirmar.'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Password Field is now ALWAYS shown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contraseña de Supervisor</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Ingrese clave de seguridad"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {deleteError && (
                  <div className="flex items-center gap-2 text-red-600 text-xs mt-2 font-medium animate-shake">
                    <AlertCircle className="w-3 h-3" /> {deleteError}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={closeDeleteModal}
                  className="px-4 py-3 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-4 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition-colors"
                >
                  {deleteMode === 'all' ? 'Borrar Todo' : 'Borrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
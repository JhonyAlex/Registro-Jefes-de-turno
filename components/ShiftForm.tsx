import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Calendar, CheckCircle, X, ChevronDown, MessageSquare, Trash2 } from 'lucide-react';
import { MachineType, ShiftType, BossType, ProductionRecord } from '../types';
import { MACHINES, SHIFTS, BOSSES } from '../constants';
import { saveRecord, getAvailableComments, deleteCustomComment } from '../services/storageService';

interface ShiftFormProps {
  onRecordSaved: () => void;
}

const ShiftForm: React.FC<ShiftFormProps> = ({ onRecordSaved }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: ShiftType.MORNING,
    boss: BossType.MARTIN,
    machine: MachineType.WH1,
  });

  const [metersInput, setMetersInput] = useState('');
  const [changesInput, setChangesInput] = useState('');
  
  const [commentInput, setCommentInput] = useState('');
  const [availableComments, setAvailableComments] = useState<string[]>([]);
  const [filteredComments, setFilteredComments] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [successMsg, setSuccessMsg] = useState('');

  const refreshComments = async () => {
    const comments = await getAvailableComments();
    setAvailableComments(comments);
    return comments;
  };

  useEffect(() => {
    refreshComments();
  }, []);

  useEffect(() => {
    if (!commentInput) {
      setFilteredComments(availableComments);
    } else {
      const lowerInput = commentInput.toLowerCase();
      setFilteredComments(availableComments.filter(c => 
        c.toLowerCase().includes(lowerInput)
      ));
    }
  }, [commentInput, availableComments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMetersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setMetersInput(rawValue);
  };

  const handleChangesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setChangesInput(rawValue);
  };

  const formatMeters = (value: string) => {
    if (!value) return '';
    return parseInt(value).toLocaleString('es-ES');
  };

  const clearComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentInput('');
    setFilteredComments(availableComments);
  };

  const handleInputFocus = async () => {
    await refreshComments();
    setShowSuggestions(true);
  };

  const selectComment = (comment: string) => {
    setCommentInput(comment);
    setShowSuggestions(false);
  };

  const handleDeleteComment = async (e: React.MouseEvent, comment: string) => {
    e.stopPropagation();
    if (confirm(`¿Borrar "${comment}" de la lista de autocompletado?`)) {
      await deleteCustomComment(comment);
      await refreshComments();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metersInput) return;

    const newRecord: Omit<ProductionRecord, 'id'> = {
      timestamp: Date.now(),
      date: formData.date,
      shift: formData.shift,
      boss: formData.boss,
      machine: formData.machine,
      meters: parseInt(metersInput),
      changesCount: changesInput === '' ? 0 : parseInt(changesInput),
      changesComment: commentInput
    };

    await saveRecord(newRecord);
    setSuccessMsg('Registro guardado');
    onRecordSaved();
    
    await refreshComments();

    setMetersInput('');
    setChangesInput('');
    setCommentInput('');

    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-20 md:mb-0">
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuevo Registro
        </h2>
        {successMsg && (
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse shadow-sm">
            <CheckCircle className="w-3 h-3" /> {successMsg}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* ... Rest of the form is unchanged ... */}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Fecha de Turno
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Jefe de Turno</label>
            <div className="relative">
              <select
                value={formData.boss}
                onChange={e => setFormData({ ...formData, boss: e.target.value as BossType })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
              >
                {BOSSES.map(boss => (
                  <option key={boss} value={boss}>{boss}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Turno</label>
            <div className="relative">
              <select
                value={formData.shift}
                onChange={e => setFormData({ ...formData, shift: e.target.value as ShiftType })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
              >
                {SHIFTS.map(shift => (
                  <option key={shift} value={shift}>{shift}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Production Data */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Seleccionar Máquina</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {MACHINES.map(machine => (
                <button
                  key={machine}
                  type="button"
                  onClick={() => setFormData({ ...formData, machine: machine })}
                  className={`px-2 py-4 rounded-xl text-sm font-bold transition-all border shadow-sm ${
                    formData.machine === machine
                      ? 'bg-slate-800 text-white border-slate-900 shadow-md transform scale-105 ring-2 ring-offset-1 ring-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {machine}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Metros Producidos
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={formatMeters(metersInput)}
                  onChange={handleMetersChange}
                  className="w-full px-4 py-3 text-2xl font-mono font-bold text-right bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-inner"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs tracking-wider">
                  MTS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cambios</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={changesInput}
                  onChange={handleChangesChange}
                  className="w-full px-4 py-3 text-center bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                />
              </div>
              
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Comentario / Incidencia</label>
                <div className="relative w-full">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                       <MessageSquare className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Seleccionar o escribir..."
                      value={commentInput}
                      onChange={e => {
                        setCommentInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={handleInputFocus}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      autoComplete="off"
                    />
                    
                    {/* Actions Right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      {commentInput && (
                        <button
                          type="button"
                          onClick={clearComment}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 rounded-full mr-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <div className={`pointer-events-none text-slate-400 p-1 transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`}>
                         <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Custom Mobile-Friendly Dropdown */}
                  {showSuggestions && (
                    <div className="absolute z-50 w-full bottom-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fade-in origin-bottom">
                      {filteredComments.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {filteredComments.map((comment, index) => (
                            <div
                              key={index}
                              onClick={() => selectComment(comment)}
                              className="w-full text-left px-4 py-3.5 hover:bg-blue-50 active:bg-blue-100 text-slate-700 font-medium transition-colors flex items-center justify-between group touch-target cursor-pointer"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                <span className="truncate">{comment}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteComment(e, comment)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                                title="Borrar de la lista"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-center">
                           <p className="text-slate-400 text-sm mb-1">Nueva incidencia</p>
                           <p className="text-blue-600 font-bold text-sm break-words">"{commentInput}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 pb-6">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] touch-target text-lg"
          >
            <Save className="w-6 h-6" />
            GUARDAR REGISTRO
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;

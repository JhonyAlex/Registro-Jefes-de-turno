import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { FileText, Table, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { ProductionRecord } from '../types';
import { exportToExcel, exportToPDF } from '../services/storageService';

interface DashboardProps {
  records: ProductionRecord[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ records }) => {
  // 1. Calculate Summary Metrics
  const summary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayRecords = records.filter(r => r.date === today);
    const yesterdayRecords = records.filter(r => r.date === yesterday);

    const totalMetersToday = todayRecords.reduce((acc, r) => acc + r.meters, 0);
    const totalMetersYesterday = yesterdayRecords.reduce((acc, r) => acc + r.meters, 0);

    const totalChangesToday = todayRecords.reduce((acc, r) => acc + r.changesCount, 0);
    const changesAvg = todayRecords.length ? (totalChangesToday / todayRecords.length).toFixed(1) : '0';

    const efficiency = todayRecords.length ? 
      Math.min(100, Math.round((totalMetersToday / (todayRecords.length * 5000)) * 100)) : 0;

    return {
      todayMeters: totalMetersToday,
      growth: yesterdayRecords.length ? ((totalMetersToday - totalMetersYesterday) / totalMetersYesterday) * 100 : 0,
      avgChanges: changesAvg,
      efficiency
    };
  }, [records]);

  // 2. Machine Performance Data
  const machineData = useMemo(() => {
    const grouped: Record<string, number> = {};
    records.slice(0, 50).forEach(r => {
      grouped[r.machine] = (grouped[r.machine] || 0) + r.meters;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [records]);

  // 3. Incident/Comment Analytics
  const incidentsData = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      if (r.changesComment && r.changesComment.trim().length > 1) {
        // Simple normalization
        const key = r.changesComment.trim(); 
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [records]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard de Producción</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => exportToExcel(records)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <Table className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={() => exportToPDF(records)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Producción Hoy</p>
            <TrendingUp className={`w-5 h-5 ${summary.growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{summary.todayMeters.toLocaleString()} m</h3>
          <p className={`text-xs mt-2 font-medium ${summary.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.growth >= 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs ayer
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Eficiencia Turno</p>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{summary.efficiency}%</h3>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${summary.efficiency}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Promedio Cambios</p>
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{summary.avgChanges}</h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Por máquina / día</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-6 uppercase">Producción por Máquina</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {machineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents Analytics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <h4 className="text-sm font-bold text-slate-700 uppercase">Motivos de Cambios (Top 5)</h4>
             {incidentsData.length > 0 && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-bold">Patrones detectados</span>}
          </div>
          
          {incidentsData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentsData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} 
                  />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 opacity-50" />
              <p className="text-sm">Sin suficientes datos de incidencias</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
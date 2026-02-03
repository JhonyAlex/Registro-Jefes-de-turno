export enum MachineType {
  WH1 = 'WH1',
  GIAVE = 'Giave',
  WH3 = 'WH3',
  NEXUS = 'NEXUS',
  SL2 = 'SL2',
  M21 = '21',
  M22 = '22'
}

export enum ShiftType {
  MORNING = 'Mañana',
  AFTERNOON = 'Tarde',
  NIGHT = 'Noche'
}

export enum BossType {
  MARTIN = 'J.Martín',
  NAVARRO = 'J.Navarro'
}

export interface ProductionRecord {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  machine: MachineType;
  meters: number;
  changesCount: number;
  changesComment: string;
  shift: ShiftType;
  boss: BossType;
}

export interface ProductionStats {
  totalMeters: number;
  totalChanges: number;
  avgEfficiency: number;
  recordCount: number;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  machine: string;
  boss: string;
}
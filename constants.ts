import { MachineType, ShiftType, BossType } from './types';

export const MACHINES = Object.values(MachineType);
export const SHIFTS = Object.values(ShiftType);
export const BOSSES = Object.values(BossType);

export const COMMON_COMMENTS = [
  "Antivaho",
  "NT",
  "No tejido",
  "Montado",
  "Pedidos",
  "Cambio carro",
  "Bio",
  "PApel"
];

// Empty array, no mock data
export const INITIAL_DATA_SEED = [];
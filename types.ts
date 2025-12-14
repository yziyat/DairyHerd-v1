
export type ReproStatus = string; // Changed from strict union to string to support raw file inputs (e.g. "NO BRED")
export type EventType = 'HEAT' | 'BREED' | 'PREG_CHECK' | 'HEALTH' | 'CALVING' | 'DRY_OFF' | 'VACCINE' | 'SYNC_SHOT';

export interface CowEvent {
  id: string;
  cowId: string;
  date: string; // ISO Date
  type: EventType;
  details: string;
  technician?: string;
  cost?: number;
}

export interface Cow {
  id: string; // Tag Number
  eid?: string; // Electronic ID
  name?: string;
  birthDate: string; // BDAT
  lactation: number; // LACT
  daysInMilk: number; // DIM
  lastCalvingDate?: string; // FDAT (Fresh Date)
  reproStatus: ReproStatus; // RPRO
  pen: number; // PEN
  breed: string; // CBRD
  
  // Reproduction & Health Metrics
  daysCarriedCalf?: number; // DCC
  lastHeatDate?: string; // HDAT
  daysSinceLastHeat?: number; // DSLH
  timesBred: number; // TBRD
  gender: 'F' | 'M'; // GENDR
  daysOpen: number; // DOPN
  dueDate?: string; // DUE
  calvingInterval?: number; // CINT
  ageInDays: number; // AGEDS
  
  // Sires
  sire1?: string; // SIR1 (Current/Last Service Sire)
  sire2?: string; // SIR2 (Previous)
  sire3?: string; // SIR3 (Grand Sire or Previous)

  production?: {
    lastMilk: number; // in Liters/Lbs
    avgMilk: number;
  };
}

// Protocol Types
export interface ProtocolStep {
  day: number; // Day relative to start (0, 7, 14...)
  description: string;
  type: 'INJECTION' | 'AI' | 'CHECK' | 'MOVE';
  product?: string;
}

export interface Protocol {
  id: string;
  name: string;
  description?: string;
  lastModified?: string; // Date of last edit
  steps: ProtocolStep[];
}

export interface ProtocolInstance {
  id: string;
  cowId: string;
  protocolId: string;
  startDate: string; // ISO Date
  manager: string;
  inseminator: string;
  status: 'ACTIVE' | 'COMPLETED';
  completedStepIndices: number[]; // Array of step indices that are done
  snapshotSteps?: ProtocolStep[]; // Versioning: Steps as they were when instance started
}

export interface AppState {
  cows: Cow[];
  events: CowEvent[];
  protocols: Protocol[];
  protocolInstances: ProtocolInstance[];
  selectedCowId: string | null;
  currentView: 'HOME' | 'HERD' | 'COW_DETAIL' | 'PROTOCOLS' | 'REPORTS' | 'INSEMINATION' | 'SETTINGS' | 'USERS';
}
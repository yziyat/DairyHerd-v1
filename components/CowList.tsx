import React, { useState } from 'react';
import { Cow } from '../types';
import { ArrowUpDown, Filter, Upload, FileSpreadsheet, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { translations, formatDate, Language, DateFormat } from '../utils/helpers';
import * as XLSX from 'xlsx';

interface CowListProps {
  cows: Cow[];
  onSelectCow: (id: string) => void;
  onImportCows: (newCows: Cow[]) => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
  language: Language;
  dateFormat: DateFormat;
}

const statusColors: Record<string, string> = {
  'OPEN': 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded',
  'NO BRED': 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded', 
  'BRED': 'text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded',
  'PREG': 'text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded',
  'FRESH': 'text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded',
  'DRY': 'text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded',
  'DNB': 'text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded',
};

const getStatusClass = (status: string) => {
  const normalized = status?.toUpperCase().trim();
  if (normalized && statusColors[normalized]) {
    return statusColors[normalized];
  }
  return 'text-neutral-600 font-bold bg-neutral-100 px-2 py-0.5 rounded';
};

// Robust Date Parser
const parseDC305Date = (val: any): string | undefined => {
  if (!val) return undefined;
  
  if (val instanceof Date) {
     return val.toISOString().split('T')[0];
  }

  // Remove all spaces (fixes "18/ 5/2019") and trim
  const str = String(val).replace(/\s+/g, '').trim();
  if (str === '') return undefined;

  // Handle "d/m/yy" or "d/m/yyyy"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) {
        const numY = parseInt(y);
        y = numY > 50 ? '19' + y : '20' + y;
      }
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Handle "d-m-yy"
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
       if (parts[0].length === 4) return str; // Already ISO
       let [d, m, y] = parts;
       if (y.length === 2) y = parseInt(y) > 50 ? '19' + y : '20' + y;
       return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  return undefined;
};

const CowList: React.FC<CowListProps> = ({ cows, onSelectCow, onImportCows, onNotify, language, dateFormat }) => {
  // Sorting State
  const [sortField, setSortField] = React.useState<keyof Cow>('id');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  
  // Filtering State
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mockPreviewData, setMockPreviewData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [previewPage, setPreviewPage] = useState(1);
  const previewRowsPerPage = 10;

  const t = translations[language];

  // Logic to handle sort click
  const handleHeaderClick = (field: string) => {
    const key = field as keyof Cow;
    if (sortField === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  // Filtering & Sorting Logic
  const filteredCows = cows.filter(cow => {
    // Status Filter
    if (filterStatus !== 'ALL' && !cow.reproStatus.includes(filterStatus)) {
        return false;
    }
    // Text Search (ID or EID)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const idMatch = cow.id.toLowerCase().includes(query);
        const eidMatch = cow.eid ? cow.eid.toLowerCase().includes(query) : false;
        if (!idMatch && !eidMatch) return false;
    }
    return true;
  }).sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle undefined/nulls
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';

    // Numeric comparison if possible
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // String comparison
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredCows.length / rowsPerPage) || 1;
  const paginatedCows = filteredCows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const columns = [
    { id: 'pen', label: 'PEN', width: 'w-16' },
    { id: 'id', label: 'ID', width: 'w-20' },
    { id: 'eid', label: 'EID', width: 'w-32' },
    { id: 'breed', label: 'CBRD', width: 'w-16' },
    { id: 'reproStatus', label: 'RPRO', width: 'w-24' },
    { id: 'lactation', label: 'LACT', width: 'w-16' },
    { id: 'daysInMilk', label: 'DIM', width: 'w-16' },
    { id: 'lastCalvingDate', label: 'FDAT', width: 'w-24' },
    { id: 'birthDate', label: 'BDAT', width: 'w-24' },
    { id: 'daysCarriedCalf', label: 'DCC', width: 'w-16' },
    { id: 'lastHeatDate', label: 'HDAT', width: 'w-24' },
    { id: 'daysSinceLastHeat', label: 'DSLH', width: 'w-16' },
    { id: 'timesBred', label: 'TBRD', width: 'w-16' },
    { id: 'sire1', label: 'SIR1', width: 'w-24' },
    { id: 'sire2', label: 'SIR2', width: 'w-24' },
    { id: 'sire3', label: 'SIR3', width: 'w-24' },
    { id: 'gender', label: 'GENDR', width: 'w-16' },
    { id: 'daysOpen', label: 'DOPN', width: 'w-16' },
    { id: 'dueDate', label: 'DUE', width: 'w-24' },
    { id: 'calvingInterval', label: 'CINT', width: 'w-16' },
    { id: 'ageInDays', label: 'AGEDS', width: 'w-20' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length > 0) {
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(data.length, 10); i++) {
            const rowStr = data[i].join(' ').toUpperCase();
            if (rowStr.includes('ID') && rowStr.includes('PEN')) {
              headerRowIndex = i;
              break;
            }
          }
          setHeaders(data[headerRowIndex].map(h => String(h).toUpperCase().trim()));
          setMockPreviewData(data.slice(headerRowIndex + 1)); 
          setImportStep(2);
        } else {
          onNotify("File appears to be empty", "error");
        }
      } catch (err) {
        console.error(err);
        onNotify("Error parsing file", "error");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFinalizeImport = () => {
     setIsProcessing(true);
     const mapIdx = (names: string[]) => headers.findIndex(h => names.includes(h));

     const COL = {
       ID: mapIdx(['ID', 'COW']),
       EID: mapIdx(['EID', 'RFID', 'TAG']),
       PEN: mapIdx(['PEN']),
       CBRD: mapIdx(['CBRD', 'BREED']),
       RPRO: mapIdx(['RPRO', 'STAT', 'STATUS']),
       LACT: mapIdx(['LACT', 'LCT']),
       DIM: mapIdx(['DIM']),
       FDAT: mapIdx(['FDAT', 'FRESH', 'CALVING']),
       BDAT: mapIdx(['BDAT', 'BIRTH']),
       DCC: mapIdx(['DCC']),
       HDAT: mapIdx(['HDAT', 'HEAT']),
       DSLH: mapIdx(['DSLH']),
       TBRD: mapIdx(['TBRD', 'BRED', 'TIMES']),
       SIR1: mapIdx(['SIR1', 'SIRE']),
       SIR2: mapIdx(['SIR2']),
       SIR3: mapIdx(['SIR3']),
       GENDR: mapIdx(['GENDR', 'SEX']),
       DOPN: mapIdx(['DOPN', 'OPEN']),
       DUE: mapIdx(['DUE']),
       CINT: mapIdx(['CINT']),
       AGEDS: mapIdx(['AGEDS', 'AGE']),
       MILK: mapIdx(['MILK', 'MKA', 'AVG']),
     };

     const newCows: Cow[] = mockPreviewData.map((row): Cow | null => {
        const getVal = (idx: number) => (idx >= 0 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
        
        // Critical: Check if row ID is valid and NOT a summary line
        const rawId = getVal(COL.ID);
        if (!rawId || rawId.toLowerCase().startsWith('total') || rawId === 'ID') return null;

        return {
          id: rawId,
          eid: getVal(COL.EID),
          pen: parseInt(getVal(COL.PEN)) || 0,
          breed: getVal(COL.CBRD),
          reproStatus: getVal(COL.RPRO),
          lactation: parseInt(getVal(COL.LACT)) || 1,
          daysInMilk: parseInt(getVal(COL.DIM)) || 0,
          lastCalvingDate: parseDC305Date(row[COL.FDAT]),
          birthDate: parseDC305Date(row[COL.BDAT]) || "2020-01-01",
          daysCarriedCalf: parseInt(getVal(COL.DCC)) || undefined,
          lastHeatDate: parseDC305Date(row[COL.HDAT]),
          daysSinceLastHeat: parseInt(getVal(COL.DSLH)) || undefined,
          timesBred: parseInt(getVal(COL.TBRD)) || 0,
          sire1: getVal(COL.SIR1),
          sire2: getVal(COL.SIR2),
          sire3: getVal(COL.SIR3),
          gender: (getVal(COL.GENDR).startsWith('M') ? 'M' : 'F') as any,
          daysOpen: parseInt(getVal(COL.DOPN)) || 0,
          dueDate: parseDC305Date(row[COL.DUE]),
          calvingInterval: parseInt(getVal(COL.CINT)) || undefined,
          ageInDays: parseInt(getVal(COL.AGEDS)) || 0,
          production: {
            lastMilk: 0,
            avgMilk: parseFloat(getVal(COL.MILK)) || 0
          }
        };
     }).filter((c): c is Cow => c !== null);

     onImportCows(newCows);
     setShowImportModal(false);
     setImportStep(1);
     setMockPreviewData([]);
     setIsProcessing(false);
  };

  const paginatedPreviewData = mockPreviewData.slice(
    (previewPage - 1) * previewRowsPerPage,
    previewPage * previewRowsPerPage
  );

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             {/* ... Import Modal Content (Kept same logic, just wrapper) ... */}
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <div>
                    <h2 className="text-xl font-display font-bold text-neutral-900">Import Herd Data</h2>
                    <p className="text-sm text-neutral-500">Supports .XLSX, .XLS, .CSV (Dairy Comp 305 Format)</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-neutral-400 hover:text-neutral-600">
                    <CheckCircle2 className="w-6 h-6 rotate-45" />
                </button>
            </div>
            <div className="flex-1 overflow-auto p-8">
                {importStep === 1 && (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 hover:bg-primary-50 hover:border-primary-300 transition-colors">
                        {isProcessing ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                                <p className="text-neutral-600 font-medium">Parsing file...</p>
                            </div>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-16 h-16 text-neutral-400 mb-4" />
                                <h3 className="text-lg font-bold text-neutral-700 mb-2">Upload Data File</h3>
                                <p className="text-neutral-500 text-center max-w-sm mb-6">Drag and drop your DC305 Export here.</p>
                                <label className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer shadow-lg shadow-primary-900/10 transition-transform active:scale-95">
                                    Select File
                                    <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </>
                        )}
                    </div>
                )}
                {importStep === 2 && (
                    <div className="flex flex-col h-full">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-neutral-700">Preview Data</h3>
                            <div className="text-xs px-2 py-1 bg-neutral-100 rounded text-neutral-500">
                                Detected Headers: {headers.length}
                            </div>
                         </div>
                         <div className="flex-1 border border-neutral-200 rounded-lg overflow-auto bg-white mb-4 shadow-inner">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-100 sticky top-0 text-neutral-600 font-bold z-10">
                                    <tr>{headers.map((h, i) => <th key={i} className="p-2 border-b border-r bg-neutral-100 whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {paginatedPreviewData.map((row, i) => (
                                        <tr key={i} className="even:bg-neutral-50">
                                            {row.map((cell, j) => <td key={j} className="p-2 border-b border-r text-neutral-600 font-mono whitespace-nowrap">{String(cell)}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <button disabled={previewPage === 1} onClick={() => setPreviewPage(p => p - 1)} className="px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200 disabled:opacity-50">{t.common.prev}</button>
                            <button disabled={previewPage * previewRowsPerPage >= mockPreviewData.length} onClick={() => setPreviewPage(p => p + 1)} className="px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200 disabled:opacity-50">{t.common.next}</button>
                         </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                {importStep === 2 && (
                    <button onClick={handleFinalizeImport} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Import
                    </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
            {t.herdList.title} ({cows.length})
        </h2>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-white border border-neutral-300 rounded-md shadow-sm h-8 px-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                <Search className="w-3.5 h-3.5 text-neutral-400 mr-2" />
                <input 
                    type="text" 
                    placeholder="Search ID, EID..." 
                    className="text-xs w-32 md:w-48 outline-none text-neutral-700 placeholder-neutral-400"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-1 text-neutral-400 hover:text-neutral-600">
                        <CheckCircle2 className="w-3 h-3 rotate-45" />
                    </button>
                )}
           </div>

           <div className="h-6 w-px bg-neutral-200 mx-1"></div>

           <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <select 
              className="bg-white border border-neutral-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-700"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">{t.herdList.filterAll}</option>
              <option value="FRESH">FRESH</option>
              <option value="OPEN">OPEN</option>
              <option value="NO BRED">NO BRED</option>
              <option value="BRED">BRED</option>
              <option value="PREG">PREG</option>
              <option value="DRY">DRY</option>
            </select>
          </div>

          <button 
                onClick={() => setShowImportModal(true)}
                className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white border border-neutral-900 rounded-md shadow-sm text-xs font-medium hover:bg-neutral-800 transition-colors"
            >
                <Upload className="w-3 h-3" />
                {t.herdList.importBtn}
            </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto bg-white relative">
        <table className="min-w-max border-collapse text-left w-full">
          <thead className="bg-neutral-100 sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.id} 
                  className={`p-2.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200 select-none ${col.width}`}
                  onClick={() => handleHeaderClick(col.id)}
                >
                  <div className="flex items-center gap-1 cursor-pointer hover:text-primary-600 transition-colors group">
                    {col.label}
                    {sortField === col.id ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-600" /> : <ArrowDown className="w-3 h-3 text-primary-600" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paginatedCows.length > 0 ? paginatedCows.map((cow, idx) => (
              <tr 
                key={cow.id + idx} 
                onClick={() => onSelectCow(cow.id)}
                className={`cursor-pointer transition-colors hover:bg-primary-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
              >
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.pen}</td>
                <td className="p-2.5 text-xs font-mono font-bold text-primary-700 underline decoration-dotted decoration-primary-300">{cow.id}</td>
                <td className="p-2.5 text-[10px] font-mono text-neutral-400">{cow.eid}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.breed}</td>
                <td className="p-2.5 text-xs font-mono">
                  <span className={`${getStatusClass(cow.reproStatus)} inline-block text-[10px]`}>
                    {cow.reproStatus}
                  </span>
                </td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.lactation}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.daysInMilk}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{formatDate(cow.lastCalvingDate, dateFormat)}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{formatDate(cow.birthDate, dateFormat)}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.daysCarriedCalf || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-400">{formatDate(cow.lastHeatDate, dateFormat)}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.daysSinceLastHeat || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.timesBred}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-500">{cow.sire1 || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.sire2 || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.sire3 || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.gender}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.daysOpen}</td>
                <td className="p-2.5 text-xs font-mono font-medium text-neutral-700">{formatDate(cow.dueDate, dateFormat)}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.calvingInterval || '-'}</td>
                <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.ageInDays}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-neutral-400 italic bg-neutral-50">
                  {searchQuery ? 'No matching cows found.' : 'No records found. Import a file to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Pagination Footer */}
      <div className="p-3 bg-white border-t border-neutral-200 text-xs text-neutral-500 flex justify-between items-center sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
            <span>{t.common.show}</span>
            <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
            <span>{t.common.rows}</span>
        </div>
        
        <div className="flex items-center gap-4">
            <span>{t.common.page} {currentPage} {t.common.of} {totalPages}</span>
            <div className="flex rounded-md shadow-sm">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 px-2 bg-white border border-neutral-300 rounded-l hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 px-2 bg-white border border-neutral-300 rounded-r hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed border-l-0 text-neutral-600"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CowList;
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cow } from '../types';
import { ArrowUpDown, Filter, Upload, FileSpreadsheet, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, LayoutList, PieChart, Layers, X, Trash2, CheckSquare, Square } from 'lucide-react';
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
  'OK': 'text-neutral-600 font-bold bg-neutral-100 px-2 py-0.5 rounded',
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
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const str = String(val).replace(/\s+/g, '').trim();
  if (str === '') return undefined;
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) { const numY = parseInt(y); y = numY > 50 ? '19' + y : '20' + y; }
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
       if (parts[0].length === 4) return str;
       let [d, m, y] = parts;
       if (y.length === 2) y = parseInt(y) > 50 ? '19' + y : '20' + y;
       return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return undefined;
};

// Internal Dashboard Component
const HerdDashboard: React.FC<{ data: Cow[], language: Language }> = ({ data, language }) => {
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [modalData, setModalData] = useState<{ title: string, cows: Cow[] } | null>(null);

    const filteredData = statusFilter === 'ALL' ? data : data.filter(c => c.reproStatus === statusFilter);
    const uniqueStatuses = Array.from(new Set(data.map(c => c.reproStatus).filter(Boolean))).sort();

    const total = filteredData.length || 1;
    const heifers = filteredData.filter(c => c.lactation === 0);
    const lact1 = filteredData.filter(c => c.lactation === 1);
    const lact2 = filteredData.filter(c => c.lactation === 2);
    const lact3Plus = filteredData.filter(c => c.lactation >= 3);

    const categories = [
        { label: 'Heifers (Lact 0)', count: heifers.length, color: '#94a3b8', group: heifers },
        { label: '1st Lactation', count: lact1.length, color: '#3b82f6', group: lact1 },
        { label: '2nd Lactation', count: lact2.length, color: '#8b5cf6', group: lact2 },
        { label: '3+ Lactation', count: lact3Plus.length, color: '#f59e0b', group: lact3Plus },
    ];

    let currentDeg = 0;
    const gradientParts = categories.map(cat => {
        const percent = (cat.count / total) * 100;
        const deg = (cat.count / total) * 360;
        const start = currentDeg;
        const end = currentDeg + deg;
        currentDeg = end;
        return `${cat.color} ${start}deg ${end}deg`;
    });
    const pieStyle = { background: `conic-gradient(${gradientParts.join(', ')})` };

    const milkingCows = filteredData.filter(c => c.lactation > 0);
    const milkingGroups = [
        { label: '1st Lactation', group: lact1 },
        { label: '2nd Lactation', group: lact2 },
        { label: '3+ Lactation', group: lact3Plus },
    ];

    return (
        <div className="p-6 overflow-y-auto max-w-7xl mx-auto space-y-8 pb-24">
            {/* Filter */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                <h2 className="font-display font-bold text-lg text-neutral-800">Herd Statistics</h2>
                <select 
                    className="bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">All Statuses</option>
                    {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-center items-center">
                    <span className="text-3xl font-display font-bold text-neutral-800">{filteredData.length}</span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Animals</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-center items-center">
                    <span className="text-3xl font-display font-bold text-primary-600">{milkingCows.length}</span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Milking Cows</span>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-center items-center">
                    <span className="text-3xl font-display font-bold text-neutral-600">{heifers.length}</span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Heifers</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-center items-center">
                    <span className="text-3xl font-display font-bold text-green-600">
                        {/* Fix: Explicitly typed reduce parameters to prevent arithmetic operation errors on 'unknown' or 'any' types */}
                        {Math.round(filteredData.reduce((acc: number, c: Cow) => acc + (c.daysInMilk || 0), 0) / (filteredData.length || 1))}
                    </span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg DIM</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="text-lg font-bold text-neutral-700 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-neutral-400" />
                        Herd Composition
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
                        <div className="w-48 h-48 rounded-full shadow-inner relative flex items-center justify-center shrink-0" style={pieStyle}>
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-sm z-10">
                                <span className="font-bold text-neutral-400 text-xs">BY GROUP</span>
                            </div>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-neutral-400 border-b border-neutral-100">
                                        <th className="text-left pb-2 font-bold">Category</th>
                                        <th className="text-right pb-2 font-bold">%</th>
                                        <th className="text-right pb-2 font-bold">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((cat, idx) => (
                                        <tr key={idx} 
                                            className="border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors"
                                            onClick={() => setModalData({ title: cat.label, cows: cat.group })}
                                        >
                                            <td className="py-2 flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full" style={{backgroundColor: cat.color}}></span>
                                                <span className="text-neutral-700 font-medium">{cat.label}</span>
                                            </td>
                                            <td className="py-2 text-right text-neutral-500">
                                                {Math.round((cat.count / total) * 100)}%
                                            </td>
                                            <td className="py-2 text-right font-mono font-bold text-neutral-800">
                                                {cat.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-neutral-700 mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-neutral-400" />
                        Milking Herd Details
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50 text-neutral-500 font-bold text-xs uppercase">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Category</th>
                                    <th className="p-3 text-right">Count</th>
                                    <th className="p-3 text-right">% of Milking</th>
                                    <th className="p-3 text-right">Avg DIM</th>
                                    <th className="p-3 text-right rounded-r-lg">Avg Last Milk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {milkingGroups.map((group, idx) => {
                                    const count = group.group.length;
                                    const pct = milkingCows.length ? Math.round((count / milkingCows.length) * 100) : 0;
                                    // Fix: Explicitly typed reduce parameters to prevent arithmetic operation errors
                                    const avgDIM = count ? Math.round(group.group.reduce((a: number, c: Cow) => a + (c.daysInMilk || 0), 0) / count) : 0;
                                    // Fix: Explicitly typed reduce parameters to prevent arithmetic operation errors
                                    const avgMilk = count ? (group.group.reduce((a: number, c: Cow) => a + (c.production?.lastMilk || 0), 0) / count).toFixed(1) : "0.0";
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                                            <td className="p-3 font-medium text-neutral-700">{group.label}</td>
                                            <td className="p-3 text-right font-mono text-neutral-800">{count}</td>
                                            <td className="p-3 text-right text-neutral-500">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-12 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary-500" style={{width: `${pct}%`}}></div>
                                                    </div>
                                                    {pct}%
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-neutral-600">{avgDIM}</td>
                                            <td className="p-3 text-right text-neutral-600">{avgMilk} L</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {modalData && (
                <div className="fixed inset-0 z-[100] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                            <h3 className="font-bold text-lg text-neutral-800">{modalData.title} ({modalData.cows.length})</h3>
                            <button onClick={() => setModalData(null)}><X className="w-5 h-5 text-neutral-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-neutral-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b">ID</th>
                                        <th className="p-3 border-b">Status</th>
                                        <th className="p-3 border-b">DIM</th>
                                        <th className="p-3 border-b">Pen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.cows.map(c => (
                                        <tr key={c.id} className="border-b border-neutral-50">
                                            <td className="p-3 font-mono font-bold text-primary-700">{c.id}</td>
                                            <td className="p-3">{c.reproStatus}</td>
                                            <td className="p-3">{c.daysInMilk}</td>
                                            <td className="p-3">{c.pen}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const CowList: React.FC<CowListProps> = ({ cows, onSelectCow, onImportCows, onNotify, language, dateFormat }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'DASHBOARD'>('LIST');
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCowIds, setSelectedCowIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPen, setFilterPen] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mockPreviewData, setMockPreviewData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [previewPage, setPreviewPage] = useState(1);
  const previewRowsPerPage = 10;
  const t = translations[language];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilterCol(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueStatuses = useMemo(() => Array.from(new Set(cows.map(c => c.reproStatus).filter(Boolean))).sort(), [cows]);
  const uniquePens = useMemo(() => Array.from(new Set(cows.map(c => c.pen))).sort((a,b) => a-b), [cows]);

  const handleHeaderSort = (field: string) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedCowIds(new Set(filteredCows.map(c => c.id)));
    else setSelectedCowIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    const newSet = new Set(selectedCowIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCowIds(newSet);
  };

  const handleDeleteSelected = () => {
    const confirmMsg = `Are you sure you want to delete ${selectedCowIds.size} cows? This cannot be undone.`;
    if (window.confirm(confirmMsg)) {
       const newCows = cows.filter(c => !selectedCowIds.has(c.id));
       onImportCows(newCows);
       setSelectedCowIds(new Set());
       onNotify("Selected cows deleted successfully", "success");
    }
  };

  const getCowValue = (cow: Cow, colId: string): any => {
      if (colId.includes('.')) {
          const parts = colId.split('.');
          let val: any = cow;
          for (const part of parts) {
              val = val ? val[part] : undefined;
          }
          return val;
      }
      return (cow as any)[colId];
  }

  const getUniqueValuesForCol = (colId: string) => {
      const values = new Set<string>();
      cows.forEach(c => {
          let val = getCowValue(c, colId);
          if (colId === 'lastCalvingDate' || colId === 'birthDate' || colId === 'lastHeatDate' || colId === 'dueDate') {
              val = formatDate(val as string, dateFormat);
          }
          if (val === undefined || val === null) val = '(Blank)';
          values.add(String(val));
      });
      return Array.from(values).sort();
  };

  const toggleColumnFilterValue = (colId: string, val: string) => {
      setColFilters(prev => {
          const currentSelected = prev[colId] || [];
          let newSelected = [...currentSelected];
          if (!prev[colId]) {
              const allVals = getUniqueValuesForCol(colId);
              newSelected = allVals.filter(v => v !== val); 
          } else {
             if (newSelected.includes(val)) newSelected = newSelected.filter(v => v !== val);
             else newSelected.push(val);
          }
          return { ...prev, [colId]: newSelected };
      });
      setCurrentPage(1);
  };

  const setAllColumnFilter = (colId: string, selectAll: boolean) => {
      if (selectAll) {
          const { [colId]: _, ...rest } = colFilters;
          setColFilters(rest);
      } else {
          setColFilters(prev => ({ ...prev, [colId]: [] }));
      }
      setCurrentPage(1);
  };

  const filteredCows = cows.filter(cow => {
    if (filterStatus !== 'ALL' && cow.reproStatus !== filterStatus) return false;
    if (filterPen !== 'ALL' && cow.pen.toString() !== filterPen) return false;
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!cow.id.toLowerCase().includes(query) && (!cow.eid || !cow.eid.toLowerCase().includes(query))) return false;
    }
    for (const [colId, allowedValues] of Object.entries(colFilters) as [string, string[]][]) {
        let val = getCowValue(cow, colId);
        if (colId === 'lastCalvingDate' || colId === 'birthDate' || colId === 'lastHeatDate' || colId === 'dueDate') {
              val = formatDate(val as string, dateFormat);
        }
        if (val === undefined || val === null) val = '(Blank)';
        if (!allowedValues.includes(String(val))) return false;
    }
    return true;
  }).sort((a, b) => {
    let aVal = getCowValue(a, sortField);
    let bVal = getCowValue(b, sortField);
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';
    if (typeof aVal === 'number' && typeof bVal === 'number') return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const totalPages = Math.ceil(filteredCows.length / rowsPerPage) || 1;
  const paginatedCows = filteredCows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Defined Columns to Match User Request (21 Columns)
  const columns = [
    { id: 'pen', label: 'PEN', width: 'w-16' },
    { id: 'id', label: 'ID', width: 'w-24' },
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
    { id: 'ageInDays', label: 'AGEDS', width: 'w-16' },
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
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length > 0) {
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(data.length, 20); i++) {
            const rowStr = data[i].join(' ').toUpperCase();
            if (rowStr.includes('ID') || rowStr.includes('PEN') || rowStr.includes('TAG')) {
              headerRowIndex = i;
              break;
            }
          }
          setHeaders(data[headerRowIndex].map(h => String(h).toUpperCase().trim()));
          setMockPreviewData(data.slice(headerRowIndex + 1)); 
          setImportStep(2);
        } else { onNotify("File appears to be empty", "error"); }
      } catch (err) { onNotify("Error parsing file", "error"); } finally { setIsProcessing(false); }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleCancelImport = () => { setShowImportModal(false); setImportStep(1); setMockPreviewData([]); setHeaders([]); setIsProcessing(false); }
  
  const handleFinalizeImport = () => {
     setIsProcessing(true);
     const findIdx = (aliases: string[]) => headers.findIndex(h => aliases.includes(h.toUpperCase().trim()));
     const COL = {
       ID: findIdx(['ID', 'COW', 'TAG', 'VISUAL ID', 'COW ID']),
       EID: findIdx(['EID', 'RFID', 'ELECTRONIC ID', 'ISO ID']),
       PEN: findIdx(['PEN', 'PN', 'LOCATION', 'GROUP']),
       CBRD: findIdx(['CBRD', 'BREED', 'BRD']),
       RPRO: findIdx(['RPRO', 'STAT', 'STATUS', 'REPRO STATUS', 'REPRO']),
       LACT: findIdx(['LACT', 'LCT', 'LACTATION']),
       DIM: findIdx(['DIM', 'DAYS IN MILK']),
       FDAT: findIdx(['FDAT', 'FRESH', 'CALVING', 'LAST CALVING', 'FRESH DATE']),
       BDAT: findIdx(['BDAT', 'BIRTH', 'BIRTH DATE']),
       DCC: findIdx(['DCC', 'DAYS CARRIED', 'DAYS CARRIED CALF']),
       HDAT: findIdx(['HDAT', 'HEAT', 'LAST HEAT', 'HEAT DATE']),
       DSLH: findIdx(['DSLH', 'DAYS SINCE HEAT', 'DAYS SINCE LAST HEAT']),
       TBRD: findIdx(['TBRD', 'BRED', 'TIMES BRED', 'BREEDINGS']),
       SIR1: findIdx(['SIR1', 'SIRE', 'SERVICE SIRE', 'BREED SIRE']),
       SIR2: findIdx(['SIR2', 'PREV SIRE', 'SIRE 2']),
       SIR3: findIdx(['SIR3', 'SIRE 3']),
       GENDR: findIdx(['GENDR', 'SEX', 'GENDER']),
       DOPN: findIdx(['DOPN', 'OPEN', 'DAYS OPEN']),
       DUE: findIdx(['DUE', 'DUE DATE']),
       CINT: findIdx(['CINT', 'INTERVAL', 'CALVING INTERVAL']),
       AGEDS: findIdx(['AGEDS', 'AGE', 'AGE IN DAYS']),
       MILK: findIdx(['MILK', 'MKA', 'AVG', 'AVG MILK', 'LAST MILK', 'TEST']),
       AVG: findIdx(['AVG', 'AVERAGE']),
     };

      const newCows: Cow[] = mockPreviewData.map((row): Cow | null => {
        const getVal = (idx: number) => (idx >= 0 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
        const rawId = getVal(COL.ID);
        if (!rawId || rawId.toLowerCase().startsWith('total') || rawId === 'ID') return null;
        const parsedLact = parseInt(getVal(COL.LACT));
        
        // Handle Production Columns which might share aliases or be specific
        const milkVal = parseFloat(getVal(COL.MILK)) || 0;
        const avgVal = parseFloat(getVal(COL.AVG)) || 0;

        return {
          id: rawId,
          eid: getVal(COL.EID),
          pen: parseInt(getVal(COL.PEN)) || 0,
          breed: getVal(COL.CBRD),
          reproStatus: getVal(COL.RPRO),
          lactation: isNaN(parsedLact) ? 0 : parsedLact,
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
          production: { lastMilk: milkVal, avgMilk: avgVal }
        };
     }).filter((c): c is Cow => c !== null);
     
     onImportCows(newCows);
     setShowImportModal(false);
     setImportStep(1);
     setMockPreviewData([]);
     setIsProcessing(false);
  };

  const paginatedPreviewData = mockPreviewData.slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <div><h2 className="text-lg font-display font-bold text-neutral-900">Import Herd Data</h2></div>
                <button onClick={handleCancelImport} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-8">
                {importStep === 1 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 hover:bg-primary-50 transition-colors">
                        <label className="cursor-pointer flex flex-col items-center">
                            <FileSpreadsheet className="w-16 h-16 text-neutral-400 mb-4" />
                            <span className="text-lg font-bold text-neutral-700 mb-2">Upload Data File</span>
                            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                         <div className="flex-1 border border-neutral-200 rounded-lg overflow-auto bg-white mb-4">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-100 sticky top-0 font-bold">
                                    <tr>{headers.map((h, i) => <th key={i} className="p-2 border-b border-r whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {paginatedPreviewData.map((row, i) => <tr key={i}>{row.map((cell: any, j: number) => <td key={j} className="p-2 border-b border-r whitespace-nowrap">{String(cell)}</td>)}</tr>)}
                                </tbody>
                            </table>
                         </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                 <button onClick={handleCancelImport} className="text-neutral-500 font-medium px-4 py-2">Cancel</button>
                 {importStep === 2 && <button onClick={handleFinalizeImport} className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold">Import</button>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/50 backdrop-blur-sm sticky top-0 z-20 flex flex-col border-b border-neutral-200">
          <div className="p-4 pb-2 flex items-center justify-end">
            <div className="flex bg-neutral-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('LIST')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${activeTab === 'LIST' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500'}`}><LayoutList className="w-3.5 h-3.5" /> List</button>
                <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${activeTab === 'DASHBOARD' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500'}`}><PieChart className="w-3.5 h-3.5" /> Dashboard</button>
            </div>
          </div>

          {activeTab === 'LIST' && (
              <div className="p-4 pt-2 flex items-center justify-end gap-3 border-t border-neutral-100/50 flex-wrap">
                 {selectedCowIds.size > 0 && (
                    <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-bold hover:bg-red-100">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedCowIds.size})
                    </button>
                 )}
                 
                 <div className="flex items-center bg-white border border-neutral-300 rounded-md shadow-sm h-8 px-2">
                      <Search className="w-3.5 h-3.5 text-neutral-400 mr-2" />
                      <input type="text" placeholder="Global Search..." className="text-xs w-32 outline-none" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                 </div>
                 
                 <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neutral-500" />
                  <select className="bg-white border border-neutral-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="ALL">Status: All</option>
                    {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                   <select className="bg-white border border-neutral-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-500" value={filterPen} onChange={(e) => setFilterPen(e.target.value)}>
                    <option value="ALL">Pen: All</option>
                    {uniquePens.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <button onClick={() => setShowImportModal(true)} className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800"><Upload className="w-3 h-3" /> {t.herdList.importBtn}</button>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-auto bg-white relative w-full pb-10">
        {activeTab === 'DASHBOARD' ? <HerdDashboard data={cows} language={language} /> : (
            <div className="min-w-full inline-block align-middle">
                <table className="min-w-full border-collapse text-left mb-12">
                  <thead className="bg-neutral-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-2 w-10 border-b border-neutral-200 text-center">
                          <input type="checkbox" onChange={handleToggleSelectAll} checked={filteredCows.length > 0 && selectedCowIds.size === filteredCows.length} />
                      </th>
                      {columns.map((col) => {
                        const isFilterActive = colFilters[col.id] && colFilters[col.id].length > 0;
                        const uniqueVals = openFilterCol === col.id ? getUniqueValuesForCol(col.id) : [];
                        return (
                          <th key={col.id} className={`p-2.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200 select-none ${col.width} relative group`}>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-primary-600" onClick={() => handleHeaderSort(col.id)}>
                                    {col.label}
                                    {sortField === col.id && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                </div>
                                <button className={`p-1 rounded hover:bg-neutral-200 ${isFilterActive ? 'text-primary-600 bg-primary-50' : 'text-neutral-400 opacity-0 group-hover:opacity-100'}`}
                                  onClick={(e) => { e.stopPropagation(); setOpenFilterCol(openFilterCol === col.id ? null : col.id); }}>
                                    <Filter className="w-3 h-3" />
                                </button>
                             </div>
                             {openFilterCol === col.id && (
                                 <div ref={filterMenuRef} className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100">
                                     <div className="p-2 border-b border-neutral-100 flex items-center justify-between text-xs bg-neutral-50 rounded-t-lg">
                                         <button onClick={() => setAllColumnFilter(col.id, true)} className="text-primary-600 font-bold hover:underline">Select All</button>
                                         <button onClick={() => setAllColumnFilter(col.id, false)} className="text-red-500 hover:underline">Clear</button>
                                     </div>
                                     <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                                         {uniqueVals.map(val => (
                                             <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 rounded cursor-pointer text-xs text-neutral-700">
                                                 <input type="checkbox" checked={!colFilters[col.id] || colFilters[col.id].includes(val)} onChange={() => toggleColumnFilterValue(col.id, val)} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                                                 <span className="truncate">{val}</span>
                                             </label>
                                         ))}
                                     </div>
                                 </div>
                             )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedCows.map((cow, idx) => (
                      <tr key={cow.id} className={`hover:bg-neutral-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/30'}`}>
                        <td className="p-2.5 text-center">
                            <input type="checkbox" checked={selectedCowIds.has(cow.id)} onChange={() => handleToggleRow(cow.id)} />
                        </td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.pen}</td>
                        <td onClick={(e) => { e.stopPropagation(); onSelectCow(cow.id); }} className="p-2.5 text-xs font-mono font-bold text-primary-700 underline decoration-dotted cursor-pointer">{cow.id}</td>
                        <td className="p-2.5 text-[10px] font-mono text-neutral-400">{cow.eid}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.breed}</td>
                        <td className="p-2.5 text-xs font-mono"><span className={`${getStatusClass(cow.reproStatus)} inline-block text-[10px]`}>{cow.reproStatus}</span></td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.lactation}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.daysInMilk}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{formatDate(cow.lastCalvingDate, dateFormat)}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{formatDate(cow.birthDate, dateFormat)}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.daysCarriedCalf || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-400">{formatDate(cow.lastHeatDate, dateFormat)}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-400">{cow.daysSinceLastHeat || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.timesBred}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-500">{cow.sire1 || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-500">{cow.sire2 || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-500">{cow.sire3 || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.gender}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.daysOpen}</td>
                        <td className="p-2.5 text-xs font-mono font-medium text-neutral-700">{formatDate(cow.dueDate, dateFormat)}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.calvingInterval || '-'}</td>
                        <td className="p-2.5 text-xs font-mono text-neutral-600">{cow.ageInDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Footer - Fixed Bottom */}
                <div className="fixed bottom-0 right-0 left-0 md:left-24 lg:left-0 p-3 bg-white border-t border-neutral-200 text-xs text-neutral-500 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pl-6">
                    <div className="flex items-center gap-2">
                        <span>{t.common.show}</span>
                        <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500">
                            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                        </select>
                        <span>{t.common.rows}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>{t.common.page} {currentPage} {t.common.of} {totalPages}</span>
                        <div className="flex rounded-md shadow-sm">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 px-2 bg-white border border-neutral-300 rounded-l hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600"><ChevronLeft className="w-4 h-4" /></button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 px-2 bg-white border border-neutral-300 rounded-r hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed border-l-0 text-neutral-600"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CowList;
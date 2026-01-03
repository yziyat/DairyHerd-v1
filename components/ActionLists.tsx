import React, { useState, useMemo } from 'react';
import { Cow, Protocol, ProtocolInstance, ProtocolStep } from '../types';
import { Users, CheckCircle, ListTodo, Plus, Edit2, Save, Trash2, X, Upload, TestTube2, Search, CheckCircle2, Calendar, Eye, MessageSquare, AlertCircle, Ban, Archive, Check, RotateCcw } from 'lucide-react';
import { translations, formatDate, Language, DateFormat } from '../utils/helpers';
import * as XLSX from 'xlsx';

interface ActionListsProps {
  cows: Cow[];
  protocols: Protocol[];
  setProtocols: React.Dispatch<React.SetStateAction<Protocol[]>>;
  instances: ProtocolInstance[];
  setInstances: React.Dispatch<React.SetStateAction<ProtocolInstance[]>>;
  onSelectCow: (id: string) => void;
  language: Language;
  dateFormat: DateFormat;
  availableManagers: string[];
  availableInseminators: string[];
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

type Tab = 'SETUP' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';

interface ProtocolBatch {
  key: string;
  protocolId: string;
  protocolName: string;
  startDate: string;
  manager: string;
  instances: ProtocolInstance[];
  totalCows: number;
  completedCows: number;
}

const ActionLists: React.FC<ActionListsProps> = ({ 
  cows, 
  protocols, 
  setProtocols,
  instances,
  setInstances,
  onSelectCow,
  language,
  dateFormat,
  availableManagers,
  availableInseminators,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('PLANNING');
  const t = translations[language].protocols;
  
  // --- PLANNING STATE ---
  const [selectedCowsForProtocol, setSelectedCowsForProtocol] = useState<string[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedInseminator, setSelectedInseminator] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Filters
  const [cowSearch, setCowSearch] = useState('');
  const [filterPen, setFilterPen] = useState('');
  const [filterRpro, setFilterRpro] = useState('');

  // --- EDITOR STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editProtocolId, setEditProtocolId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, description: string, steps: ProtocolStep[]}>({
    name: '',
    description: '',
    steps: []
  });

  // --- BATCH MODAL STATE ---
  const [selectedBatchKey, setSelectedBatchKey] = useState<string | null>(null);

  // --- HELPERS ---

  const activeCowIds = useMemo(() => 
    new Set(instances.filter(i => i.status === 'ACTIVE').map(i => i.cowId)), 
  [instances]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(cows.map(c => c.reproStatus).filter(Boolean))).sort(), [cows]);
  
  const batches = useMemo(() => {
    const groups: Record<string, ProtocolBatch> = {};
    const sortedInstances = [...instances].sort((a,b) => b.id.localeCompare(a.id));

    sortedInstances.forEach(inst => {
      const proto = protocols.find(p => p.id === inst.protocolId);
      const key = `${inst.protocolId}_${inst.startDate}`;
      
      if (!groups[key]) {
        groups[key] = {
          key,
          protocolId: inst.protocolId,
          protocolName: proto ? proto.name : 'Unknown Protocol',
          startDate: inst.startDate,
          manager: inst.manager,
          instances: [],
          totalCows: 0,
          completedCows: 0
        };
      }
      groups[key].instances.push(inst);
      groups[key].totalCows++;
      if (inst.status === 'COMPLETED' || inst.status === 'CANCELED') {
        groups[key].completedCows++;
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [instances, protocols]);

  const activeBatches = batches.filter(b => b.completedCows < b.totalCows);
  const completedBatches = batches.filter(b => b.completedCows === b.totalCows && b.totalCows > 0);

  const planningFilteredCows = cows.filter(c => {
    const q = cowSearch.toLowerCase();
    const idMatch = !q || c.id.toLowerCase().includes(q) || (c.eid && c.eid.toLowerCase().includes(q));
    const penMatch = !filterPen || c.pen.toString() === filterPen;
    const rproMatch = !filterRpro || (c.reproStatus === filterRpro);
    return idMatch && penMatch && rproMatch;
  }).slice(0, 100); 

  // --- HANDLERS ---

  const handleResetFilters = () => {
    setCowSearch('');
    setFilterPen('');
    setFilterRpro('');
  };

  const handleUnselectAll = () => {
    setSelectedCowsForProtocol([]);
  };

  const handleStartProtocol = () => {
    if (!selectedProtocolId || selectedCowsForProtocol.length === 0 || !selectedManager || !selectedInseminator) return;

    // Final safety check against race conditions
    const finalSelected = selectedCowsForProtocol.filter(id => !activeCowIds.has(id));
    
    if (finalSelected.length === 0) {
      alert("All selected cows are already in an active protocol.");
      return;
    }

    const protocolDefinition = protocols.find(p => p.id === selectedProtocolId);
    if (!protocolDefinition) return;

    const newInstances: ProtocolInstance[] = finalSelected.map((cowId, idx) => {
      return {
        id: `${Date.now()}-${idx}-${cowId}`,
        cowId,
        protocolId: selectedProtocolId,
        startDate: startDate, 
        manager: selectedManager,
        inseminator: selectedInseminator,
        status: 'ACTIVE',
        completedStepIndices: [],
        snapshotSteps: [...protocolDefinition.steps],
        notes: ''
      };
    });

    setInstances(prev => [...prev, ...newInstances]);
    
    setSelectedCowsForProtocol([]);
    setSelectedProtocolId('');
    handleResetFilters();
    onNotify("Protocol started successfully", "success");
    setActiveTab('IN_PROGRESS');
  };

  const handleStepToggle = (instanceId: string, stepIndex: number, isLastStep: boolean) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      
      const isDone = inst.completedStepIndices.includes(stepIndex);
      
      if (!isDone) {
        // Checking forward: Must do steps in order
        if (stepIndex > 0 && !inst.completedStepIndices.includes(stepIndex - 1)) {
          alert("Please complete the previous step first.");
          return inst;
        }
      } else {
        // Checking backward: Cannot undo if the NEXT step is already done
        const isNextStepDone = inst.completedStepIndices.includes(stepIndex + 1);
        if (isNextStepDone) {
          alert("Cannot undo this step while subsequent steps are marked Done. Undo those first.");
          return inst;
        }
      }
      
      let newIndices;
      if (isDone) {
         newIndices = inst.completedStepIndices.filter(i => i !== stepIndex);
      } else {
         newIndices = [...inst.completedStepIndices, stepIndex];
      }

      const nowDone = !isDone;
      let status: 'ACTIVE' | 'COMPLETED' | 'CANCELED' = inst.status; 
      
      if (inst.status === 'ACTIVE' || inst.status === 'COMPLETED') {
          if (isLastStep && nowDone) {
            status = 'COMPLETED';
          } else {
            status = 'ACTIVE';
          }
      }

      return { ...inst, completedStepIndices: newIndices, status };
    }));
  };

  const handleAnnulProtocol = (instanceId: string) => {
      if (window.confirm("Annul this cow's protocol? She will be marked as canceled.")) {
          setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'CANCELED' } : i));
          onNotify("Cow protocol canceled", "success");
      }
  };

  const handleMarkInstanceDone = (instanceId: string) => {
      if (window.confirm("Mark this specific protocol as Done? It will move to history.")) {
          setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'COMPLETED' } : i));
          onNotify("Protocol marked as done", "success");
      }
  };

  const handleForceCompleteBatch = (batchKey: string) => {
      if (window.confirm("Mark all active cows in this batch as Completed? This will move the batch to history.")) {
          setInstances(prev => {
              const batch = batches.find(b => b.key === batchKey);
              if (!batch) return prev;
              const instanceIds = batch.instances.map(i => i.id);
              return prev.map(i => instanceIds.includes(i.id) && i.status === 'ACTIVE' ? { ...i, status: 'COMPLETED' } : i);
          });
          onNotify("Batch marked as completed", "success");
          setSelectedBatchKey(null);
      }
  };

  const handleUpdateNote = (instanceId: string, note: string) => {
    setInstances(prev => prev.map(inst => 
      inst.id === instanceId ? { ...inst, notes: note } : inst
    ));
  };

  const handleSelectAllFiltered = () => {
    const selectableIds = planningFilteredCows
      .filter(c => !activeCowIds.has(c.id))
      .map(c => c.id);
    setSelectedCowsForProtocol(prev => Array.from(new Set([...prev, ...selectableIds])));
  };

  // --- IMPORT LOGIC ---
  const handleImportList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
                 if (rowStr.includes('ID') || rowStr.includes('PEN')) {
                     headerRowIndex = i;
                     break;
                 }
             }
             const headers = data[headerRowIndex].map(h => String(h).toUpperCase().trim());
             const idIdx = headers.findIndex(h => h === 'ID' || h === 'COW');
             
             if (idIdx >= 0) {
                 const ids: string[] = [];
                 for(let i = headerRowIndex + 1; i < data.length; i++) {
                     const row = data[i];
                     if(row[idIdx]) {
                         const val = String(row[idIdx]).trim();
                         // Filter out cows already in protocol during import
                         if (cows.some(c => c.id === val) && !activeCowIds.has(val)) ids.push(val);
                     }
                 }
                 setSelectedCowsForProtocol(prev => Array.from(new Set([...prev, ...ids])));
                 onNotify(`Selected ${ids.length} valid cows from file.`, "success");
             } else {
                 onNotify("Could not find 'ID' column in file.", "error");
             }
          }
       } catch (err) { onNotify("Error parsing file.", "error"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // --- EDITOR HANDLERS ---
  const openEditor = (protocol?: Protocol) => {
    if (protocol) {
      setEditProtocolId(protocol.id);
      setEditForm({ name: protocol.name, description: protocol.description || '', steps: [...protocol.steps] });
    } else {
      setEditProtocolId(null);
      setEditForm({ name: '', description: '', steps: [] });
    }
    setIsEditing(true);
  };

  const handleSaveProtocol = () => {
    if (!editForm.name) return;
    const now = new Date().toISOString().split('T')[0];
    if (editProtocolId) {
      setProtocols(prev => prev.map(p => p.id === editProtocolId ? { ...p, ...editForm, lastModified: now } : p));
    } else {
      setProtocols(prev => [...prev, { id: `custom-${Date.now()}`, ...editForm, lastModified: now }]);
    }
    setIsEditing(false);
    onNotify("Protocol saved", "success");
  };

  const handleDeleteProtocol = (id: string) => {
     const isUsed = instances.some(i => i.protocolId === id);
     if (isUsed) { alert("Cannot delete this protocol because it is currently used."); return; }
     if (window.confirm("Delete protocol?")) {
         setProtocols(prev => prev.filter(p => p.id !== id));
         if (isEditing && editProtocolId === id) setIsEditing(false);
         onNotify("Protocol deleted", "success");
     }
  }
  
  const handleAddStep = () => setEditForm(prev => ({ ...prev, steps: [...prev.steps, { day: 0, type: 'INJECTION', description: '', product: '' }] }));
  const handleUpdateStep = (index: number, field: keyof ProtocolStep, value: any) => {
    const newSteps = [...editForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditForm(prev => ({ ...prev, steps: newSteps }));
  };
  const handleRemoveStep = (index: number) => setEditForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));


  // --- SUB-COMPONENTS ---

  const renderProtocolEditorModal = () => {
     if(!isEditing) return null;
     return (
        <div className="fixed inset-0 z-[70] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                    <h3 className="font-bold text-xl text-neutral-800">{editProtocolId ? t.edit : t.create}</h3>
                    <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                         <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Name</label>
                         <input className="w-full border border-neutral-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Description</label>
                         <textarea className="w-full border border-neutral-300 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-primary-500 outline-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                         <div className="flex justify-between items-center mb-4">
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">Steps</label>
                            <button onClick={handleAddStep} type="button" className="text-xs flex items-center gap-1 text-primary-600 hover:underline font-bold"><Plus className="w-4 h-4" /> Add Step</button>
                         </div>
                         <div className="space-y-3">
                            {editForm.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-neutral-200 shadow-sm">
                                    <input type="number" className="w-14 text-xs p-2 rounded border border-neutral-200 bg-neutral-50 text-center font-bold" value={step.day} onChange={e => handleUpdateStep(idx, 'day', parseInt(e.target.value))} />
                                    <select className="w-24 text-xs p-2 rounded border border-neutral-200 bg-neutral-50 font-medium" value={step.type} onChange={e => handleUpdateStep(idx, 'type', e.target.value)}>
                                        <option value="INJECTION">INJ</option><option value="AI">AI</option><option value="CHECK">CHK</option><option value="MOVE">MOV</option>
                                    </select>
                                    <input type="text" className="flex-1 text-xs p-2 rounded border border-neutral-200 bg-neutral-50" value={step.description} onChange={e => handleUpdateStep(idx, 'description', e.target.value)} />
                                    <button onClick={() => handleRemoveStep(idx)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
                <div className="p-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50 rounded-b-2xl">
                    <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg font-medium">{t.cancel}</button>
                    <button onClick={handleSaveProtocol} className="px-6 py-2.5 text-sm bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg">{t.save}</button>
                </div>
            </div>
        </div>
     );
  };

  const renderBatchDetailModal = () => {
    if (!selectedBatchKey) return null;
    const batch = batches.find(b => b.key === selectedBatchKey);
    if (!batch) return null;

    const protocolDef = protocols.find(p => p.id === batch.protocolId);
    const steps = (batch.instances[0]?.snapshotSteps || protocolDef?.steps) || [];
    const sortedInstances = [...batch.instances].sort((a,b) => a.cowId.localeCompare(b.cowId));

    return (
      <div className="fixed inset-0 z-[70] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
          
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
             <div>
                <h2 className="text-2xl font-display font-bold text-neutral-800">{batch.protocolName}</h2>
                <div className="flex gap-4 text-sm text-neutral-500 mt-1">
                   <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Started: {formatDate(batch.startDate, dateFormat)}</span>
                   <span className="flex items-center gap-1"><Users className="w-4 h-4"/> Cows: {batch.instances.length}</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
                 {batch.completedCows < batch.totalCows && (
                     <button onClick={() => handleForceCompleteBatch(batch.key)} className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 text-sm font-bold shadow-sm">
                         <Archive className="w-4 h-4" /> Finish Batch
                     </button>
                 )}
                 <button onClick={() => setSelectedBatchKey(null)} className="p-2 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors">
                   <X className="w-6 h-6" />
                 </button>
             </div>
          </div>

          <div className="flex-1 overflow-auto bg-white relative">
             <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 shadow-sm text-xs uppercase tracking-wider text-neutral-500">
                   <tr>
                      <th className="p-2 border-b bg-white border-r w-20 z-30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">PEN</th>
                      <th className="p-2 border-b bg-white border-r w-24 z-30 sticky left-[5rem] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cow ID</th>
                      <th className="p-2 border-b bg-white border-r w-10 min-w-[90px]">Actions</th>
                      {steps.map((step, idx) => {
                        const stepDate = new Date(batch.startDate);
                        stepDate.setDate(stepDate.getDate() + step.day);
                        const displayDesc = step.description.replace(/\s*\(.*?\)\s*/g, '').trim();
                        return (
                            <th key={idx} className="p-2 border-b bg-white border-r min-w-[140px]">
                                <div className="font-bold text-neutral-800 flex flex-col">
                                    <span>Day {step.day}</span>
                                    <span className="text-[10px] text-primary-600 bg-primary-50 px-1 rounded w-fit">{formatDate(stepDate.toISOString().split('T')[0], dateFormat)}</span>
                                </div>
                                <div className="text-[10px] font-bold text-neutral-600 mt-0.5">{displayDesc}</div>
                            </th>
                        );
                      })}
                      <th className="p-2 border-b bg-white min-w-[200px]">Observations</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                   {sortedInstances.map(inst => {
                      const cow = cows.find(c => c.id === inst.cowId);
                      const isCanceled = inst.status === 'CANCELED';
                      return (
                        <tr key={inst.id} className={`hover:bg-neutral-50 transition-colors group ${isCanceled ? 'opacity-50 bg-neutral-50' : ''}`}>
                           <td className="p-1.5 border-r font-mono text-neutral-500 bg-white group-hover:bg-neutral-50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center">{cow?.pen || '-'}</td>
                           <td className={`p-1.5 border-r font-mono font-bold text-primary-700 bg-white group-hover:bg-neutral-50 sticky left-[5rem] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isCanceled ? 'line-through text-neutral-400' : ''}`}>{inst.cowId}</td>
                           <td className="p-1.5 border-r text-center">
                               <div className="flex justify-center gap-1">
                                   <button 
                                     onClick={() => handleAnnulProtocol(inst.id)} 
                                     className="text-neutral-300 hover:text-red-500 p-1" 
                                     title="Annul (Cancel) Protocol"
                                     disabled={isCanceled}
                                   >
                                       <Ban className="w-3.5 h-3.5" />
                                   </button>
                                   <button 
                                     onClick={() => handleMarkInstanceDone(inst.id)} 
                                     className="text-neutral-300 hover:text-green-600 p-1" 
                                     title="Mark Done"
                                     disabled={isCanceled || inst.status === 'COMPLETED'}
                                   >
                                       <Check className="w-3.5 h-3.5" />
                                   </button>
                               </div>
                           </td>
                           {steps.map((step, idx) => {
                             const isDone = inst.completedStepIndices.includes(idx);
                             const isPrevDone = idx === 0 || inst.completedStepIndices.includes(idx - 1);
                             const isNextStepDone = inst.completedStepIndices.includes(idx + 1);
                             
                             return (
                               <td key={idx} className="p-1 border-r text-center">
                                  <button 
                                    onClick={() => handleStepToggle(inst.id, idx, idx === steps.length - 1)}
                                    disabled={(!isPrevDone && !isDone) || (isDone && isNextStepDone) || isCanceled}
                                    className={`w-full py-1.5 rounded-md border flex items-center justify-center gap-1.5 transition-all text-[10px] ${
                                      isDone 
                                      ? 'bg-green-100 border-green-200 text-green-700 font-bold' 
                                      : (!isPrevDone ? 'bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed' : 'bg-white border-neutral-200 text-neutral-400 hover:border-primary-300 hover:text-primary-600')
                                    }`}
                                  >
                                    {isDone ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-current"></div>}
                                    {isDone ? 'Done' : 'Mark'}
                                  </button>
                               </td>
                             );
                           })}
                           <td className="p-1">
                              <div className="flex items-center gap-2 px-2">
                                <MessageSquare className="w-3 h-3 text-neutral-300" />
                                <input 
                                  type="text" 
                                  placeholder="Add remark..." 
                                  className="w-full bg-transparent border-b border-transparent focus:border-primary-500 outline-none text-[11px] placeholder-neutral-300 hover:border-neutral-200 transition-colors py-0.5"
                                  value={inst.notes || ''}
                                  onChange={(e) => handleUpdateNote(inst.id, e.target.value)}
                                  disabled={isCanceled}
                                />
                              </div>
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {renderBatchDetailModal()}
      {renderProtocolEditorModal()}

      <div className="p-4 flex justify-center bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="flex bg-neutral-100 p-1 rounded-lg">
           <button onClick={() => setActiveTab('SETUP')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'SETUP' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
             <ListTodo className="w-3.5 h-3.5" /> Set up
           </button>
           <button onClick={() => setActiveTab('PLANNING')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'PLANNING' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
             <Plus className="w-3.5 h-3.5" /> {t.tabs.planning}
           </button>
           <button onClick={() => setActiveTab('IN_PROGRESS')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'IN_PROGRESS' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
             <Users className="w-3.5 h-3.5" /> {t.tabs.inProgress}
             {activeBatches.length > 0 && <span className="bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{activeBatches.length}</span>}
           </button>
           <button onClick={() => setActiveTab('COMPLETED')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'COMPLETED' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
             <CheckCircle className="w-3.5 h-3.5" /> {t.tabs.completed}
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        
        {activeTab === 'SETUP' && (
          <div className="h-full max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-full">
               <div className="p-4 bg-neutral-50 border-b border-neutral-100 font-bold text-neutral-700 flex justify-between items-center">
                 <span className="uppercase text-xs tracking-wider">Available Protocols</span>
                 <button onClick={() => openEditor()} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 flex items-center gap-1 shadow-sm font-medium transition-transform active:scale-95">
                     <Plus className="w-3 h-3" /> {t.create}
                 </button>
               </div>
               <ul className="divide-y divide-neutral-100 overflow-y-auto flex-1">
                 {protocols.map(p => (
                   <li key={p.id} className="p-5 hover:bg-neutral-50 group transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-primary-700 text-lg">{p.name}</span>
                                <span className="text-xs text-neutral-400 font-mono bg-neutral-100 px-2 py-1 rounded">{p.steps.length} {t.steps}</span>
                            </div>
                            <p className="text-sm text-neutral-500 mt-1">{p.description}</p>
                        </div>
                       <div className="flex items-center gap-2">
                           <button onClick={() => openEditor(p)} className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-white rounded-full border border-transparent hover:border-neutral-200 transition-all"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => handleDeleteProtocol(p.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-white rounded-full border border-transparent hover:border-neutral-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {p.steps.map((s, i) => (
                           <div key={i} className="flex-shrink-0 bg-white rounded px-2 py-1 text-xs border border-neutral-200 whitespace-nowrap shadow-sm text-neutral-600">
                              <span className="font-bold text-neutral-800">D{s.day}:</span> {s.type}
                           </div>
                        ))}
                     </div>
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        )}

        {activeTab === 'PLANNING' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto">
             <div className="flex-1 bg-white rounded-2xl shadow-sm border border-neutral-200 flex flex-col overflow-hidden min-h-[500px]">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100 space-y-4">
                   <div className="flex justify-between items-center">
                        <h3 className="font-bold text-neutral-700 uppercase text-xs tracking-wider">Step 1: Select Cows</h3>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-white bg-primary-600 font-bold px-2 py-1 rounded-full shadow-sm">{selectedCowsForProtocol.length} selected</span>
                             {selectedCowsForProtocol.length > 0 && (
                               <button onClick={handleUnselectAll} className="text-xs text-red-600 hover:underline flex items-center gap-1"><X className="w-3 h-3" /> Unselect All</button>
                             )}
                             {planningFilteredCows.length > 0 && (
                               <button onClick={handleSelectAllFiltered} className="text-xs text-primary-600 hover:underline">Select All Valid</button>
                             )}
                        </div>
                   </div>

                   <div className="grid grid-cols-12 gap-2">
                       <div className="col-span-4 relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                            <input type="text" placeholder="Search ID..." className="w-full pl-8 pr-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={cowSearch} onChange={(e) => setCowSearch(e.target.value)} />
                       </div>
                       <div className="col-span-2">
                            <input type="text" placeholder="Pen" className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={filterPen} onChange={(e) => setFilterPen(e.target.value)} />
                       </div>
                       <div className="col-span-2">
                            <select className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={filterRpro} onChange={(e) => setFilterRpro(e.target.value)}>
                                <option value="">Status: All</option>
                                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                       </div>
                       <div className="col-span-4 flex gap-2">
                            <button onClick={handleResetFilters} className="text-xs bg-neutral-100 border border-neutral-200 text-neutral-600 px-2 py-1.5 rounded-lg hover:bg-neutral-200 flex items-center justify-center gap-1 font-medium transition-colors">
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                            <label className="flex-1 text-xs bg-white border border-neutral-300 text-neutral-600 px-2 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center justify-center gap-1 font-medium cursor-pointer">
                                <Upload className="w-3 h-3" /> Import
                                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleImportList} />
                            </label>
                       </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-neutral-50/30">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                     {planningFilteredCows.map(cow => {
                        const isInProtocol = activeCowIds.has(cow.id);
                        return (
                          <div 
                            key={cow.id} 
                            onClick={() => {
                              if (isInProtocol) return;
                              setSelectedCowsForProtocol(prev => prev.includes(cow.id) ? prev.filter(id => id !== cow.id) : [...prev, cow.id]);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all border ${
                              isInProtocol ? 'bg-neutral-100 border-neutral-200 cursor-not-allowed opacity-70' :
                              selectedCowsForProtocol.includes(cow.id) ? 'bg-primary-50 border-primary-200 shadow-sm cursor-pointer' : 
                              'bg-white border-transparent hover:border-neutral-200 cursor-pointer'
                            }`}
                          >
                             <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                               isInProtocol ? 'bg-neutral-300 text-white' :
                               selectedCowsForProtocol.includes(cow.id) ? 'bg-primary-600 text-white' : 
                               'bg-neutral-200 text-transparent'
                             }`}>
                               <CheckCircle className="w-3 h-3" />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="font-mono font-bold text-neutral-700">{cow.id}</div>
                                  {isInProtocol && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight">Active Protocol</span>}
                                </div>
                                <div className="text-[10px] text-neutral-400">Pen {cow.pen} • {cow.reproStatus} • {cow.daysInMilk} DIM</div>
                             </div>
                          </div>
                        );
                     })}
                   </div>
                   {planningFilteredCows.length === 0 && <div className="p-8 text-center text-neutral-400 italic">No cows found.</div>}
                </div>
             </div>

             <div className="w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 flex flex-col gap-6 h-fit sticky top-24">
                  <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">Step 2: Config</h3>
                  <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1">Select Protocol</label>
                        <select className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white" value={selectedProtocolId} onChange={(e) => setSelectedProtocolId(e.target.value)}>
                            <option value="">-- Choose Protocol --</option>
                            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold text-neutral-500 mb-1">Start Date</label><input type="date" className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1">Manager</label>
                        <select className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
                            <option value="">-- Choose Staff --</option>
                            {availableManagers.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-1">Inseminator</label>
                        <select className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white" value={selectedInseminator} onChange={(e) => setSelectedInseminator(e.target.value)}>
                            <option value="">-- Choose Inseminator --</option>
                            {availableInseminators.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                    </div>
                  </div>
                  <button onClick={handleStartProtocol} disabled={!selectedProtocolId || selectedCowsForProtocol.length === 0 || !selectedManager || !selectedInseminator} className="w-full bg-primary-600 disabled:bg-neutral-100 disabled:text-neutral-400 text-white py-3 rounded-xl font-bold shadow-md hover:bg-primary-700 transition-all mt-4">
                     {t.startProtocol} ({selectedCowsForProtocol.length})
                   </button>
             </div>
          </div>
        )}

        {activeTab === 'IN_PROGRESS' && (
           <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden max-w-7xl mx-auto">
              <table className="w-full text-left text-sm">
                 <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-xs">
                    <tr>
                       <th className="p-4 pl-6">Protocol Name</th>
                       <th className="p-4">Start Date</th>
                       <th className="p-4">Cows</th>
                       <th className="p-4">Manager</th>
                       <th className="p-4">Progress</th>
                       <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-neutral-100">
                    {activeBatches.map((batch) => (
                       <tr key={batch.key} onClick={() => setSelectedBatchKey(batch.key)} className="hover:bg-neutral-50 transition-colors cursor-pointer group">
                          <td className="p-4 pl-6 font-bold text-neutral-800">{batch.protocolName}</td>
                          <td className="p-4 text-neutral-600 font-mono">{formatDate(batch.startDate, dateFormat)}</td>
                          <td className="p-4"><span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-mono font-bold">{batch.totalCows}</span></td>
                          <td className="p-4 text-neutral-600">{batch.manager}</td>
                          <td className="p-4"><div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${(batch.completedCows / batch.totalCows) * 100}%` }}></div></div></td>
                          <td className="p-4 text-right pr-6"><button className="text-primary-600 hover:text-primary-800 font-bold text-xs bg-primary-50 px-3 py-1.5 rounded-lg group-hover:bg-primary-100 transition-colors">View Details</button></td>
                       </tr>
                    ))}
                    {activeBatches.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-neutral-400 italic">No active protocols. Go to Planning to start one.</td></tr>}
                 </tbody>
              </table>
           </div>
        )}

        {activeTab === 'COMPLETED' && (
           <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden max-w-7xl mx-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-xs">
                     <tr>
                        <th className="p-4 pl-6">Protocol Name</th>
                        <th className="p-4">Start Date</th>
                        <th className="p-4">Cows (Ready for AI)</th>
                        <th className="p-4">Manager</th>
                        <th className="p-4 text-right pr-6">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                     {completedBatches.map((batch) => (
                        <tr key={batch.key} onClick={() => setSelectedBatchKey(batch.key)} className="hover:bg-neutral-50 transition-colors cursor-pointer">
                           <td className="p-4 pl-6 font-bold text-neutral-800">{batch.protocolName}</td>
                           <td className="p-4 text-neutral-600 font-mono">{formatDate(batch.startDate, dateFormat)}</td>
                           <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded font-mono font-bold">{batch.totalCows}</span></td>
                           <td className="p-4 text-neutral-600">{batch.manager}</td>
                           <td className="p-4 text-right pr-6"><Eye className="w-5 h-5 text-neutral-400 hover:text-primary-600 inline-block" /></td>
                        </tr>
                     ))}
                     {completedBatches.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-neutral-400 italic">No completed history available.</td></tr>}
                  </tbody>
               </table>
           </div>
        )}
      </div>
    </div>
  );
};

export default ActionLists;
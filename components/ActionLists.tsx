import React, { useState } from 'react';
import { Cow, Protocol, ProtocolInstance, ProtocolStep } from '../types';
import { CalendarClock, Users, CheckCircle, ListTodo, Plus, ChevronRight, User, Edit2, Save, Trash2, X, Upload, TestTube2 } from 'lucide-react';
import { translations, formatDate, Language, DateFormat } from '../utils/helpers';

interface ActionListsProps {
  cows: Cow[];
  protocols: Protocol[];
  setProtocols: React.Dispatch<React.SetStateAction<Protocol[]>>;
  instances: ProtocolInstance[];
  setInstances: React.Dispatch<React.SetStateAction<ProtocolInstance[]>>;
  onSelectCow: (id: string) => void;
  language: Language;
  dateFormat: DateFormat;
}

type Tab = 'DEFINITIONS' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';

const ActionLists: React.FC<ActionListsProps> = ({ 
  cows, 
  protocols, 
  setProtocols,
  instances,
  setInstances,
  onSelectCow,
  language,
  dateFormat
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('PLANNING');
  const t = translations[language].protocols;
  
  // Planning State
  const [selectedCowsForProtocol, setSelectedCowsForProtocol] = useState<string[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');

  // Protocol Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editProtocolId, setEditProtocolId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, description: string, steps: ProtocolStep[]}>({
    name: '',
    description: '',
    steps: []
  });
  
  const handleStartProtocol = () => {
    if (!selectedProtocolId || selectedCowsForProtocol.length === 0 || !selectedManager) return;

    const protocolDefinition = protocols.find(p => p.id === selectedProtocolId);
    if (!protocolDefinition) return;

    const newInstances: ProtocolInstance[] = selectedCowsForProtocol.map(cowId => {
      const cow = cows.find(c => c.id === cowId);
      // Mock logic: Pen 1 & 2 -> Inseminator A, others -> B
      const inseminator = (cow?.pen || 0) <= 2 ? 'Inseminator A' : 'Inseminator B';

      return {
        id: Date.now().toString() + cowId,
        cowId,
        protocolId: selectedProtocolId,
        startDate: new Date().toISOString().split('T')[0],
        manager: selectedManager,
        inseminator,
        status: 'ACTIVE',
        completedStepIndices: [],
        snapshotSteps: [...protocolDefinition.steps] 
      };
    });

    setInstances([...instances, ...newInstances]);
    setSelectedCowsForProtocol([]);
    setSelectedProtocolId('');
    setActiveTab('IN_PROGRESS');
  };

  const handleStepComplete = (instanceId: string, stepIndex: number, isLastStep: boolean) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      
      const newIndices = [...inst.completedStepIndices, stepIndex];
      let status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE';

      if (isLastStep) {
        status = 'COMPLETED';
      }

      return { ...inst, completedStepIndices: newIndices, status };
    }));
  };

  // --- EDITOR FUNCTIONS ---
  const openEditor = (protocol?: Protocol) => {
    if (protocol) {
      setEditProtocolId(protocol.id);
      setEditForm({
        name: protocol.name,
        description: protocol.description || '',
        steps: [...protocol.steps]
      });
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
      setProtocols(prev => prev.map(p => p.id === editProtocolId ? {
        ...p,
        name: editForm.name,
        description: editForm.description,
        steps: editForm.steps,
        lastModified: now
      } : p));
    } else {
      const newProto: Protocol = {
        id: `custom-${Date.now()}`,
        name: editForm.name,
        description: editForm.description,
        steps: editForm.steps,
        lastModified: now
      };
      setProtocols(prev => [...prev, newProto]);
    }
    setIsEditing(false);
  };

  const handleAddStep = () => {
    setEditForm(prev => ({
      ...prev,
      steps: [...prev.steps, { day: 0, type: 'INJECTION', description: '', product: '' }]
    }));
  };

  const handleUpdateStep = (index: number, field: keyof ProtocolStep, value: any) => {
    const newSteps = [...editForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditForm(prev => ({ ...prev, steps: newSteps }));
  };

  const handleRemoveStep = (index: number) => {
    setEditForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  const handleImportList = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .xls';
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        setTimeout(() => {
            const mockImportedIds = cows.slice(0, 15).map(c => c.id); 
            setSelectedCowsForProtocol(prev => Array.from(new Set([...prev, ...mockImportedIds])));
            alert(`Imported ${mockImportedIds.length} cows from file.`);
        }, 800);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header & Tabs */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-display font-bold text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                <CalendarClock className="w-6 h-6" />
            </div>
            {t.title}
          </h2>
          <p className="text-neutral-500 mt-1 ml-11">{t.subtitle}</p>
        </div>
        <div className="flex px-6 gap-6 overflow-x-auto">
           <button 
             onClick={() => setActiveTab('DEFINITIONS')}
             className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'DEFINITIONS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
           >
             <ListTodo className="w-4 h-4" /> {t.tabs.definitions}
           </button>
           <button 
             onClick={() => setActiveTab('PLANNING')}
             className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'PLANNING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
           >
             <Plus className="w-4 h-4" /> {t.tabs.planning}
           </button>
           <button 
             onClick={() => setActiveTab('IN_PROGRESS')}
             className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'IN_PROGRESS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
           >
             <Users className="w-4 h-4" /> {t.tabs.inProgress}
             {instances.filter(i => i.status === 'ACTIVE').length > 0 && 
               <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">{instances.filter(i => i.status === 'ACTIVE').length}</span>
             }
           </button>
           <button 
             onClick={() => setActiveTab('COMPLETED')}
             className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'COMPLETED' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
           >
             <CheckCircle className="w-4 h-4" /> {t.tabs.completed}
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        
        {/* === DEFINITIONS TAB === */}
        {activeTab === 'DEFINITIONS' && (
          <div className="flex flex-col lg:flex-row gap-8 h-full max-w-7xl mx-auto">
            {/* List */}
            <div className={`${isEditing ? 'w-1/3 hidden lg:block' : 'w-full lg:w-1/2'} bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col`}>
               <div className="p-4 bg-neutral-50 border-b border-neutral-100 font-bold text-neutral-700 flex justify-between items-center">
                 <span className="uppercase text-xs tracking-wider">Available Protocols</span>
                 {!isEditing && (
                    <button onClick={() => openEditor()} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 flex items-center gap-1 shadow-sm font-medium transition-transform active:scale-95">
                        <Plus className="w-3 h-3" /> {t.create}
                    </button>
                 )}
               </div>
               <ul className="divide-y divide-neutral-100 overflow-y-auto flex-1">
                 {protocols.map(p => (
                   <li key={p.id} className="p-5 hover:bg-neutral-50 group transition-colors">
                     <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-primary-700 text-lg">{p.name}</span>
                       <div className="flex items-center gap-2">
                           <span className="text-xs text-neutral-400 font-mono bg-neutral-100 px-2 py-1 rounded">{p.steps.length} {t.steps}</span>
                           <button onClick={() => openEditor(p)} className="p-1 text-neutral-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Edit2 className="w-4 h-4" />
                           </button>
                       </div>
                     </div>
                     <p className="text-sm text-neutral-500 mb-3">{p.description}</p>
                     {p.lastModified && (
                        <div className="text-[10px] text-neutral-400 mb-3 font-mono inline-block">
                            {t.lastMod} {formatDate(p.lastModified, dateFormat)}
                        </div>
                     )}
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

            {/* Editor */}
            {isEditing ? (
                <div className="flex-1 bg-white rounded-2xl shadow-xl border border-neutral-200 p-8 flex flex-col animate-in slide-in-from-right-4 ring-1 ring-black/5">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100">
                        <h3 className="font-bold text-xl text-neutral-800">{editProtocolId ? t.edit : t.create}</h3>
                        <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-6 h-6"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Protocol Name</label>
                                <input 
                                    className="w-full border border-neutral-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                                    value={editForm.name}
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    placeholder="e.g. Heifer Sync"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Description</label>
                                <textarea 
                                    className="w-full border border-neutral-300 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-primary-500 outline-none" 
                                    value={editForm.description}
                                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">Steps Sequence</label>
                                <button onClick={handleAddStep} type="button" className="text-xs flex items-center gap-1 text-primary-600 hover:underline font-bold">
                                    <PlusCircleMini className="w-4 h-4" /> Add Step
                                </button>
                            </div>
                            <div className="space-y-3">
                                {editForm.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
                                        <div className="w-20">
                                            <span className="text-[10px] text-neutral-400 block font-bold mb-1">Day</span>
                                            <input 
                                                type="number" 
                                                className="w-full text-xs p-2 rounded border border-neutral-200 bg-neutral-50 text-center font-bold" 
                                                value={step.day}
                                                onChange={e => handleUpdateStep(idx, 'day', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <span className="text-[10px] text-neutral-400 block font-bold mb-1">Type</span>
                                            <select 
                                                className="w-full text-xs p-2 rounded border border-neutral-200 bg-neutral-50 font-medium"
                                                value={step.type}
                                                onChange={e => handleUpdateStep(idx, 'type', e.target.value)}
                                            >
                                                <option value="INJECTION">INJECTION</option>
                                                <option value="AI">AI</option>
                                                <option value="CHECK">CHECK</option>
                                                <option value="MOVE">MOVE</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[10px] text-neutral-400 block font-bold mb-1">Description / Product</span>
                                            <input 
                                                type="text" 
                                                className="w-full text-xs p-2 rounded border border-neutral-200 bg-neutral-50"
                                                value={step.description}
                                                onChange={e => handleUpdateStep(idx, 'description', e.target.value)}
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveStep(idx)} className="text-red-400 hover:text-red-600 p-2 mt-4 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {editForm.steps.length === 0 && (
                                    <div className="text-center py-8 text-sm text-neutral-400 italic border-2 border-dashed border-neutral-200 rounded-xl">
                                        No steps defined. Add a step to begin.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3 mt-4">
                        <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium transition-colors">
                            {t.cancel}
                        </button>
                        <button onClick={handleSaveProtocol} className="px-6 py-2.5 text-sm bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 shadow-lg shadow-primary-900/10 transition-transform active:scale-95">
                            <Save className="w-4 h-4" /> {t.save}
                        </button>
                    </div>
                </div>
            ) : (
                 <div className="hidden lg:flex w-1/2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 flex-col items-center justify-center text-neutral-400 border-dashed">
                    <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                        <Plus className="w-10 h-10 opacity-20 text-neutral-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-600 mb-2 font-display">Create or Edit Protocol</h3>
                    <p className="max-w-xs text-center text-neutral-400">Select a protocol from the left to edit, or click below to start fresh.</p>
                    <button onClick={() => openEditor()} className="mt-8 bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-900/10">
                        Create New Protocol
                    </button>
                </div>
            )}
          </div>
        )}

        {/* === PLANNING TAB === */}
        {activeTab === 'PLANNING' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 flex flex-col lg:flex-row h-full overflow-hidden max-w-7xl mx-auto">
             {/* Cow Selection */}
             <div className="flex-1 border-r border-neutral-200 flex flex-col">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                   <h3 className="font-bold text-neutral-700 uppercase text-xs tracking-wider">{t.selectCows}</h3>
                   <div className="flex gap-2">
                        <button 
                            onClick={handleImportList}
                            className="text-xs bg-white border border-neutral-300 text-neutral-600 px-3 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center gap-1 shadow-sm font-medium transition-colors"
                        >
                            <Upload className="w-3 h-3" /> {t.importList}
                        </button>
                        <span className="text-xs text-white bg-primary-600 font-bold px-2 py-1 rounded-full flex items-center shadow-sm">{selectedCowsForProtocol.length}</span>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 bg-neutral-50/30">
                   {cows.filter(c => c.reproStatus === 'OPEN').map(cow => (
                      <div 
                        key={cow.id} 
                        onClick={() => {
                           if (selectedCowsForProtocol.includes(cow.id)) {
                             setSelectedCowsForProtocol(prev => prev.filter(id => id !== cow.id));
                           } else {
                             setSelectedCowsForProtocol(prev => [...prev, cow.id]);
                           }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-2 transition-all duration-200 border ${selectedCowsForProtocol.includes(cow.id) ? 'bg-primary-50 border-primary-200 shadow-sm' : 'bg-white border-transparent hover:border-neutral-200'}`}
                      >
                         <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${selectedCowsForProtocol.includes(cow.id) ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-transparent'}`}>
                            <CheckCircle className="w-3.5 h-3.5" />
                         </div>
                         <div>
                            <div className="font-mono font-bold text-neutral-700 text-lg leading-none">{cow.id}</div>
                            <div className="text-xs text-neutral-400 mt-1">Pen {cow.pen} | {cow.daysInMilk} DIM</div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Configuration */}
             <div className="w-full lg:w-96 bg-neutral-50 p-8 flex flex-col gap-8 border-l border-neutral-100">
                <div>
                  <h3 className="font-bold text-neutral-800 mb-6 text-lg">{t.configuration}</h3>
                  
                  <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">Select Protocol</label>
                        <select 
                            className="w-full border border-neutral-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
                            value={selectedProtocolId}
                            onChange={(e) => setSelectedProtocolId(e.target.value)}
                        >
                            <option value="">-- Choose Protocol --</option>
                            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">Assign Manager</label>
                        <select 
                            className="w-full border border-neutral-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                        >
                            <option value="">-- Choose Staff --</option>
                            <option value="John Doe">John Doe</option>
                            <option value="Jane Smith">Jane Smith</option>
                        </select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 border border-blue-100 mt-6 leading-relaxed">
                     <strong className="block mb-1 font-bold">Auto-Assignment:</strong>
                     Inseminators will be automatically assigned based on cow pen numbers upon scheduling.
                  </div>
                </div>

                <div className="mt-auto">
                   <button 
                     onClick={handleStartProtocol}
                     disabled={!selectedProtocolId || selectedCowsForProtocol.length === 0 || !selectedManager}
                     className="w-full bg-primary-600 disabled:bg-neutral-300 disabled:text-neutral-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary-900/10 hover:bg-primary-700 transition-all active:scale-95"
                   >
                     {t.startProtocol} <span className="opacity-80 font-normal">({selectedCowsForProtocol.length} cows)</span>
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* === IN PROGRESS TAB === */}
        {activeTab === 'IN_PROGRESS' && (
           <div className="space-y-4 max-w-4xl mx-auto">
              {instances.filter(i => i.status === 'ACTIVE').map(instance => {
                 const protocolDefinition = protocols.find(p => p.id === instance.protocolId);
                 const cow = cows.find(c => c.id === instance.cowId);
                 if (!protocolDefinition || !cow) return null;

                 const activeSteps = instance.snapshotSteps || protocolDefinition.steps;

                 return (
                    <div key={instance.id} className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                       <div className="flex justify-between items-start border-b border-neutral-100 pb-5 mb-5">
                          <div className="flex items-center gap-5">
                             <div className="bg-primary-50 text-primary-700 p-3 rounded-xl font-mono font-bold text-xl border border-primary-100">{cow.id}</div>
                             <div>
                                <h3 className="font-bold text-neutral-800 text-lg">{protocolDefinition.name}</h3>
                                <div className="text-xs text-neutral-500 flex gap-4 mt-1.5">
                                   <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Mgr: <span className="font-medium text-neutral-700">{instance.manager}</span></span>
                                   <span className="flex items-center gap-1.5"><TestTube2 className="w-3.5 h-3.5" /> Tech: <span className="font-medium text-neutral-700">{instance.inseminator}</span></span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold mb-1">Started</div>
                             <div className="font-mono text-sm text-neutral-700 font-medium bg-neutral-100 px-2 py-1 rounded">{formatDate(instance.startDate, dateFormat)}</div>
                          </div>
                       </div>

                       {/* Steps Timeline */}
                       <div className="flex gap-3 overflow-x-auto pb-2">
                          {activeSteps.map((step, idx) => {
                             const isCompleted = instance.completedStepIndices.includes(idx);
                             const isNext = !isCompleted && (idx === 0 || instance.completedStepIndices.includes(idx - 1));

                             return (
                                <div 
                                  key={idx} 
                                  className={`flex-shrink-0 w-44 p-4 rounded-xl border text-xs relative transition-all ${
                                     isCompleted ? 'bg-green-50 border-green-200' : 
                                     isNext ? 'bg-white border-primary-500 ring-2 ring-primary-500/20 shadow-lg' : 
                                     'bg-neutral-50 border-neutral-200 opacity-60 grayscale'
                                  }`}
                                >
                                   <div className="font-bold mb-2 flex justify-between text-sm">
                                      Day {step.day}
                                      {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                                   </div>
                                   <div className="text-neutral-800 font-bold mb-1">{step.type}</div>
                                   <div className="text-neutral-500 mb-3 truncate font-medium" title={step.description}>{step.description}</div>
                                   
                                   {isNext && (
                                      <button 
                                        onClick={() => handleStepComplete(instance.id, idx, idx === activeSteps.length - 1)}
                                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-center font-bold shadow-sm transition-colors"
                                      >
                                         {t.markDone}
                                      </button>
                                   )}
                                </div>
                             )
                          })}
                       </div>
                    </div>
                 );
              })}
              {instances.filter(i => i.status === 'ACTIVE').length === 0 && (
                 <div className="text-center py-16 text-neutral-400 bg-white rounded-2xl border border-dashed border-neutral-200">
                    <p>No active protocols.</p>
                    <button onClick={() => setActiveTab('PLANNING')} className="text-primary-600 font-bold mt-2 hover:underline">Go to Planning</button>
                 </div>
              )}
           </div>
        )}

        {/* === COMPLETED TAB === */}
        {activeTab === 'COMPLETED' && (
           <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden max-w-7xl mx-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                     <tr>
                        <th className="p-5">Cow ID</th>
                        <th className="p-5">Protocol</th>
                        <th className="p-5">Date Started</th>
                        <th className="p-5">Manager</th>
                        <th className="p-5">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                     {instances.filter(i => i.status === 'COMPLETED').map(inst => (
                        <tr key={inst.id} className="hover:bg-neutral-50 transition-colors">
                           <td className="p-5 font-mono font-bold text-primary-700">{inst.cowId}</td>
                           <td className="p-5 font-medium text-neutral-800">{protocols.find(p => p.id === inst.protocolId)?.name}</td>
                           <td className="p-5 text-neutral-500 font-mono">{formatDate(inst.startDate, dateFormat)}</td>
                           <td className="p-5 text-neutral-600">{inst.manager}</td>
                           <td className="p-5">
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                 Ready for AI / Bred
                              </span>
                           </td>
                        </tr>
                     ))}
                     {instances.filter(i => i.status === 'COMPLETED').length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-neutral-400 italic">No history available.</td></tr>
                     )}
                  </tbody>
               </table>
           </div>
        )}

      </div>
    </div>
  );
};

function PlusCircleMini({className}: {className?: string}) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
    )
}

export default ActionLists;
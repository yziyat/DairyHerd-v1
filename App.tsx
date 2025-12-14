import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CowList from './components/CowList';
import CowDetail from './components/CowDetail';
import ActionLists from './components/ActionLists';
import { initialCows, initialEvents } from './data/mockData';
import { Cow, CowEvent, Protocol, ProtocolInstance } from './types';
import { LayoutDashboard, ClipboardList, Syringe, TestTube2, Settings, Users, ArrowRight, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { translations, Language, DateFormat } from './utils/helpers';

// Seed Protocols
const initialProtocols: Protocol[] = [
  {
    id: 'ovsynch',
    name: 'Ovsynch Standard',
    description: 'GnRH -> 7d -> PGF -> 2d -> GnRH -> 16h -> AI',
    steps: [
      { day: 0, type: 'INJECTION', description: 'GnRH Injection', product: 'Cystorelin' },
      { day: 7, type: 'INJECTION', description: 'PGF Injection', product: 'Lutalyse' },
      { day: 9, type: 'INJECTION', description: 'GnRH Injection', product: 'Cystorelin' },
      { day: 10, type: 'AI', description: 'Timed AI', product: 'Semen' }
    ]
  },
  {
    id: 'presynch',
    name: 'Presynch-Ovsynch',
    description: 'PGF -> 14d -> PGF -> 12d -> Ovsynch',
    steps: [
      { day: 0, type: 'INJECTION', description: 'PGF 1', product: 'Lutalyse' },
      { day: 14, type: 'INJECTION', description: 'PGF 2', product: 'Lutalyse' },
      { day: 26, type: 'INJECTION', description: 'GnRH 1 (Start Ovsynch)', product: 'Cystorelin' },
      { day: 33, type: 'INJECTION', description: 'PGF 3', product: 'Lutalyse' },
      { day: 35, type: 'INJECTION', description: 'GnRH 2', product: 'Cystorelin' },
      { day: 36, type: 'AI', description: 'Timed AI', product: 'Semen' }
    ]
  }
];

export default function App() {
  const [cows, setCows] = useState<Cow[]>(initialCows);
  const [events, setEvents] = useState<CowEvent[]>(initialEvents);
  const [protocols, setProtocols] = useState<Protocol[]>(initialProtocols);
  const [protocolInstances, setProtocolInstances] = useState<ProtocolInstance[]>([]);
  
  const [selectedCowId, setSelectedCowId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'HOME' | 'HERD' | 'PROTOCOLS' | 'REPORTS' | 'INSEMINATION' | 'SETTINGS' | 'USERS'>('HOME');

  // Settings State with Persistence
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('dh_language') as Language) || 'EN';
  });
  
  const [dateFormat, setDateFormat] = useState<DateFormat>(() => {
    return (localStorage.getItem('dh_dateFormat') as DateFormat) || 'EU';
  });

  useEffect(() => {
    localStorage.setItem('dh_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('dh_dateFormat', dateFormat);
  }, [dateFormat]);

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const t = translations[language].dashboard;

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleSelectCow = (id: string) => {
    setSelectedCowId(id);
  };

  const handleCloseDetail = () => {
    setSelectedCowId(null);
  };

  const handleAddEvent = (newEvent: CowEvent) => {
    setEvents(prev => [...prev, newEvent]);
    
    setCows(prev => prev.map(cow => {
      if (cow.id !== newEvent.cowId) return cow;

      let newStatus = cow.reproStatus;
      if (newEvent.type === 'BREED') newStatus = 'BRED';
      if (newEvent.type === 'PREG_CHECK' && newEvent.details.toLowerCase().includes('pregnant')) newStatus = 'PREG';
      if (newEvent.type === 'PREG_CHECK' && newEvent.details.toLowerCase().includes('open')) newStatus = 'OPEN';
      if (newEvent.type === 'CALVING') newStatus = 'FRESH';
      if (newEvent.type === 'DRY_OFF') newStatus = 'DRY';

      return { ...cow, reproStatus: newStatus };
    }));
    showNotification("Event added successfully");
  };

  const handleSearch = (id: string) => {
    const found = cows.find(c => c.id === id);
    if (found) {
      setSelectedCowId(id);
      // Ensure we are on a view where selecting makes sense, or just rely on modal
    } else {
      showNotification(`Cow ${id} not found.`, 'error');
    }
  };

  const handleImportCows = (newCows: Cow[]) => {
    setCows(newCows);
    showNotification(`Successfully imported ${newCows.length} records.`);
  };

  const selectedCow = cows.find(c => c.id === selectedCowId);
  const selectedCowEvents = events.filter(e => e.cowId === selectedCowId);

  // Dashboard Component
  const Dashboard = () => (
    <div className="flex-1 p-6 flex flex-col h-full overflow-hidden">
      <h1 className="text-2xl font-display font-bold text-neutral-800 mb-4 flex-shrink-0">{t.title}</h1>
      
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 auto-rows-min overflow-y-auto pb-4">
        
        {/* Herd Status Card */}
        <div 
          onClick={() => setCurrentView('HERD')}
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-lg text-primary-600 shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.herdCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.herdSubtitle}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 transition-colors shrink-0" />
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-50">
            <span className="bg-green-100 text-green-700 text-[10px] uppercase px-2 py-1 rounded font-bold">{cows.filter(c => c.reproStatus === 'PREG').length} PREG</span>
            <span className="bg-red-100 text-red-700 text-[10px] uppercase px-2 py-1 rounded font-bold">{cows.filter(c => c.reproStatus === 'OPEN').length} OPEN</span>
          </div>
        </div>

        {/* Protocols Card */}
        <div 
          onClick={() => setCurrentView('PROTOCOLS')}
          className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-100 rounded-lg text-violet-600 shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.protocolsCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.protocolsSubtitle}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-violet-500 transition-colors shrink-0" />
          </div>
           <div className="mt-3 pt-3 border-t border-neutral-50">
            <span className="bg-violet-50 text-violet-700 text-[10px] uppercase px-2 py-1 rounded font-bold">{protocolInstances.filter(p => p.status === 'ACTIVE').length} Active</span>
          </div>
        </div>

        {/* Insemination Card */}
        <div 
           onClick={() => setCurrentView('INSEMINATION')}
           className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-pink-100 rounded-lg text-pink-600 shrink-0">
              <TestTube2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.insemCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.insemSubtitle}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-pink-500 transition-colors shrink-0" />
          </div>
        </div>

        {/* Reports Card */}
        <div 
           onClick={() => setCurrentView('REPORTS')}
           className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600 shrink-0">
              <Syringe className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.reportsCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.reportsSubtitle}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-amber-500 transition-colors shrink-0" />
          </div>
        </div>

        {/* Users Card */}
        <div 
           onClick={() => setCurrentView('USERS')}
           className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-neutral-100 rounded-lg text-neutral-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.usersCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.usersSubtitle}</p>
            </div>
             <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
          </div>
        </div>

        {/* Settings Card */}
        <div 
           onClick={() => setCurrentView('SETTINGS')}
           className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
        >
           <div className="flex items-center gap-4 h-full">
            <div className="p-3 bg-neutral-100 rounded-lg text-neutral-600 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg text-neutral-800 truncate">{t.settingsCard}</h3>
              <p className="text-neutral-500 text-xs line-clamp-2">{t.settingsSubtitle}</p>
            </div>
             <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-50 overflow-hidden font-sans relative">
      {/* Centered Notification System */}
      {notification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top-2 fade-in">
          <div className={`flex items-center gap-3 px-6 py-2 rounded-full shadow-xl border ${
            notification.type === 'success' 
              ? 'bg-white text-green-700 border-green-100' 
              : 'bg-white text-red-700 border-red-100'
          }`}>
             {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
             <span className="font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedCow && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-5xl animate-in zoom-in-95 duration-200">
              <CowDetail 
                cow={selectedCow} 
                events={selectedCowEvents} 
                onClose={handleCloseDetail}
                onAddEvent={handleAddEvent}
                language={language}
                dateFormat={dateFormat}
              />
           </div>
        </div>
      )}

      {/* Top Navbar */}
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onSearch={handleSearch}
        language={language}
      />
      
      <main className="flex-1 relative h-full overflow-hidden flex flex-col">
          {currentView === 'HOME' && <Dashboard />}
          {currentView === 'HERD' && (
            <CowList 
              cows={cows} 
              onSelectCow={handleSelectCow} 
              onImportCows={handleImportCows}
              onNotify={showNotification}
              language={language}
              dateFormat={dateFormat}
            />
          )}
          {currentView === 'PROTOCOLS' && (
            <ActionLists 
              cows={cows} 
              protocols={protocols}
              setProtocols={setProtocols}
              instances={protocolInstances}
              setInstances={setProtocolInstances}
              onSelectCow={handleSelectCow}
              language={language}
              dateFormat={dateFormat}
            />
          )}
          {currentView === 'REPORTS' && (
            <div className="flex-1 flex items-center justify-center text-neutral-400 bg-white m-6 rounded-2xl border border-dashed border-neutral-200">
              <div className="text-center">
                <Syringe className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h2 className="text-xl font-bold font-display text-neutral-600">Vet Check Reports</h2>
                <p>Module under construction</p>
              </div>
            </div>
          )}
          {currentView === 'INSEMINATION' && (
            <div className="flex-1 flex items-center justify-center text-neutral-400 bg-white m-6 rounded-2xl border border-dashed border-neutral-200">
                <div className="text-center">
                <TestTube2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h2 className="text-xl font-bold font-display text-neutral-600">Insemination Management</h2>
                <p>Cows from completed protocols will appear here.</p>
              </div>
            </div>
          )}
          {currentView === 'SETTINGS' && (
            <div className="p-8 max-w-2xl mx-auto w-full overflow-y-auto">
              <h2 className="text-2xl font-display font-bold text-neutral-800 mb-6">{translations[language].settings.title}</h2>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 space-y-8">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-3">{translations[language].settings.language}</label>
                  <select 
                    className="w-full border border-neutral-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="EN">English</option>
                    <option value="FR">Français</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-3">{translations[language].settings.dateFormat}</label>
                  <select 
                    className="w-full border border-neutral-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                  >
                    <option value="EU">DD/MM/YYYY</option>
                    <option value="US">MM/DD/YYYY</option>
                    <option value="ISO">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {currentView === 'USERS' && (
            <div className="p-8 max-w-5xl mx-auto w-full overflow-y-auto">
                <h2 className="text-2xl font-display font-bold text-neutral-800 mb-6">{translations[language].sidebar.users}</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="p-4 text-sm font-bold text-neutral-600">Name</th>
                        <th className="p-4 text-sm font-bold text-neutral-600">Role</th>
                        <th className="p-4 text-sm font-bold text-neutral-600">Status</th>
                        <th className="p-4 text-sm font-bold text-neutral-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <tr>
                        <td className="p-4 text-sm font-medium text-neutral-800">John Doe</td>
                        <td className="p-4 text-sm text-neutral-500">Admin</td>
                        <td className="p-4"><span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">Active</span></td>
                        <td className="p-4 text-sm text-primary-600 cursor-pointer hover:underline font-medium">Edit</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-sm font-medium text-neutral-800">Jane Smith</td>
                        <td className="p-4 text-sm text-neutral-500">Herdsman</td>
                        <td className="p-4"><span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">Active</span></td>
                        <td className="p-4 text-sm text-primary-600 cursor-pointer hover:underline font-medium">Edit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>
          )}
      </main>
    </div>
  );
}
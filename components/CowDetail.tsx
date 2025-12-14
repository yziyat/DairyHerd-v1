import React, { useState } from 'react';
import { Cow, CowEvent, EventType } from '../types';
import { X, Calendar, Activity, Syringe, PlusCircle } from 'lucide-react';
import { translations, formatDate, Language, DateFormat } from '../utils/helpers';

interface CowDetailProps {
  cow: Cow;
  events: CowEvent[];
  onClose: () => void;
  onAddEvent: (event: CowEvent) => void;
  language: Language;
  dateFormat: DateFormat;
}

const CowDetail: React.FC<CowDetailProps> = ({ cow, events, onClose, onAddEvent, language, dateFormat }) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CowEvent>>({ type: 'HEALTH', date: new Date().toISOString().split('T')[0] });
  const t = translations[language].cowDetail;

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.type && newEvent.date && newEvent.details) {
      onAddEvent({
        id: Date.now().toString(),
        cowId: cow.id,
        type: newEvent.type as EventType,
        date: newEvent.date,
        details: newEvent.details,
        technician: newEvent.technician
      } as CowEvent);
      setShowEventForm(false);
      setNewEvent({ type: 'HEALTH', date: new Date().toISOString().split('T')[0], details: '' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full mx-auto my-auto max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 flex justify-between items-start bg-neutral-50">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-neutral-900 font-display tracking-tight">{cow.id}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm 
              ${cow.reproStatus === 'PREG' ? 'bg-green-600 text-white' : 
                cow.reproStatus === 'OPEN' || cow.reproStatus?.includes('NO BRED') ? 'bg-red-600 text-white' : 'bg-primary-600 text-white'}`}>
              {cow.reproStatus}
            </span>
          </div>
          <p className="text-neutral-500 text-sm mt-1">Pen: {cow.pen} | Lactation: {cow.lactation} | DIM: {cow.daysInMilk}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-neutral-50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex gap-4">
               <button 
                onClick={() => {
                  setNewEvent(prev => ({...prev, type: 'BREED'}));
                  setShowEventForm(true);
                }}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-900/10">
                <Activity className="w-4 h-4" /> Add Breeding
               </button>
               <button 
                onClick={() => {
                  setNewEvent(prev => ({...prev, type: 'HEALTH'}));
                  setShowEventForm(true);
                }}
                className="flex-1 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                <Syringe className="w-4 h-4" /> Health Event
               </button>
               <button 
                onClick={() => {
                  setNewEvent(prev => ({...prev, type: 'PREG_CHECK'}));
                  setShowEventForm(true);
                }}
                className="flex-1 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                <Calendar className="w-4 h-4" /> Preg Check
               </button>
            </div>

            {/* Event Form */}
            {showEventForm && (
              <div className="bg-white border border-primary-200 rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-neutral-800 mb-4 flex items-center gap-2 text-lg">
                  <PlusCircle className="w-5 h-5 text-primary-500" /> {t.newEvents}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Type</label>
                      <select 
                        className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        value={newEvent.type}
                        onChange={e => setNewEvent({...newEvent, type: e.target.value as EventType})}
                      >
                        <option value="HEAT">Heat</option>
                        <option value="BREED">Breeding</option>
                        <option value="PREG_CHECK">Pregnancy Check</option>
                        <option value="HEALTH">Health</option>
                        <option value="VACCINE">Vaccine</option>
                        <option value="SYNC_SHOT">Sync Protocol Shot</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Date</label>
                      <input 
                        type="date" 
                        className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        value={newEvent.date}
                        onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Details / Remarks</label>
                    <input 
                      type="text" 
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Mastitis treated with..."
                      value={newEvent.details}
                      onChange={e => setNewEvent({...newEvent, details: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowEventForm(false)}
                      className="text-neutral-500 text-sm px-4 py-2 hover:text-neutral-700 font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="bg-primary-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-primary-700 font-bold shadow-sm"
                    >
                      Save Event
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Event History */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200">
                <h3 className="font-bold text-neutral-700 text-sm uppercase tracking-wide">{t.history}</h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-3 font-bold">Date</th>
                    <th className="px-6 py-3 font-bold">Event</th>
                    <th className="px-6 py-3 font-bold">Remarks</th>
                    <th className="px-6 py-3 font-bold text-right">Tech</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sortedEvents.map(event => (
                    <tr key={event.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-3 text-neutral-600 whitespace-nowrap font-mono text-xs">{formatDate(event.date, dateFormat)}</td>
                      <td className="px-6 py-3 font-medium text-neutral-800">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold
                          ${event.type === 'BREED' ? 'bg-pink-100 text-pink-700' :
                            event.type === 'HEALTH' ? 'bg-red-100 text-red-700' :
                            event.type === 'CALVING' ? 'bg-purple-100 text-purple-700' :
                            'bg-neutral-100 text-neutral-600'}`}>
                          {event.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-neutral-600">{event.details}</td>
                      <td className="px-6 py-3 text-neutral-400 text-right text-xs">{event.technician || '-'}</td>
                    </tr>
                  ))}
                  {sortedEvents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-400">No events recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-6">{t.prodSummary}</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-neutral-600 text-sm font-medium">{t.lastTest}</span>
                    <span className="text-3xl font-display font-bold text-neutral-800">{cow.production?.lastMilk} <span className="text-sm text-neutral-400 font-normal">L</span></span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-neutral-600 text-sm font-medium">{t.lactAvg}</span>
                    <span className="text-xl font-display font-bold text-neutral-600">{cow.production?.avgMilk} <span className="text-xs text-neutral-400 font-normal">L</span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
               <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-6">{t.pedigree}</h3>
               <div className="space-y-4 text-sm">
                 <div className="flex justify-between border-b border-neutral-50 pb-3">
                    <span className="text-neutral-500 font-medium">{t.birthDate}</span>
                    <span className="font-bold text-neutral-700">{formatDate(cow.birthDate, dateFormat)}</span>
                 </div>
                 <div className="flex justify-between border-b border-neutral-50 pb-3">
                    <span className="text-neutral-500 font-medium">{t.sire}</span>
                    <span className="font-bold text-neutral-700 font-mono">{cow.sire1 || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between pt-1">
                    <span className="text-neutral-500 font-medium">{t.age}</span>
                    <span className="font-bold text-neutral-700">~{Math.floor(cow.ageInDays/365)} Y</span>
                 </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CowDetail;
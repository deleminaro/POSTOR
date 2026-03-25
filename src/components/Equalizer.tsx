import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, SlidersHorizontal } from 'lucide-react';

export interface EqualizerPreset {
  name: string;
  values: number[]; // 5 values for 60Hz, 230Hz, 910Hz, 4kHz, 14kHz
}

export const PRESETS: EqualizerPreset[] = [
  { name: 'Flat', values: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', values: [6, 3, 0, 0, 0] },
  { name: 'Rock', values: [4, 2, -2, 2, 4] },
  { name: 'Hip-Hop', values: [5, 3, 0, 1, 3] },
  { name: 'Vocal Clarity', values: [-2, 0, 2, 4, 2] },
];

const BANDS = ['60Hz', '230Hz', '910Hz', '4kHz', '14kHz'];

interface EqualizerProps {
  isOpen: boolean;
  onClose: () => void;
  values: number[];
  setValues: (values: number[]) => void;
}

export const Equalizer: React.FC<EqualizerProps> = ({ isOpen, onClose, values, setValues }) => {
  const handleValueChange = (index: number, newValue: number) => {
    const newValues = [...values];
    newValues[index] = newValue;
    setValues(newValues);
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PRESETS.find(p => p.name === presetName);
    if (preset) {
      setValues(preset.values);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-black border-t border-white p-10 z-50 rounded-t-[40px] shadow-2xl"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 border border-white text-white">
                    <SlidersHorizontal size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Equalizer</h3>
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Acoustic Calibration</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <select 
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="bg-black text-white text-[10px] font-mono uppercase tracking-widest px-6 py-3 border border-white focus:outline-none hover:bg-white hover:text-black transition-all cursor-pointer"
                  >
                    <option value="" disabled selected>Presets</option>
                    {PRESETS.map(preset => (
                      <option key={preset.name} value={preset.name}>{preset.name}</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={onClose}
                    className="p-3 border border-white hover:bg-white hover:text-black transition-all text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-8 h-72 items-end">
                {values.map((val, idx) => (
                  <div key={BANDS[idx]} className="flex flex-col items-center gap-6 h-full">
                    <div className="flex-1 w-full relative flex justify-center group">
                      {/* Track Background */}
                      <div className="absolute inset-y-0 w-px bg-white/10" />
                      
                      {/* Active Track */}
                      <div 
                        className="absolute bottom-1/2 w-px bg-white transition-all duration-300"
                        style={{ 
                          height: `${Math.abs(val) * 4}%`,
                          bottom: val >= 0 ? '50%' : `calc(50% - ${Math.abs(val) * 4}%)`
                        }}
                      />

                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={val}
                        onChange={(e) => handleValueChange(idx, parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
                        style={{ writingMode: 'bt-lr' } as any}
                      />
                      
                      {/* Thumb Visual */}
                      <motion.div 
                        animate={{ bottom: `calc(${(val + 12) / 24 * 100}% - 12px)` }}
                        className="absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-black z-20 pointer-events-none group-hover:scale-110 transition-transform"
                      />
                      
                      {/* Zero Line */}
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 pointer-events-none" />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <span className="block text-[10px] font-mono text-white/40 uppercase tracking-widest">{BANDS[idx]}</span>
                      <span className="block text-[12px] font-mono text-white font-bold">{val > 0 ? '+' : ''}{val}dB</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 pt-8 border-t border-white/10 flex justify-center">
                <p className="text-[10px] text-white/20 font-mono uppercase tracking-[0.4em]">5-Band Precision Control System</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

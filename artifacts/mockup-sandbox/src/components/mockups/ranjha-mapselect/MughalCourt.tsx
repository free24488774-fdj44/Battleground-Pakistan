import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";

const maps = [
  {
    id: "hunza",
    name: "Hunza Valley",
    biome: "Alpine Peak",
    desc: "The mountain stronghold of the Karakoram. Navigate treacherous glaciers and sharp peaks in the eternal frost.",
    icon: "🏔",
  },
  {
    id: "lahore",
    name: "Lahore Fort",
    biome: "Ancient Ruins",
    desc: "A sprawling labyrinth of Mughal ruins. Seek refuge amidst broken arches and vine-strangled red brick courtyards.",
    icon: "🕌",
  },
  {
    id: "multan",
    name: "Multan Desert",
    biome: "Arid Dunes",
    desc: "The city of saints drowned in sand. Fight through blinding dunes, adobe domes, and forgotten bazaars.",
    icon: "🏜",
  },
  {
    id: "karachi",
    name: "Karachi Coast",
    biome: "Urban Coastal",
    desc: "Where the Arabian Sea meets shattered glass towers. Master the violent shores and ruined urban sprawl.",
    icon: "🌊",
  },
];

export function MughalCourt() {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  return (
    <div className="relative min-h-[100dvh] w-full max-w-[390px] mx-auto overflow-hidden bg-[#07060f] text-[#f5f0e0] font-sans flex flex-col items-center select-none shadow-2xl shadow-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&display=swap');
        
        .font-cinzel { font-family: 'Cinzel', serif; }
        
        .mughal-bg {
          background-color: #07060f;
          background-image:
            radial-gradient(circle at 50% 0%, rgba(201, 168, 76, 0.16) 0%, rgba(7, 6, 15, 0) 42%),
            radial-gradient(circle at 50% 100%, rgba(139, 26, 26, 0.12) 0%, rgba(7, 6, 15, 0) 55%);
        }
        
        .mughal-border {
          position: relative;
        }
        
        .mughal-border::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(201, 168, 76, 0.4);
          pointer-events: none;
        }
        
        .mughal-border::after {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(201, 168, 76, 0.15);
          pointer-events: none;
        }
        
        .gold-glow {
          box-shadow: 0 0 22px rgba(201, 168, 76, 0.55), 0 0 60px rgba(201, 168, 76, 0.12);
        }
        
        .star-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2.5 17.5L40 20l-17.5 2.5L20 40l-2.5-17.5L0 20l17.5-2.5z' fill='%23c9a84c' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#c9a84c] opacity-60 m-3 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-[#c9a84c] opacity-60 m-3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-[#c9a84c] opacity-60 m-3 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[#c9a84c] opacity-60 m-3 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full flex flex-col h-full mughal-bg star-pattern">
        
        {/* Header */}
        <header className="w-full flex items-center justify-between px-6 pt-6 pb-2 relative">
          <button className="text-[#c9a84c] hover:text-[#f5f0e0] transition-colors flex items-center gap-1 z-20 bg-white/5 px-3 py-2 rounded-full border border-[#c9a84c]/20">
            <ChevronLeft size={20} />
            <span className="text-xs uppercase tracking-[0.28em] font-cinzel">Lobby</span>
          </button>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
            <h1 className="font-cinzel text-3xl font-black text-[#c9a84c] tracking-[0.34em] shadow-[#c9a84c]/20 drop-shadow-[0_8px_20px_rgba(201,168,76,0.25)]">RANJHA</h1>
          </div>
          
          <div className="w-16" /> {/* Spacer */}
        </header>

        <div className="w-full flex justify-center mb-6 opacity-60">
          <svg width="120" height="20" viewBox="0 0 120 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 10H45L50 5L60 15L70 5L75 10H120" stroke="#c9a84c" strokeWidth="1" />
            <circle cx="60" cy="10" r="3" fill="#c9a84c" />
          </svg>
        </div>

        <div className="px-6 pb-2 text-center">
          <h2 className="font-cinzel text-sm text-[#c9a84c] uppercase tracking-[0.28em] mb-2">Select Battlefield</h2>
          <p className="text-xs text-[#f5f0e0]/72 italic font-serif px-4 leading-relaxed">
            "Decree of the Emperor: Choose where thy fate shall be sealed in blood."
          </p>
        </div>

        {/* Maps List */}
        <div className="flex-1 overflow-y-auto w-full px-5 py-4 pb-24 flex flex-col gap-4 no-scrollbar">
          {maps.map((map) => (
            <div 
              key={map.id}
              onClick={() => setSelectedMap(map.id)}
              className={`
                relative mughal-border bg-[#160b12]/82 backdrop-blur-md transition-all duration-300
                border border-[#c9a84c]/30 cursor-pointer overflow-hidden group
                ${selectedMap === map.id ? 'gold-glow bg-[#8b1a1a]/42 scale-[1.02]' : 'hover:border-[#c9a84c]/60 hover:bg-[#1b0f18]'}
              `}
            >
              {selectedMap === map.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a84c]/10 to-transparent pointer-events-none" />
              )}
              
              <div className="p-4 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-md">
                      {map.icon}
                    </span>
                    <div>
                      <h3 className="font-cinzel text-lg font-bold text-[#c9a84c] tracking-[0.2em] uppercase">
                        {map.name}
                      </h3>
                      <div className="text-[10px] text-[#f5f0e0]/60 uppercase tracking-[0.28em] mt-0.5 font-cinzel">
                        {map.biome}
                      </div>
                    </div>
                  </div>
                  
                  {/* Radio button style */}
                  <div className={\`w-5 h-5 rounded-full border border-[#c9a84c] flex items-center justify-center transition-colors
                    \${selectedMap === map.id ? 'bg-[#c9a84c]/20' : ''}
                  \`}>
                    {selectedMap === map.id && <div className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />}
                  </div>
                </div>
                
                  <p className="text-xs text-[#f5f0e0]/82 leading-relaxed font-serif mt-3 italic pr-4">
                  {map.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Deploy Button */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0818] via-[#0a0818] to-transparent pointer-events-none flex justify-center pb-8">
          <button 
            disabled={!selectedMap}
            className={\`
              pointer-events-auto font-cinzel uppercase tracking-[0.2em] py-3 px-12 border border-[#c9a84c]
              transition-all duration-500 relative overflow-hidden group font-bold text-sm
              \${selectedMap 
                ? 'text-[#0a0818] bg-[#c9a84c] hover:bg-[#d4b966] gold-glow shadow-[0_10px_35px_rgba(201,168,76,0.2)]' 
                : 'text-[#c9a84c]/50 border-[#c9a84c]/30 bg-transparent'}
            \`}
          >
            {selectedMap && (
              <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            )}
            {selectedMap ? "Commence Battle" : "Awaiting Decree"}
          </button>
        </div>

      </div>
    </div>
  );
}

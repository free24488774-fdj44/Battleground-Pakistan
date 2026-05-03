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

const heroLooks: Record<string, { skin: string; cloth: string; pants: string; hair: string; accent: string; weapon: string }> = {
  hunza: { skin: "#d8b08c", cloth: "#8f5b3d", pants: "#43312a", hair: "#2a1a12", accent: "#c9a84c", weapon: "🪓" },
  lahore: { skin: "#d9b08a", cloth: "#8b1a1a", pants: "#2a1a1a", hair: "#130b0b", accent: "#ffcf5a", weapon: "🗡" },
  multan: { skin: "#d5a57a", cloth: "#c98a2f", pants: "#5b3a16", hair: "#3b2410", accent: "#f5d27a", weapon: "🏹" },
  karachi: { skin: "#d3a57f", cloth: "#1e4f7a", pants: "#1b2430", hair: "#101420", accent: "#66d9ff", weapon: "🔫" },
};

function HeroCard({ mapId }: { mapId: string }) {
  const h = heroLooks[mapId];
  return (
    <div className="relative h-20 w-16 shrink-0">
      <div className="absolute inset-x-1 bottom-0 h-2 rounded-full bg-black/30 blur-sm" />
      <div className="absolute left-1/2 top-1 -translate-x-1/2">
        <div className="relative">
          <div className="w-5 h-5 rounded-full" style={{ background: h.skin }} />
          <div className="absolute -top-1 -left-1 w-7 h-4 rounded-t-full" style={{ background: h.hair }} />
        </div>
      </div>
      <div className="absolute left-1/2 top-6 -translate-x-1/2 w-7 h-8 rounded-md" style={{ background: h.cloth }} />
      <div className="absolute left-[18px] top-7 w-1.5 h-7 rounded-full rotate-[18deg]" style={{ background: h.skin }} />
      <div className="absolute right-[18px] top-7 w-1.5 h-7 rounded-full -rotate-[18deg]" style={{ background: h.skin }} />
      <div className="absolute left-[18px] top-12 w-1.5 h-7 rounded-full rotate-[4deg]" style={{ background: h.pants }} />
      <div className="absolute right-[18px] top-12 w-1.5 h-7 rounded-full -rotate-[4deg]" style={{ background: h.pants }} />
      <div className="absolute right-0 top-8 text-[18px]" style={{ filter: `drop-shadow(0 0 8px ${h.accent})` }}>
        {h.weapon}
      </div>
    </div>
  );
}

export function MughalCourt() {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  return (
    <div className="relative min-h-[100dvh] w-full max-w-[390px] mx-auto overflow-hidden bg-[#05040a] text-[#f5f0e0] font-sans flex flex-col items-center select-none shadow-2xl shadow-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&display=swap');
        
        .font-cinzel { font-family: 'Cinzel', serif; }
        
        .mughal-bg {
          background-color: #05040a;
          background-image:
            radial-gradient(circle at 50% 0%, rgba(201, 168, 76, 0.20) 0%, rgba(5, 4, 10, 0) 42%),
            radial-gradient(circle at 50% 100%, rgba(139, 26, 26, 0.15) 0%, rgba(5, 4, 10, 0) 55%),
            linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%);
        }
        
        .mughal-border {
          position: relative;
        }
        
        .mughal-border::before {
          content: '';
          position: absolute;
          inset: 5px;
          border: 1px solid rgba(201, 168, 76, 0.55);
          pointer-events: none;
        }
        
        .mughal-border::after {
          content: '';
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(201, 168, 76, 0.18);
          pointer-events: none;
        }
        
        .gold-glow {
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.38), 0 0 28px rgba(201, 168, 76, 0.35), 0 0 80px rgba(201, 168, 76, 0.10);
        }
        
        .star-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2.5 17.5L40 20l-17.5 2.5L20 40l-2.5-17.5L0 20l17.5-2.5z' fill='%23c9a84c' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t border-l border-[#c9a84c]/70 m-3 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 border-t border-r border-[#c9a84c]/70 m-3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-b border-l border-[#c9a84c]/70 m-3 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b border-r border-[#c9a84c]/70 m-3 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full flex flex-col h-full mughal-bg star-pattern">
        
        {/* Header */}
        <header className="w-full flex items-center justify-between px-6 pt-6 pb-2 relative">
          <button className="text-[#c9a84c] hover:text-[#f5f0e0] transition-colors flex items-center gap-1 z-20 bg-white/5 px-3 py-2 rounded-full border border-[#c9a84c]/25 backdrop-blur">
            <ChevronLeft size={20} />
            <span className="text-xs uppercase tracking-[0.28em] font-cinzel">Lobby</span>
          </button>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
            <h1 className="font-cinzel text-3xl font-black text-[#c9a84c] tracking-[0.38em] shadow-[#c9a84c]/20 drop-shadow-[0_10px_24px_rgba(201,168,76,0.28)]">RANJHA</h1>
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
          <h2 className="font-cinzel text-sm text-[#c9a84c] uppercase tracking-[0.34em] mb-2">Select Battlefield</h2>
          <p className="text-xs text-[#f5f0e0]/72 italic font-serif px-4 leading-relaxed max-w-[320px] mx-auto">
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
                relative mughal-border bg-[#120910]/88 backdrop-blur-md transition-all duration-300
                border border-[#c9a84c]/30 cursor-pointer overflow-hidden group
                ${selectedMap === map.id ? 'gold-glow bg-[#8b1a1a]/42 scale-[1.02]' : 'hover:border-[#c9a84c]/60 hover:bg-[#190e16]'}
              `}
            >
              {selectedMap === map.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a84c]/10 to-transparent pointer-events-none" />
              )}
              
              <div className="p-4 relative z-10">
                  <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <HeroCard mapId={map.id} />
                    <span className="text-2xl opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-md">
                      {map.icon}
                    </span>
                    <div>
                      <h3 className="font-cinzel text-lg font-bold text-[#c9a84c] tracking-[0.26em] uppercase">
                        {map.name}
                      </h3>
                      <div className="text-[10px] text-[#f5f0e0]/60 uppercase tracking-[0.34em] mt-0.5 font-cinzel">
                        {map.biome}
                      </div>
                    </div>
                  </div>
                  
                  {/* Radio button style */}
                  <div
                    className={`w-5 h-5 rounded-full border border-[#c9a84c] flex items-center justify-center transition-colors
                    ${selectedMap === map.id ? 'bg-[#c9a84c]/20' : ''}`}
                  >
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
            className={`
              pointer-events-auto font-cinzel uppercase tracking-[0.28em] py-3 px-12 border border-[#c9a84c]
              transition-all duration-500 relative overflow-hidden group font-bold text-sm
              ${selectedMap 
                ? 'text-[#0a0818] bg-[#c9a84c] hover:bg-[#d4b966] gold-glow shadow-[0_12px_38px_rgba(201,168,76,0.22)]' 
                : 'text-[#c9a84c]/50 border-[#c9a84c]/30 bg-transparent'}
            `}
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

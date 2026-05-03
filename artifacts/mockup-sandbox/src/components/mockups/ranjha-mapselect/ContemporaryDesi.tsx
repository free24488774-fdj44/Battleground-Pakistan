import React, { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";

export function ContemporaryDesi() {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const maps = [
    {
      id: "hunza",
      name: "Hunza Valley",
      description: "Karakoram mountain ranges, glaciers, sharp peaks",
      biome: "Alpine",
      accent: "#3b82f6", // glacier blue
      playerCount: "84%",
    },
    {
      id: "lahore",
      name: "Lahore Fort",
      description: "Mughal ruins, broken arches, red brick",
      biome: "Urban Ruins",
      accent: "#ef4444", // brick red
      playerCount: "92%",
    },
    {
      id: "multan",
      name: "Multan Desert",
      description: "Sandy dunes, adobe domed structures",
      biome: "Desert",
      accent: "#eab308", // sand gold
      playerCount: "65%",
    },
    {
      id: "karachi",
      name: "Karachi Coast",
      description: "Ocean waves, glass towers, broken buildings",
      biome: "Coastal",
      accent: "#14b8a6", // ocean teal
      playerCount: "78%",
    },
  ];

  return (
    <div
      className="w-full h-[100dvh] flex justify-center bg-black overflow-hidden relative font-sans"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        backgroundColor: "#040f06",
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
          
          .desi-grid {
            background-image: linear-gradient(#01411C15 1px, transparent 1px),
              linear-gradient(90deg, #01411C15 1px, transparent 1px);
            background-size: 24px 24px;
          }
          
          .crescent {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            box-shadow: 4px -4px 0 0 white;
            transform: rotate(45deg);
          }
          
          .star {
            width: 8px;
            height: 8px;
            background: white;
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          }

          /* Urdu-inspired diacritical mark (nuqta) decoration */
          .nuqta::after {
            content: '';
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: #E8A020;
            transform: rotate(45deg);
            bottom: -6px;
            right: 0;
          }
        `}
      </style>

      {/* Mobile Container */}
      <div className="w-full max-w-[390px] h-full relative flex flex-col desi-grid bg-[#040f06]">
        {/* Header */}
        <header className="px-6 pt-12 pb-6 relative z-10 flex flex-col gap-4 border-b border-[#01411C]/30">
          <button className="flex items-center text-zinc-400 hover:text-white transition-colors w-fit group">
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase text-sm tracking-widest font-medium">Lobby</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="relative inline-block">
              <h1 className="text-4xl font-bold text-white tracking-tight nuqta">
                RANJHA
              </h1>
              <div className="h-1.5 w-full bg-[#01411C] mt-1 relative">
                <div className="absolute right-0 top-0 w-1/3 h-full bg-[#E8A020]"></div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 pt-2">
              <div className="crescent"></div>
              <div className="star -mt-3 -ml-1"></div>
            </div>
          </div>
          
          <div className="text-zinc-400 text-sm tracking-wide mt-2">
            SELECT DEPLOYMENT ZONE
          </div>
        </header>

        {/* Map List */}
        <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 z-10 no-scrollbar">
          {maps.map((map) => {
            const isSelected = selectedMap === map.id;
            
            return (
              <div
                key={map.id}
                onClick={() => setSelectedMap(map.id)}
                className={`relative bg-[#0d1117] border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
                  isSelected ? 'border-[#E8A020] shadow-[0_0_20px_rgba(232,160,32,0.15)]' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left Color Band */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: map.accent }}
                />

                <div className="p-5 pl-6 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white tracking-wide">
                      {map.name}
                    </h3>
                    <span 
                      className="text-xs px-2 py-1 uppercase font-bold tracking-wider text-[#040f06]"
                      style={{ backgroundColor: map.accent }}
                    >
                      {map.biome}
                    </span>
                  </div>
                  
                  <p className="text-sm text-zinc-400 leading-snug">
                    {map.description}
                  </p>

                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase">
                      <span>Activity Level</span>
                      <span>{map.playerCount}</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-none overflow-hidden">
                      <div 
                        className="h-full bg-zinc-600"
                        style={{ width: map.playerCount }}
                      />
                    </div>
                  </div>
                  
                  {isSelected && (
                    <button className="mt-3 w-full bg-[#01411C] hover:bg-[#015423] text-white py-3 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Deploy Here
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </main>
        
        {/* Fade Out at Bottom */}
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-[#040f06] to-transparent pointer-events-none z-20"></div>
      </div>
    </div>
  );
}

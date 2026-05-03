import React, { useState } from 'react';
import { ArrowLeft, Map as MapIcon, ChevronRight } from 'lucide-react';

const maps = [
  {
    id: 'hunza',
    name: 'Hunza Valley',
    description: 'Karakoram mountain ranges, glaciers, sharp peaks, green valley.',
    biome: '🏔 Alpine',
    color: '#00E5FF',
    bg: '#004A55',
    accent: '#FF006E'
  },
  {
    id: 'lahore',
    name: 'Lahore Fort',
    description: 'Mughal ruins, broken arches, red brick, overgrown vines.',
    biome: '🕌 Heritage',
    color: '#FF006E',
    bg: '#4A0025',
    accent: '#FFD700'
  },
  {
    id: 'multan',
    name: 'Multan Desert',
    description: 'Sandy dunes, adobe domed structures, ancient bazaars.',
    biome: '🏜 Arid',
    color: '#FFD700',
    bg: '#554400',
    accent: '#FF4500'
  },
  {
    id: 'karachi',
    name: 'Karachi Coast',
    description: 'Ocean waves, beach, glass towers, broken buildings.',
    biome: '🌊 Urban Coastal',
    color: '#00AA55',
    bg: '#003311',
    accent: '#FFD700'
  }
];

export function TruckArt() {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  return (
    <div className="min-h-[100dvh] w-full bg-[#07130d] text-white overflow-x-hidden font-sans pb-12 selection:bg-[#FF006E] selection:text-white relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap');
        
        .truck-title {
          font-family: 'Alfa Slab One', serif;
          text-shadow: 
            3px 3px 0 #FF006E,
            -1px -1px 0 #FF006E,
            1px -1px 0 #FF006E,
            -1px 1px 0 #FF006E,
            1px 1px 0 #FF006E,
            0 6px 0 #FFD700,
            0 0 15px rgba(255, 0, 110, 0.5);
          letter-spacing: 2px;
        }

        .border-maximalist {
          position: relative;
        }
        
        .border-maximalist::before {
          content: '';
          position: absolute;
          inset: -6px;
          background: repeating-linear-gradient(
            45deg,
            var(--accent-color),
            var(--accent-color) 10px,
            var(--main-color) 10px,
            var(--main-color) 20px
          );
          z-index: -2;
        }
        
        .border-maximalist::after {
          content: '';
          position: absolute;
          inset: -2px;
          background: #000;
          z-index: -1;
        }

        .sun-motif {
          background: repeating-conic-gradient(
            var(--main-color) 0deg 15deg,
            var(--accent-color) 15deg 30deg
          );
          border-radius: 50%;
        }

        .card-hover:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 18px 42px -14px var(--main-color), 0 0 0 1px rgba(255,255,255,0.08) inset;
        }
        
        .card-hover:hover .border-maximalist::before {
          animation: border-dance 1s linear infinite;
        }

        @keyframes border-dance {
          0% { background-position: 0 0; }
          100% { background-position: 28px 0; }
        }
      `}</style>

      {/* Decorative Top Border */}
      <div className="h-4 w-full" style={{
        background: 'repeating-linear-gradient(90deg, #FFD700 0 20px, #FF006E 20px 40px, #00E5FF 40px 60px, #00AA55 60px 80px)'
      }}></div>
      <div className="h-2 w-full bg-white mb-6"></div>

      <div className="px-4 max-w-md mx-auto">
        <header className="flex justify-between items-center mb-10 relative">
          <button className="flex items-center justify-center w-12 h-12 bg-[#FF006E] text-white font-black border-4 border-[#FFD700] shadow-[6px_6px_0_#00E5FF] hover:translate-y-1 hover:shadow-[3px_3px_0_#00E5FF] transition-all">
            <ArrowLeft strokeWidth={4} />
          </button>
          
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="flex gap-2 mb-1">
              {[1,2,3].map(i => (
                <div key={i} className="w-3 h-3 bg-[#00E5FF] rotate-45 border-2 border-white"></div>
              ))}
            </div>
            <h1 className="text-5xl truck-title text-white uppercase mt-2">Ranjha</h1>
            <div className="text-[#FFD700] font-black tracking-widest text-sm mt-1 bg-black px-2 border-2 border-[#FF006E]">BATTLE ROYALE</div>
          </div>
          
          <div className="w-12 h-12 bg-black border-4 border-[#00E5FF] flex items-center justify-center shadow-[4px_4px_0_#FF006E]">
            <MapIcon className="text-[#FFD700]" strokeWidth={3} />
          </div>
        </header>

        <h2 className="text-center font-black text-2xl mb-8 tracking-[0.22em] text-white uppercase" style={{
          textShadow: '2px 2px 0 #00E5FF, -1px -1px 0 #FF006E, 0 8px 20px rgba(0,0,0,0.5)'
        }}>
          Select Battlefield
        </h2>

        <div className="space-y-10">
          {maps.map((map) => (
            <div 
              key={map.id}
              className="card-hover transition-all duration-300 ease-out border-maximalist"
              style={{
                '--main-color': map.color,
                '--accent-color': map.accent,
              } as React.CSSProperties}
            >
                <div 
                className="p-1 relative z-10"
                style={{ backgroundColor: map.bg }}
              >
                <div className="border-4 border-dashed border-[rgba(255,255,255,0.3)] p-5 relative overflow-hidden rounded-sm">
                  
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4" style={{ borderColor: map.color }}></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4" style={{ borderColor: map.color }}></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4" style={{ borderColor: map.color }}></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4" style={{ borderColor: map.color }}></div>

                  {/* Motif background */}
                  <div className="absolute -right-16 -top-16 w-48 h-48 sun-motif opacity-24"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-3xl font-black uppercase text-white tracking-wider" style={{
                        textShadow: `2px 2px 0 ${map.color}`
                      }}>
                        {map.name}
                      </h3>
                      <div className="px-3 py-1 bg-black text-white font-bold border-2 text-sm whitespace-nowrap" style={{ borderColor: map.accent }}>
                        {map.biome}
                      </div>
                    </div>
                    
                    <p className="text-white/90 font-bold mb-6 mt-2 pr-8 leading-snug">
                      {map.description}
                    </p>

                    <button 
                      onClick={() => setSelectedMap(map.id)}
                      className="w-full py-4 px-6 font-black text-xl uppercase tracking-[0.18em] flex justify-between items-center transition-all group"
                      style={{ 
                        backgroundColor: selectedMap === map.id ? '#FFD700' : map.color,
                        color: selectedMap === map.id ? '#000' : '#fff',
                        boxShadow: `6px 6px 0 ${map.accent}`
                      }}
                    >
                      <span>{selectedMap === map.id ? 'Selected' : 'Deploy Here'}</span>
                      <ChevronRight 
                        className="group-hover:translate-x-2 transition-transform" 
                        strokeWidth={4} 
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative Bottom Border */}
      <div className="h-2 w-full bg-white mt-12 mb-2"></div>
      <div className="h-6 w-full" style={{
        background: 'repeating-linear-gradient(-45deg, #FFD700 0 15px, #000 15px 30px)'
      }}></div>
    </div>
  );
}

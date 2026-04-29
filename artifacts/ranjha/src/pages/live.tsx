import { useLocation } from "wouter";
import { ArrowLeft, Users, Eye, Play } from "lucide-react";
import { MOCK_FRIENDS, MAPS } from "@/lib/mock-data";
import { NeonButton } from "@/components/game/NeonButton";

export default function Live() {
  const [, setLocation] = useLocation();

  const streams = [
    { id: 1, streamer: "NinjaPK", viewers: "45.2K", map: MAPS[0], title: "ROAD TO CONQUEROR | NO MERCY" },
    { id: 2, streamer: "KarachiKing", viewers: "12.8K", map: MAPS[1], title: "SNIPER ONLY CHALLENGE" },
    { id: 3, streamer: "PindiBoy_Pro", viewers: "8.5K", map: MAPS[2], title: "SQUAD WIPES CONTINUOUS" },
    { id: 4, streamer: "LahoriDon", viewers: "5.1K", map: MAPS[3], title: "CHILL STREAMS & CUSTOMS" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="p-4 flex items-center gap-4 bg-black/50 border-b border-white/10 sticky top-0 z-10">
        <button onClick={() => setLocation("/lobby")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-primary">Live Streams</h1>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map((stream) => (
            <div key={stream.id} className="glass-panel rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-colors group cursor-pointer">
              <div className="relative aspect-video">
                <img src={stream.map.image} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-[10px] font-bold tracking-widest rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {stream.viewers}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center pl-1">
                    <Play className="w-6 h-6 text-black" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white text-lg truncate mb-1">{stream.title}</h3>
                <div className="flex justify-between items-center text-sm text-white/60">
                  <span className="font-display text-primary">{stream.streamer}</span>
                  <span>{stream.map.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

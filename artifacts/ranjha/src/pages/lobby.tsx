import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Settings, Store, Calendar, Radio, Users, Crosshair, Map, Shield, Sparkles } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { Particles } from "@/components/game/Particles";
import { NeonButton } from "@/components/game/NeonButton";
import { CharacterCard, PetCard, GunCard, MapCard } from "@/components/game/Cards";
import { CHARACTERS, PETS, GUNS, MAPS, OUTFITS, SKILLS, MOCK_FRIENDS } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";

type Tab = "Characters" | "Outfits" | "Pets" | "Guns" | "Skills" | "Maps" | "Friends";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { 
    profile, 
    selectedCharacter, 
    selectedPet, 
    selectedMap,
    equipCharacter,
    equipPet,
    equipPrimaryGun,
    selectMap
  } = useGame();
  
  const [activeTab, setActiveTab] = useState<Tab>("Characters");

  if (!profile) {
    setLocation("/login");
    return null;
  }

  const copyUid = () => {
    navigator.clipboard.writeText(profile.uid);
    toast({ title: "UID Copied", description: "Copied to clipboard." });
  };

  return (
    <div className="relative w-full min-h-screen bg-background overflow-hidden flex flex-col font-sans">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${selectedMap.image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
      <Particles count={30} type="ember" />

      {/* Top HUD */}
      <header className="relative z-20 flex justify-between items-start p-4 glass-panel border-b-0 rounded-b-xl mx-4 mt-2">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setLocation("/profile")}>
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary">
            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 w-full bg-primary/80 text-[10px] text-center font-bold text-black">
              LVL {profile.level}
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-white uppercase tracking-wide">{profile.name}</h2>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>UID: {profile.uid}</span>
              <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); copyUid(); }} />
            </div>
            <div className="w-32 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-accent w-[45%]" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-yellow-500 font-bold text-xs">C</div>
            <span className="font-display font-bold text-lg">{profile.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-500 font-bold text-xs">D</div>
            <span className="font-display font-bold text-lg">{profile.diamonds.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row mt-4 px-4 gap-4 h-0 min-h-0">
        
        {/* Left Side: Hero Showcase */}
        <div className="flex-1 relative flex flex-col items-center justify-end pb-20">
          <motion.div
            key={selectedCharacter.id}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative h-[60vh] md:h-[70vh] aspect-[1/2]"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            <img 
              src={selectedCharacter.portrait} 
              alt={selectedCharacter.name}
              className="w-full h-full object-contain object-bottom drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            />
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-10 bottom-20 w-32 h-32"
            >
              {selectedPet && <img src={selectedPet.image} alt="Pet" className="w-full h-full object-contain" />}
            </motion.div>
          </motion.div>

          <div className="absolute bottom-8 text-center w-full">
            <h2 className="horror-title text-5xl md:text-7xl text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] tracking-wider">
              {selectedCharacter.name}
            </h2>
            <div className="flex justify-center gap-4 mt-2">
              <span className="px-3 py-1 bg-black/50 border border-white/10 rounded text-xs font-display text-primary uppercase">HP {selectedCharacter.hp}</span>
              <span className="px-3 py-1 bg-black/50 border border-white/10 rounded text-xs font-display text-accent uppercase">SPD {selectedCharacter.speed}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Panel */}
        <div className="w-full md:w-[450px] lg:w-[600px] flex flex-col gap-4 h-[50vh] md:h-auto pb-4">
          {/* Tabs */}
          <div className="glass-panel p-2 rounded-xl flex overflow-x-auto no-scrollbar gap-2 hide-scroll">
            {(["Characters", "Outfits", "Pets", "Guns", "Skills", "Maps", "Friends"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-display text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeTab === tab ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 glass-panel rounded-xl p-4 overflow-y-auto overflow-x-hidden border border-white/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {activeTab === "Characters" && CHARACTERS.map(c => (
                  <CharacterCard 
                    key={c.id} 
                    character={c} 
                    isLocked={profile.level < c.unlockLevel}
                    isSelected={selectedCharacter.id === c.id}
                    onClick={() => equipCharacter(c)}
                  />
                ))}

                {activeTab === "Pets" && PETS.map(p => (
                  <PetCard
                    key={p.id}
                    pet={p}
                    isLocked={profile.level < p.unlockLevel}
                    isSelected={selectedPet?.id === p.id}
                    onClick={() => equipPet(p)}
                  />
                ))}

                {activeTab === "Guns" && GUNS.slice(0, 12).map(g => (
                  <div key={g.id} className="col-span-2 lg:col-span-3">
                    <GunCard gun={g} onClick={() => equipPrimaryGun(g)} />
                  </div>
                ))}

                {activeTab === "Maps" && MAPS.map(m => (
                  <div key={m.id} className={m.isMain ? "col-span-2 lg:col-span-3" : "col-span-2 lg:col-span-3"}>
                     <MapCard
                       map={m}
                       isSelected={selectedMap.id === m.id}
                       onClick={() => selectMap(m)}
                       onInfo={() => setLocation(`/map/${m.id}`)}
                     />
                  </div>
                ))}

                {activeTab === "Skills" && SKILLS.map(s => (
                  <div key={s.id} className="col-span-2 lg:col-span-3 glass-panel p-3 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display font-bold text-white uppercase">{s.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${s.type === 'Active' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>{s.type}</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{s.description}</p>
                  </div>
                ))}

                {activeTab === "Outfits" && OUTFITS.map(o => (
                  <div key={o.id} className="relative aspect-[3/4] rounded-lg overflow-hidden glass-panel cursor-pointer hover:border-primary border border-white/10">
                    <img src={o.image} alt={o.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                      <span className="font-display text-xs font-bold text-white truncate">{o.name}</span>
                    </div>
                  </div>
                ))}

                {activeTab === "Friends" && (
                  <div className="col-span-2 lg:col-span-3 flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-display uppercase tracking-wider">
                      <Shield className="w-4 h-4" />
                      Secure connection — friend data stays on this device
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Search UID or Name..." 
                        maxLength={32}
                        className="flex-1 bg-black/50 border border-white/20 focus:border-primary rounded-lg p-2 text-sm text-white outline-none"
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[<>'"`;\\]/g, "");
                          if (cleaned !== e.target.value) e.target.value = cleaned;
                        }}
                      />
                      <button
                        className="px-4 py-2 bg-primary text-black font-display font-bold rounded-lg text-sm uppercase"
                        onClick={() => toast({ title: "Search", description: "No matching players found." })}
                      >
                        Search
                      </button>
                      <button
                        className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent font-display font-bold rounded-lg text-sm uppercase hover:bg-accent/30 transition-colors"
                        onClick={copyUid}
                      >
                        Share My ID
                      </button>
                    </div>
                    <div className="space-y-2">
                      {MOCK_FRIENDS.map(f => (
                        <div key={f.uid} className="flex items-center justify-between p-3 glass-panel rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
                              <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${f.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                            </div>
                            <div>
                              <div className="font-display font-bold text-white text-sm uppercase">{f.name}</div>
                              <div className="text-[10px] text-white/50">LVL {f.level} · UID {f.uid}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-display uppercase tracking-wider transition-colors"
                              onClick={() => toast({ title: "Invite Sent", description: `Squad invite sent to ${f.name}.` })}
                            >
                              Invite
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Side Buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 hidden md:flex">
        {[
          { icon: Radio, label: "Live", onClick: () => setLocation("/live") },
          { icon: Store, label: "Store", onClick: () => {} },
          { icon: Calendar, label: "Events", onClick: () => {} },
          { icon: Settings, label: "Settings", onClick: () => {} }
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} className="w-12 h-12 rounded-full glass-panel flex flex-col items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-all group">
            <btn.icon className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-display uppercase tracking-widest">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Right Play Button */}
      <div className="absolute bottom-6 right-6 z-30">
        <NeonButton 
          size="xl" 
          onClick={() => setLocation("/matchmaking")}
          className="animate-[pulse_2s_ease-in-out_infinite]"
        >
          <Play className="w-8 h-8 fill-current" />
          BATTLE
        </NeonButton>
      </div>
    </div>
  );
}

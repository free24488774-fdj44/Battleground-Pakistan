import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, LogOut } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { NeonButton } from "@/components/game/NeonButton";
import { toast } from "@/hooks/use-toast";
import avatar1 from "@/assets/images/avatar-1.png";

const AVATARS = [avatar1, avatar1, avatar1, avatar1]; // Reusing generated avatar for mock

export default function Profile() {
  const [, setLocation] = useLocation();
  const { profile, updateProfile, logout } = useGame();
  const [name, setName] = useState(profile?.name || "");
  const [avatar, setAvatar] = useState(profile?.avatar || avatar1);

  if (!profile) {
    setLocation("/login");
    return null;
  }

  const handleSave = () => {
    updateProfile({ name, avatar });
    toast({ title: "Profile Updated", description: "Your changes have been saved." });
    setLocation("/lobby");
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="p-4 flex justify-between items-center bg-black/50 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/lobby")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Player Profile</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold uppercase tracking-widest">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-xl glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-8">
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full border-4 border-primary overflow-hidden relative group">
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-xs font-bold uppercase tracking-widest">Change</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {AVATARS.map((av, i) => (
                <button 
                  key={i}
                  onClick={() => setAvatar(av)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 ${avatar === av ? 'border-primary' : 'border-white/20 hover:border-white/50'}`}
                >
                  <img src={av} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-display uppercase tracking-widest text-white/50 mb-1">Player UID</label>
              <div className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white/70 font-mono">
                {profile.uid}
              </div>
            </div>

            <div>
              <label className="block text-xs font-display uppercase tracking-widest text-white/50 mb-1">Display Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/20 focus:border-primary rounded-lg p-3 text-white outline-none transition-colors"
                maxLength={15}
              />
            </div>

            <div className="flex justify-between items-center py-4 border-t border-white/10 mt-4">
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-primary">{profile.level}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50">Level</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-white">1,204</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50">Matches</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-white">4.2</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50">K/D Ratio</div>
              </div>
            </div>
          </div>

          <NeonButton onClick={handleSave} className="w-full mt-4">
            Save Profile
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

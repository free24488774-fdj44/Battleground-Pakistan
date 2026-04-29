import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { Character, Pet, Gun, Outfit, Skill, GameMap } from "@/lib/types";
import { RarityBadge } from "./RarityBadge";
import { StatBar } from "./StatBar";

interface BaseCardProps {
  name: string;
  image: string;
  isLocked?: boolean;
  unlockLevel?: number;
  isSelected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

function BaseCard({ name, image, isLocked, unlockLevel, isSelected, onClick, children, className = "" }: BaseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={isLocked ? undefined : onClick}
      className={`relative rounded-lg overflow-hidden cursor-pointer glass-panel border-2 transition-colors ${
        isSelected ? "border-primary shadow-[0_0_15px_rgba(244,180,26,0.3)]" : "border-white/10 hover:border-white/30"
      } ${isLocked ? "opacity-50 cursor-not-allowed grayscale" : ""} ${className}`}
    >
      <div className="aspect-[3/4] relative">
        <img src={image} alt={name} className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
              <span className="font-display text-sm font-bold text-white">UNLOCKS AT LVL {unlockLevel}</span>
            </div>
          </div>
        )}

        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="p-3 absolute bottom-0 left-0 w-full">
        <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide truncate">{name}</h3>
        {children}
      </div>
    </motion.div>
  );
}

export function CharacterCard({ character, isLocked, isSelected, onClick }: { character: Character, isLocked?: boolean, isSelected?: boolean, onClick?: () => void }) {
  return (
    <BaseCard name={character.name} image={character.portrait} isLocked={isLocked} unlockLevel={character.unlockLevel} isSelected={isSelected} onClick={onClick}>
      <RarityBadge rarity={character.rarity} className="mt-1 inline-block" />
      <div className="mt-2 text-xs text-gray-400 line-clamp-2 h-8 leading-tight">{character.ability}</div>
    </BaseCard>
  );
}

export function PetCard({ pet, isLocked, isSelected, onClick }: { pet: Pet, isLocked?: boolean, isSelected?: boolean, onClick?: () => void }) {
  return (
    <BaseCard name={pet.name} image={pet.image} isLocked={isLocked} unlockLevel={pet.unlockLevel} isSelected={isSelected} onClick={onClick} className="aspect-square">
      <RarityBadge rarity={pet.rarity} className="mt-1 inline-block" />
      <div className="mt-2 text-[10px] text-gray-400 line-clamp-2 h-7 leading-tight">{pet.ability}</div>
    </BaseCard>
  );
}

export function GunCard({ gun, isSelected, onClick }: { gun: Gun, isSelected?: boolean, onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-3 rounded-lg cursor-pointer glass-panel border-2 transition-colors flex flex-col gap-3 ${
        isSelected ? "border-primary shadow-[0_0_15px_rgba(244,180,26,0.3)]" : "border-white/10 hover:border-white/30"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-display font-bold text-lg text-white uppercase">{gun.name}</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{gun.category}</span>
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
      
      <div className="h-24 relative rounded overflow-hidden bg-white/5 flex items-center justify-center p-2">
        <img src={gun.image} alt={gun.name} className="max-h-full max-w-full object-contain drop-shadow-lg mix-blend-screen" />
      </div>

      <div className="space-y-2 mt-1">
        <StatBar label="DMG" value={gun.damage} color="bg-secondary" />
        <StatBar label="RNG" value={gun.range} color="bg-accent" />
        <StatBar label="ROF" value={gun.rateOfFire} color="bg-primary" />
      </div>
    </motion.div>
  );
}

export function MapCard({ map, isSelected, onClick }: { map: GameMap, isSelected?: boolean, onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
        map.isMain ? "col-span-2 md:col-span-3 aspect-[21/9]" : "aspect-video"
      } ${isSelected ? "border-primary shadow-[0_0_20px_rgba(244,180,26,0.4)]" : "border-white/10 hover:border-white/30"}`}
    >
      <img src={map.image} alt={map.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {map.isMain && (
        <div className="absolute top-4 left-4">
          <div className="px-3 py-1 bg-secondary text-white text-xs font-display font-bold tracking-widest uppercase rounded">Main Battleground</div>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4">
        <h3 className="font-display font-bold text-2xl text-white uppercase tracking-wider">{map.name}</h3>
        <div className="flex gap-3 text-sm text-gray-300 font-display tracking-widest mt-1">
          <span>{map.players} PLAYERS</span>
          <span>•</span>
          <span>{map.climate.toUpperCase()}</span>
        </div>
      </div>
    </motion.div>
  );
}

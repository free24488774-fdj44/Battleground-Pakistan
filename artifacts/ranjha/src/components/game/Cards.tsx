import { motion } from "framer-motion";
import { Lock, Check, Info, ShoppingCart, Coins, Gem } from "lucide-react";
import { Character, Pet, Gun, GameMap } from "@/lib/types";
import { RarityBadge } from "./RarityBadge";
import { StatBar } from "./StatBar";

interface BaseCardProps {
  name: string;
  image: string;
  isLocked?: boolean;
  unlockLevel?: number;
  isSelected?: boolean;
  isOwned?: boolean;
  priceCoins?: number;
  priceDiamonds?: number;
  onClick?: () => void;
  onBuy?: () => void;
  children?: React.ReactNode;
  className?: string;
}

function PriceTag({ coins, diamonds }: { coins?: number; diamonds?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {!!coins && (
        <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-[10px] font-display font-bold flex items-center gap-1">
          <Coins className="w-2.5 h-2.5" />{coins.toLocaleString()}
        </span>
      )}
      {!!diamonds && (
        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-display font-bold flex items-center gap-1">
          <Gem className="w-2.5 h-2.5" />{diamonds.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function BaseCard({
  name, image, isLocked, unlockLevel, isSelected, isOwned, priceCoins, priceDiamonds,
  onClick, onBuy, children, className = "",
}: BaseCardProps) {
  const showPriceOverlay = !isLocked && !isOwned && (!!priceCoins || !!priceDiamonds);
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={isLocked ? undefined : (isOwned ? onClick : undefined)}
      className={`relative rounded-lg overflow-hidden glass-panel border-2 transition-colors ${
        isOwned && !isLocked ? "cursor-pointer" : "cursor-default"
      } ${
        isSelected ? "border-primary shadow-[0_0_15px_rgba(244,180,26,0.3)]" : "border-white/10 hover:border-white/30"
      } ${isLocked ? "opacity-60 grayscale" : ""} ${className}`}
    >
      <div className="aspect-[3/4] relative">
        <img src={image} alt={name} className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
              <span className="font-display text-xs font-bold text-white uppercase tracking-widest">Lvl {unlockLevel}</span>
            </div>
          </div>
        )}

        {!isLocked && !isOwned && (
          <div className="absolute top-2 left-2">
            <PriceTag coins={priceCoins} diamonds={priceDiamonds} />
          </div>
        )}

        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {isOwned && !isSelected && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] font-display font-bold uppercase tracking-widest">Owned</div>
        )}
      </div>

      <div className="p-3 absolute bottom-0 left-0 w-full">
        <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide truncate">{name}</h3>
        {children}
        {showPriceOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            className="mt-2 w-full py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-display font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-transform"
            data-testid={`button-buy-${name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <ShoppingCart className="w-3 h-3" /> Buy
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function CharacterCard({
  character, isLocked, isSelected, isOwned, onClick, onBuy,
}: { character: Character; isLocked?: boolean; isSelected?: boolean; isOwned?: boolean; onClick?: () => void; onBuy?: () => void }) {
  return (
    <BaseCard
      name={character.name}
      image={character.portrait}
      isLocked={isLocked}
      unlockLevel={character.unlockLevel}
      isSelected={isSelected}
      isOwned={isOwned}
      priceCoins={character.priceCoins}
      onClick={onClick}
      onBuy={onBuy}
    >
      <RarityBadge rarity={character.rarity} className="mt-1 inline-block" />
      <div className="mt-2 text-xs text-gray-400 line-clamp-2 h-8 leading-tight">{character.ability}</div>
    </BaseCard>
  );
}

export function PetCard({
  pet, isLocked, isSelected, isOwned, onClick, onBuy,
}: { pet: Pet; isLocked?: boolean; isSelected?: boolean; isOwned?: boolean; onClick?: () => void; onBuy?: () => void }) {
  return (
    <BaseCard
      name={pet.name}
      image={pet.image}
      isLocked={isLocked}
      unlockLevel={pet.unlockLevel}
      isSelected={isSelected}
      isOwned={isOwned}
      priceCoins={pet.priceCoins}
      priceDiamonds={pet.priceDiamonds}
      onClick={onClick}
      onBuy={onBuy}
      className="aspect-square"
    >
      <RarityBadge rarity={pet.rarity} className="mt-1 inline-block" />
      <div className="mt-2 text-[10px] text-gray-400 line-clamp-2 h-7 leading-tight">{pet.ability}</div>
    </BaseCard>
  );
}

export function GunCard({
  gun, isSelected, isOwned, onClick, onBuy,
}: { gun: Gun; isSelected?: boolean; isOwned?: boolean; onClick?: () => void; onBuy?: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={isOwned ? onClick : undefined}
      className={`relative p-3 rounded-lg glass-panel border-2 transition-colors flex flex-col gap-3 ${
        isOwned ? "cursor-pointer" : "cursor-default"
      } ${isSelected ? "border-primary shadow-[0_0_15px_rgba(244,180,26,0.3)]" : "border-white/10 hover:border-white/30"}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg text-white uppercase truncate">{gun.name}</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{gun.category}</span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {isOwned && !isSelected && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] font-display font-bold uppercase tracking-widest">Owned</span>
          )}
          {!isOwned && (
            <PriceTag coins={gun.priceCoins} />
          )}
        </div>
      </div>

      <div className="h-24 relative rounded overflow-hidden bg-white/5 flex items-center justify-center p-2">
        <img src={gun.image} alt={gun.name} className="max-h-full max-w-full object-contain drop-shadow-lg mix-blend-screen" />
      </div>

      <div className="space-y-2 mt-1">
        <StatBar label="DMG" value={gun.damage} color="bg-secondary" />
        <StatBar label="RNG" value={gun.range} color="bg-accent" />
        <StatBar label="ROF" value={gun.rateOfFire} color="bg-primary" />
      </div>

      {!isOwned && (
        <button
          onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
          className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-display font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-transform"
          data-testid={`button-buy-gun-${gun.id}`}
        >
          <ShoppingCart className="w-3 h-3" /> Buy
        </button>
      )}
    </motion.div>
  );
}

export function MapCard({ map, isSelected, onClick, onInfo }: { map: GameMap, isSelected?: boolean, onClick?: () => void, onInfo?: () => void }) {
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

      <div className="absolute top-3 right-3 flex gap-1.5">
        {onInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            className="px-2 py-1 rounded-md bg-black/70 hover:bg-black border border-white/20 backdrop-blur-md text-[10px] font-display uppercase tracking-widest text-white flex items-center gap-1"
            data-testid={`button-map-info-${map.id}`}
          >
            <Info className="w-3 h-3" /> Details
          </button>
        )}
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-display mb-0.5">{map.region}</div>
        <h3 className="font-display font-bold text-2xl text-white uppercase tracking-wider">{map.name}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-300 font-display tracking-widest mt-1">
          <span>{map.players} PLAYERS</span>
          <span>•</span>
          <span>{map.climate.toUpperCase()}</span>
          <span>•</span>
          <span className="text-primary">LOOT: {map.lootTier.toUpperCase()}</span>
        </div>
      </div>
    </motion.div>
  );
}

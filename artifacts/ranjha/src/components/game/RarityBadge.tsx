import { Rarity } from "@/lib/types";

const rarityConfig: Record<Rarity, { color: string; label: string }> = {
  Common: { color: "text-gray-400 border-gray-400/30 bg-gray-400/10", label: "COMMON" },
  Rare: { color: "text-blue-400 border-blue-400/30 bg-blue-400/10", label: "RARE" },
  Epic: { color: "text-purple-400 border-purple-400/30 bg-purple-400/10", label: "EPIC" },
  Legendary: { color: "text-primary border-primary/30 bg-primary/10", label: "LEGENDARY" },
  Mythic: { color: "text-secondary border-secondary/30 bg-secondary/10", label: "MYTHIC" },
};

export function RarityBadge({ rarity, className = "" }: { rarity: Rarity; className?: string }) {
  const config = rarityConfig[rarity];
  
  return (
    <div className={`px-2 py-0.5 rounded border text-[10px] font-display tracking-widest ${config.color} ${className}`}>
      {config.label}
    </div>
  );
}

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  CHARACTERS,
  PETS,
  GUNS,
  OUTFITS,
  SKILLS,
  MAPS,
  MOCK_FRIENDS
} from "@/lib/mock-data";
import { Character, Pet, Gun, Outfit, Skill, GameMap, Friend } from "@/lib/types";
import { VEHICLES, DEFAULT_MODS, VehicleModsState } from "@/lib/vehicles";

interface PlayerProfile {
  uid: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  diamonds: number;
  avatar: string;
  ownedCharacters: string[];
  ownedPets: string[];
  ownedGuns: string[];
  ownedSkills: string[];
}

interface BattleStats {
  kills: number;
  survived: boolean;
  won: boolean;
  topTen: boolean;
}

interface BattleReward {
  coinsEarned: number;
  xpEarned: number;
  diamondsEarned: number;
  levelsGained: number;
  newLevel: number;
}

export type PurchaseResult =
  | { ok: true; message: string }
  | { ok: false; reason: "level" | "owned" | "coins" | "diamonds"; message: string };

interface GameState {
  profile: PlayerProfile | null;
  selectedCharacter: Character;
  selectedPet: Pet | null;
  selectedVehicleId: string;
  ownedVehicleIds: string[];
  ownsVehicle: (id: string) => boolean;
  selectVehicle: (id: string) => void;
  buyVehicle: (id: string, price: number) => boolean;
  getVehicleMods: (id: string) => VehicleModsState;
  updateVehicleMods: (id: string, partial: Partial<VehicleModsState>) => void;
  selectedPrimaryGun: Gun | null;
  selectedSecondaryGun: Gun | null;
  selectedOutfit: Outfit | null;
  selectedSkills: Skill[];
  selectedMap: GameMap;
  friends: Friend[];
}

interface GameContextType extends GameState {
  login: (type: 'google' | 'facebook' | 'guest', username?: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  equipCharacter: (character: Character) => void;
  equipPet: (pet: Pet) => void;
  equipPrimaryGun: (gun: Gun) => void;
  equipSecondaryGun: (gun: Gun) => void;
  equipOutfit: (outfit: Outfit) => void;
  toggleSkill: (skill: Skill) => void;
  selectMap: (map: GameMap) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (uid: string) => void;
  // economy
  purchaseCharacter: (c: Character) => PurchaseResult;
  purchasePet: (p: Pet) => PurchaseResult;
  purchaseGun: (g: Gun) => PurchaseResult;
  purchaseSkill: (s: Skill) => PurchaseResult;
  ownsCharacter: (id: string) => boolean;
  ownsPet: (id: string) => boolean;
  ownsGun: (id: string) => boolean;
  ownsSkill: (id: string) => boolean;
  awardBattleResults: (stats: BattleStats) => BattleReward;
  xpForLevel: (level: number) => number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STARTER_CHARACTER = "char_1";    // Ranjha
const STARTER_PET = "pet_1";           // Squirrel
const STARTER_GUNS = ["gun_1", "gun_8"]; // AK-47, Glock-18
const STARTER_SKILLS = ["skill_1", "skill_2"]; // Mughal Fury, Sindhi Shield

const DIAMONDS_PER_LEVEL = 50;

function makeStarterProfile(username?: string): PlayerProfile {
  return {
    uid: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    name: username && username.trim() ? username.trim() : `RanjhaWarrior${Math.floor(1000 + Math.random() * 9000)}`,
    level: 1,
    xp: 0,
    coins: 10000,
    diamonds: 0,
    avatar: "/assets/images/avatar-1.png",
    ownedCharacters: [STARTER_CHARACTER],
    ownedPets: [STARTER_PET],
    ownedGuns: [...STARTER_GUNS],
    ownedSkills: [...STARTER_SKILLS],
  };
}

// Migrate legacy profiles missing ownership fields
function migrate(p: PlayerProfile | null): PlayerProfile | null {
  if (!p) return p;
  return {
    ...p,
    ownedCharacters: p.ownedCharacters ?? [STARTER_CHARACTER],
    ownedPets: p.ownedPets ?? [STARTER_PET],
    ownedGuns: p.ownedGuns ?? [...STARTER_GUNS],
    ownedSkills: p.ownedSkills ?? [...STARTER_SKILLS],
    coins: typeof p.coins === "number" ? p.coins : 10000,
    diamonds: typeof p.diamonds === "number" ? p.diamonds : 0,
    level: p.level ?? 1,
    xp: p.xp ?? 0,
  };
}

const xpForLevel = (level: number) => 500 * Math.max(1, level);

export function GameProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    const saved = localStorage.getItem("ranjha_profile");
    return saved ? migrate(JSON.parse(saved)) : null;
  });

  const [selectedCharacter, setSelectedCharacter] = useState<Character>(() => {
    const saved = localStorage.getItem("ranjha_character");
    return saved ? JSON.parse(saved) : CHARACTERS[0];
  });

  const [selectedPet, setSelectedPet] = useState<Pet | null>(() => {
    const saved = localStorage.getItem("ranjha_pet");
    return saved ? JSON.parse(saved) : PETS[0]; // Squirrel — starter
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    const saved = localStorage.getItem("ranjha_vehicle_id");
    return saved ? JSON.parse(saved) : VEHICLES[0].id;
  });
  const [ownedVehicleIds, setOwnedVehicleIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("ranjha_owned_vehicles");
    return saved ? JSON.parse(saved) : [VEHICLES[0].id];
  });
  const [vehicleMods, setVehicleMods] = useState<Record<string, VehicleModsState>>(() => {
    const saved = localStorage.getItem("ranjha_vehicle_mods");
    return saved ? JSON.parse(saved) : { [VEHICLES[0].id]: DEFAULT_MODS };
  });

  useEffect(() => localStorage.setItem("ranjha_vehicle_id", JSON.stringify(selectedVehicleId)), [selectedVehicleId]);
  useEffect(() => localStorage.setItem("ranjha_owned_vehicles", JSON.stringify(ownedVehicleIds)), [ownedVehicleIds]);
  useEffect(() => localStorage.setItem("ranjha_vehicle_mods", JSON.stringify(vehicleMods)), [vehicleMods]);

  const ownsVehicle = (id: string) => ownedVehicleIds.includes(id);
  const selectVehicle = (id: string) => { if (ownsVehicle(id)) setSelectedVehicleId(id); };
  const buyVehicle = (id: string, price: number) => {
    if (ownsVehicle(id)) return false;
    if ((profile?.coins ?? 0) < price) return false;
    setOwnedVehicleIds(prev => [...prev, id]);
    setProfile(prev => prev ? { ...prev, coins: prev.coins - price } : prev);
    return true;
  };
  const getVehicleMods = (id: string): VehicleModsState => vehicleMods[id] ?? DEFAULT_MODS;
  const updateVehicleMods = (id: string, partial: Partial<VehicleModsState>) => {
    setVehicleMods(prev => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_MODS), ...partial } }));
  };

  const [selectedPrimaryGun, setSelectedPrimaryGun] = useState<Gun | null>(() => {
    const saved = localStorage.getItem("ranjha_primary_gun");
    return saved ? JSON.parse(saved) : GUNS[0]; // AK-47
  });

  const [selectedSecondaryGun, setSelectedSecondaryGun] = useState<Gun | null>(() => {
    const saved = localStorage.getItem("ranjha_secondary_gun");
    return saved ? JSON.parse(saved) : GUNS.find(g => g.id === "gun_8") || null; // Glock
  });

  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(() => {
    const saved = localStorage.getItem("ranjha_outfit");
    return saved ? JSON.parse(saved) : OUTFITS[0];
  });

  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(() => {
    const saved = localStorage.getItem("ranjha_skills");
    return saved ? JSON.parse(saved) : [SKILLS[0], SKILLS[1]];
  });

  const [selectedMap, setSelectedMap] = useState<GameMap>(() => {
    const saved = localStorage.getItem("ranjha_map");
    return saved ? JSON.parse(saved) : MAPS[0]; // Lahore Fort
  });

  const [friends, setFriends] = useState<Friend[]>(() => {
    const saved = localStorage.getItem("ranjha_friends");
    return saved ? JSON.parse(saved) : MOCK_FRIENDS;
  });

  // Save state changes to localStorage
  useEffect(() => {
    if (profile) localStorage.setItem("ranjha_profile", JSON.stringify(profile));
    else localStorage.removeItem("ranjha_profile");
  }, [profile]);

  useEffect(() => localStorage.setItem("ranjha_character", JSON.stringify(selectedCharacter)), [selectedCharacter]);
  useEffect(() => localStorage.setItem("ranjha_pet", JSON.stringify(selectedPet)), [selectedPet]);
  useEffect(() => localStorage.setItem("ranjha_primary_gun", JSON.stringify(selectedPrimaryGun)), [selectedPrimaryGun]);
  useEffect(() => localStorage.setItem("ranjha_secondary_gun", JSON.stringify(selectedSecondaryGun)), [selectedSecondaryGun]);
  useEffect(() => localStorage.setItem("ranjha_outfit", JSON.stringify(selectedOutfit)), [selectedOutfit]);
  useEffect(() => localStorage.setItem("ranjha_skills", JSON.stringify(selectedSkills)), [selectedSkills]);
  useEffect(() => localStorage.setItem("ranjha_map", JSON.stringify(selectedMap)), [selectedMap]);
  useEffect(() => localStorage.setItem("ranjha_friends", JSON.stringify(friends)), [friends]);

  const login = (_type: 'google' | 'facebook' | 'guest', username?: string) => {
    if (!profile) setProfile(makeStarterProfile(username));
  };

  const logout = () => {
    setProfile(null);
  };

  const updateProfile = (updates: Partial<PlayerProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const equipCharacter = (character: Character) => setSelectedCharacter(character);
  const equipPet = (pet: Pet) => setSelectedPet(pet);
  const equipPrimaryGun = (gun: Gun) => setSelectedPrimaryGun(gun);
  const equipSecondaryGun = (gun: Gun) => setSelectedSecondaryGun(gun);
  const equipOutfit = (outfit: Outfit) => setSelectedOutfit(outfit);
  const selectMap = (map: GameMap) => setSelectedMap(map);

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills(prev => {
      const exists = prev.find(s => s.id === skill.id);
      if (exists) return prev.filter(s => s.id !== skill.id);
      if (prev.length >= 4) return prev;
      return [...prev, skill];
    });
  };

  const addFriend = (friend: Friend) => {
    setFriends(prev => prev.find(f => f.uid === friend.uid) ? prev : [...prev, friend]);
  };
  const removeFriend = (uid: string) => setFriends(prev => prev.filter(f => f.uid !== uid));

  // ── Ownership ──
  const ownsCharacter = (id: string) => !!profile?.ownedCharacters.includes(id);
  const ownsPet       = (id: string) => !!profile?.ownedPets.includes(id);
  const ownsGun       = (id: string) => !!profile?.ownedGuns.includes(id);
  const ownsSkill     = (id: string) => !!profile?.ownedSkills.includes(id);

  // ── Purchases ──
  const purchaseCharacter = (c: Character): PurchaseResult => {
    if (!profile) return { ok: false, reason: "owned", message: "No active profile" };
    if (ownsCharacter(c.id)) return { ok: false, reason: "owned", message: `${c.name} already owned` };
    if (profile.level < c.unlockLevel) return { ok: false, reason: "level", message: `Reach level ${c.unlockLevel} first` };
    if (profile.coins < c.priceCoins) return { ok: false, reason: "coins", message: `Need ${(c.priceCoins - profile.coins).toLocaleString()} more coins` };
    setProfile(p => p ? { ...p, coins: p.coins - c.priceCoins, ownedCharacters: [...p.ownedCharacters, c.id] } : p);
    return { ok: true, message: `${c.name} unlocked!` };
  };

  const purchasePet = (p: Pet): PurchaseResult => {
    if (!profile) return { ok: false, reason: "owned", message: "No active profile" };
    if (ownsPet(p.id)) return { ok: false, reason: "owned", message: `${p.name} already owned` };
    if (profile.level < p.unlockLevel) return { ok: false, reason: "level", message: `Reach level ${p.unlockLevel} first` };
    if (profile.diamonds < p.priceDiamonds) return { ok: false, reason: "diamonds", message: `Need ${(p.priceDiamonds - profile.diamonds).toLocaleString()} more diamonds` };
    if (profile.coins < p.priceCoins) return { ok: false, reason: "coins", message: `Need ${(p.priceCoins - profile.coins).toLocaleString()} more coins` };
    setProfile(prev => prev ? {
      ...prev,
      coins: prev.coins - p.priceCoins,
      diamonds: prev.diamonds - p.priceDiamonds,
      ownedPets: [...prev.ownedPets, p.id],
    } : prev);
    return { ok: true, message: `${p.name} tamed!` };
  };

  const purchaseGun = (g: Gun): PurchaseResult => {
    if (!profile) return { ok: false, reason: "owned", message: "No active profile" };
    if (ownsGun(g.id)) return { ok: false, reason: "owned", message: `${g.name} already owned` };
    if (profile.coins < g.priceCoins) return { ok: false, reason: "coins", message: `Need ${(g.priceCoins - profile.coins).toLocaleString()} more coins` };
    setProfile(prev => prev ? { ...prev, coins: prev.coins - g.priceCoins, ownedGuns: [...prev.ownedGuns, g.id] } : prev);
    return { ok: true, message: `${g.name} added to armory!` };
  };

  const purchaseSkill = (s: Skill): PurchaseResult => {
    if (!profile) return { ok: false, reason: "owned", message: "No active profile" };
    if (ownsSkill(s.id)) return { ok: false, reason: "owned", message: `${s.name} already owned` };
    if (profile.coins < s.priceCoins) return { ok: false, reason: "coins", message: `Need ${(s.priceCoins - profile.coins).toLocaleString()} more coins` };
    setProfile(prev => prev ? { ...prev, coins: prev.coins - s.priceCoins, ownedSkills: [...prev.ownedSkills, s.id] } : prev);
    return { ok: true, message: `${s.name} learned!` };
  };

  // ── Battle rewards ──
  const awardBattleResults = (stats: BattleStats): BattleReward => {
    const coinsEarned =
      stats.kills * 50 +
      (stats.topTen ? 100 : 0) +
      (stats.won ? 500 : 0) +
      (stats.survived ? 50 : 0);
    const xpEarned =
      stats.kills * 25 +
      (stats.topTen ? 50 : 0) +
      (stats.won ? 250 : 0) +
      (stats.survived ? 25 : 0);

    if (!profile) {
      return { coinsEarned, xpEarned, diamondsEarned: 0, levelsGained: 0, newLevel: 1 };
    }

    let level = profile.level;
    let xp = profile.xp + xpEarned;
    let levelsGained = 0;
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
      levelsGained += 1;
      if (levelsGained > 20) break;
    }
    const diamondsEarned = levelsGained * DIAMONDS_PER_LEVEL;

    setProfile(prev => prev ? {
      ...prev,
      coins: prev.coins + coinsEarned,
      diamonds: prev.diamonds + diamondsEarned,
      xp,
      level,
    } : prev);

    return { coinsEarned, xpEarned, diamondsEarned, levelsGained, newLevel: level };
  };

  return (
    <GameContext.Provider value={{
      profile,
      selectedCharacter,
      selectedPet,
      selectedVehicleId,
      ownedVehicleIds,
      ownsVehicle,
      selectVehicle,
      buyVehicle,
      getVehicleMods,
      updateVehicleMods,
      selectedPrimaryGun,
      selectedSecondaryGun,
      selectedOutfit,
      selectedSkills,
      selectedMap,
      friends,
      login,
      logout,
      updateProfile,
      equipCharacter,
      equipPet,
      equipPrimaryGun,
      equipSecondaryGun,
      equipOutfit,
      toggleSkill,
      selectMap,
      addFriend,
      removeFriend,
      purchaseCharacter,
      purchasePet,
      purchaseGun,
      purchaseSkill,
      ownsCharacter,
      ownsPet,
      ownsGun,
      ownsSkill,
      awardBattleResults,
      xpForLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

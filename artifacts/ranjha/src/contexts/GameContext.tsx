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

interface PlayerProfile {
  uid: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  diamonds: number;
  avatar: string;
}

interface GameState {
  profile: PlayerProfile | null;
  selectedCharacter: Character;
  selectedPet: Pet | null;
  selectedPrimaryGun: Gun | null;
  selectedSecondaryGun: Gun | null;
  selectedOutfit: Outfit | null;
  selectedSkills: Skill[];
  selectedMap: GameMap;
  friends: Friend[];
}

interface GameContextType extends GameState {
  login: (type: 'google' | 'facebook' | 'guest') => void;
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const defaultProfile: PlayerProfile = {
  uid: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
  name: `RanjhaWarrior${Math.floor(1000 + Math.random() * 9000)}`,
  level: 7,
  xp: 450,
  coins: 15420,
  diamonds: 350,
  avatar: "/assets/images/avatar-1.png"
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    const saved = localStorage.getItem("ranjha_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedCharacter, setSelectedCharacter] = useState<Character>(() => {
    const saved = localStorage.getItem("ranjha_character");
    return saved ? JSON.parse(saved) : CHARACTERS[0];
  });

  const [selectedPet, setSelectedPet] = useState<Pet | null>(() => {
    const saved = localStorage.getItem("ranjha_pet");
    return saved ? JSON.parse(saved) : PETS[2]; // Monkey unlocked at lvl 5, player is lvl 7
  });

  const [selectedPrimaryGun, setSelectedPrimaryGun] = useState<Gun | null>(() => {
    const saved = localStorage.getItem("ranjha_primary_gun");
    return saved ? JSON.parse(saved) : GUNS[0]; // AK-47
  });

  const [selectedSecondaryGun, setSelectedSecondaryGun] = useState<Gun | null>(() => {
    const saved = localStorage.getItem("ranjha_secondary_gun");
    return saved ? JSON.parse(saved) : GUNS.find(g => g.category === 'Pistols') || null;
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

  const login = (type: 'google' | 'facebook' | 'guest') => {
    if (!profile) {
      setProfile(defaultProfile);
    }
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
    setFriends(prev => {
      if (prev.find(f => f.uid === friend.uid)) return prev;
      return [...prev, friend];
    });
  };

  const removeFriend = (uid: string) => {
    setFriends(prev => prev.filter(f => f.uid !== uid));
  };

  return (
    <GameContext.Provider value={{
      profile,
      selectedCharacter,
      selectedPet,
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
      removeFriend
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

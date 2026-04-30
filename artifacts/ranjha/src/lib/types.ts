export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface Character {
  id: string;
  name: string;
  rarity: Rarity;
  unlockLevel: number;
  ability: string;
  portrait: string;
  hp: number;
  speed: number;
  skillPower: number;
}

export interface Pet {
  id: string;
  name: string;
  rarity: Rarity;
  unlockLevel: number;
  ability: string;
  image: string;
}

export interface Gun {
  id: string;
  name: string;
  category: 'Assault Rifles' | 'SMGs' | 'Snipers' | 'Shotguns' | 'Pistols' | 'LMGs' | 'Melee' | 'Throwables';
  damage: number;
  range: number;
  rateOfFire: number;
  image: string;
}

export interface Outfit {
  id: string;
  name: string;
  image: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'Active' | 'Passive';
  cooldown: number;
  description: string;
}

export interface MapPOI {
  name: string;
  type: 'Loot' | 'Sniper' | 'Vehicle' | 'Safe' | 'Hot Zone' | 'Boss';
  x: number; // % position 0-100
  y: number;
  description: string;
}

export interface GameMap {
  id: string;
  name: string;
  region: string;
  image: string;
  players: number;
  climate: string;
  terrain: string;
  recommendedMode: 'Solo' | 'Duo' | 'Squad' | 'All';
  lootTier: 'Low' | 'Medium' | 'High' | 'Extreme';
  dangerLevel: 1 | 2 | 3 | 4 | 5;
  description: string;
  pois: MapPOI[];
  weather: string;
  vehicles: string[];
  isMain?: boolean;
}

export interface Friend {
  uid: string;
  name: string;
  level: number;
  isOnline: boolean;
  avatar: string;
}

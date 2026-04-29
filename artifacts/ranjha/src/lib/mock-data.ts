import { Character, Pet, Gun, Outfit, Skill, GameMap, Friend } from "./types";

import heroRanjha from "@/assets/images/hero-ranjha.png";
import heroHeer from "@/assets/images/hero-heer.png";
import petMonkey from "@/assets/images/pet-monkey.png";
import gunAr from "@/assets/images/gun-ar.png";
import outfitMughal from "@/assets/images/outfit-mughal.png";
import avatar1 from "@/assets/images/avatar-1.png";

import mapLahoreFort from "@/assets/images/maps/map-lahore.jpg";
import mapHunza from "@/assets/images/maps/map-hunza.avif";
import mapKarachi from "@/assets/images/maps/map-karachi.png";
import mapMargalla from "@/assets/images/maps/map-margalla.webp";
import mapFaisalabad from "@/assets/images/maps/map-faisalabad.jpg";
import mapMultan from "@/assets/images/maps/map-multan.jpg";
import mapQuetta from "@/assets/images/maps/map-quetta.webp";
import mapPeshawar from "@/assets/images/maps/map-peshawar.jpg";
import mapMurree from "@/assets/images/maps/map-murree.avif";
import mapSkardu from "@/assets/images/maps/map-skardu.jpg";
import mapNaran from "@/assets/images/maps/map-naran.webp";
import mapFortress from "@/assets/images/maps/map-fortress.jpg";

// 45 Characters
const names = [
  "Mirza", "Sahiban", "Sohni", "Mahiwal", "Sultan", "Zarina", "Bilal", "Ayesha", "Tariq", "Khalid",
  "Saif", "Zara", "Omar", "Hassan", "Ali", "Fatima", "Zainab", "Hamza", "Usman", "Khadija",
  "Farooq", "Shahid", "Imran", "Nadia", "Sana", "Kamran", "Faisal", "Sadia", "Rida", "Adil",
  "Waqas", "Noman", "Iqra", "Kiran", "Salman", "Yasir", "Farhan", "Hina", "Nida", "Junaid",
  "Shoaib", "Amir", "Asif"
];

export const CHARACTERS: Character[] = [
  {
    id: "char_1",
    name: "Ranjha",
    rarity: "Legendary",
    unlockLevel: 1,
    ability: "Mughal Fury: Increases damage by 20% for 5s when HP is below 30%",
    portrait: heroRanjha,
    hp: 100,
    speed: 85,
    skillPower: 90
  },
  {
    id: "char_2",
    name: "Heer",
    rarity: "Epic",
    unlockLevel: 1,
    ability: "Sindhi Stealth: Become invisible to mini-map radar for 10s",
    portrait: heroHeer,
    hp: 90,
    speed: 95,
    skillPower: 80
  },
  ...names.map((name, i) => ({
    id: `char_${i + 3}`,
    name,
    rarity: (i % 5 === 0) ? "Epic" : (i % 3 === 0) ? "Rare" : "Common" as any,
    unlockLevel: (i + 1) * 2 + 1,
    ability: `Passive: Enhances ${['speed', 'defense', 'healing', 'reload', 'accuracy'][i % 5]} by ${Math.floor(Math.random() * 10 + 5)}%`,
    portrait: i % 2 === 0 ? heroRanjha : heroHeer,
    hp: 80 + Math.floor(Math.random() * 20),
    speed: 70 + Math.floor(Math.random() * 25),
    skillPower: 60 + Math.floor(Math.random() * 35)
  }))
];

export const PETS: Pet[] = [
  { id: "pet_1", name: "Squirrel", rarity: "Common", unlockLevel: 1, ability: "Finds extra ammo in loot", image: petMonkey },
  { id: "pet_2", name: "Rabbit", rarity: "Common", unlockLevel: 3, ability: "Increases sprint speed by 2%", image: petMonkey },
  { id: "pet_3", name: "Monkey", rarity: "Rare", unlockLevel: 5, ability: "Fights enemies in close combat", image: petMonkey },
  { id: "pet_4", name: "Hawk", rarity: "Rare", unlockLevel: 8, ability: "Spots enemies from high ground", image: petMonkey },
  { id: "pet_5", name: "Wolf", rarity: "Epic", unlockLevel: 10, ability: "Howls to reveal nearby enemies", image: petMonkey },
  { id: "pet_6", name: "Elephant", rarity: "Epic", unlockLevel: 12, ability: "Stronger combat ability than Monkey, charges enemies", image: petMonkey },
  { id: "pet_7", name: "Panther", rarity: "Epic", unlockLevel: 20, ability: "Silent footsteps for the player", image: petMonkey },
  { id: "pet_8", name: "Falcon", rarity: "Epic", unlockLevel: 30, ability: "Increases parachute drop speed", image: petMonkey },
  { id: "pet_9", name: "Bear", rarity: "Legendary", unlockLevel: 45, ability: "Absorbs 1 bullet hit every 60s", image: petMonkey },
  { id: "pet_10", name: "Lion", rarity: "Legendary", unlockLevel: 60, ability: "Intimidates enemies, reducing their fire rate", image: petMonkey },
  { id: "pet_11", name: "Tiger", rarity: "Legendary", unlockLevel: 80, ability: "Deals bleed damage to enemies hit", image: petMonkey },
  { id: "pet_12", name: "Snow Leopard", rarity: "Legendary", unlockLevel: 100, ability: "Grants thermal vision in snow areas", image: petMonkey },
  { id: "pet_13", name: "Rhino", rarity: "Legendary", unlockLevel: 130, ability: "Can break through destructible walls", image: petMonkey },
  { id: "pet_14", name: "Dragon Komodo", rarity: "Mythic", unlockLevel: 160, ability: "Spits poison that slows enemies", image: petMonkey },
  { id: "pet_15", name: "Phoenix", rarity: "Mythic", unlockLevel: 200, ability: "Revives player once per match", image: petMonkey },
];

export const GUNS: Gun[] = [
  { id: "gun_1", name: "AK-47", category: "Assault Rifles", damage: 85, range: 60, rateOfFire: 65, image: gunAr },
  { id: "gun_2", name: "M4A1", category: "Assault Rifles", damage: 75, range: 65, rateOfFire: 80, image: gunAr },
  { id: "gun_3", name: "AWM", category: "Snipers", damage: 100, range: 100, rateOfFire: 10, image: gunAr },
  { id: "gun_4", name: "Kar98K", category: "Snipers", damage: 90, range: 90, rateOfFire: 15, image: gunAr },
  { id: "gun_5", name: "MP5", category: "SMGs", damage: 45, range: 35, rateOfFire: 90, image: gunAr },
  { id: "gun_6", name: "UMP-45", category: "SMGs", damage: 50, range: 40, rateOfFire: 85, image: gunAr },
  { id: "gun_7", name: "Desert Eagle", category: "Pistols", damage: 65, range: 30, rateOfFire: 30, image: gunAr },
  { id: "gun_8", name: "Glock-18", category: "Pistols", damage: 30, range: 25, rateOfFire: 70, image: gunAr },
  { id: "gun_9", name: "M1014", category: "Shotguns", damage: 95, range: 15, rateOfFire: 25, image: gunAr },
  { id: "gun_10", name: "S12K", category: "Shotguns", damage: 80, range: 20, rateOfFire: 40, image: gunAr },
  { id: "gun_11", name: "M249", category: "LMGs", damage: 70, range: 55, rateOfFire: 85, image: gunAr },
  { id: "gun_12", name: "Karambit", category: "Melee", damage: 55, range: 5, rateOfFire: 95, image: gunAr },
  { id: "gun_13", name: "Pan", category: "Melee", damage: 90, range: 5, rateOfFire: 20, image: gunAr },
  { id: "gun_14", name: "Frag Grenade", category: "Throwables", damage: 100, range: 40, rateOfFire: 0, image: gunAr },
  { id: "gun_15", name: "Smoke", category: "Throwables", damage: 0, range: 40, rateOfFire: 0, image: gunAr },
  { id: "gun_16", name: "Molotov", category: "Throwables", damage: 80, range: 40, rateOfFire: 0, image: gunAr },
];

export const OUTFITS: Outfit[] = [
  { id: "outfit_1", name: "Mughal Warlord", image: outfitMughal },
  { id: "outfit_2", name: "Silk Route Bandit", image: outfitMughal },
  { id: "outfit_3", name: "Lahori Don", image: outfitMughal },
  { id: "outfit_4", name: "Sindhi Raider", image: outfitMughal },
  { id: "outfit_5", name: "Hunza Sniper", image: outfitMughal },
  { id: "outfit_6", name: "Karachi Streetfighter", image: outfitMughal },
  { id: "outfit_7", name: "Desert Nomad", image: outfitMughal },
  { id: "outfit_8", name: "Mountain Ghost", image: outfitMughal },
  { id: "outfit_9", name: "Royal Guard", image: outfitMughal },
  { id: "outfit_10", name: "Urban Ninja", image: outfitMughal },
  { id: "outfit_11", name: "Wasteland Survivor", image: outfitMughal },
  { id: "outfit_12", name: "Cyber Samurai", image: outfitMughal },
];

export const SKILLS: Skill[] = [
  { id: "skill_1", name: "Mughal Fury", type: "Active", cooldown: 60, description: "Instantly heal 50 HP and gain 20% movement speed for 8s." },
  { id: "skill_2", name: "Sindhi Shield", type: "Active", cooldown: 45, description: "Deploy a frontal energy shield that absorbs 500 damage." },
  { id: "skill_3", name: "Pathan Rage", type: "Passive", cooldown: 0, description: "Damage increases by 10% for every enemy killed (max 3 stacks)." },
  { id: "skill_4", name: "Punjabi Warcry", type: "Active", cooldown: 90, description: "Reveal all enemies within 50m for 5 seconds." },
  { id: "skill_5", name: "Sufi Mist", type: "Active", cooldown: 50, description: "Create a dense smoke screen that heals allies inside." },
  { id: "skill_6", name: "Eagle Eye", type: "Passive", cooldown: 0, description: "Sniper rifles deal 15% more headshot damage." },
];

export const MAPS: GameMap[] = [
  { id: "map_1",  name: "Lahore Fort",                  image: mapLahoreFort, players: 50, climate: "Urban / Historical",   isMain: true },
  { id: "map_2",  name: "Hunza Valley",                 image: mapHunza,      players: 50, climate: "Mountain / Snow" },
  { id: "map_3",  name: "Karachi Seaview",              image: mapKarachi,    players: 50, climate: "Coastal / Urban" },
  { id: "map_4",  name: "Margalla Hills, Islamabad",    image: mapMargalla,   players: 50, climate: "Forest / Hills" },
  { id: "map_5",  name: "Faisalabad Clock Tower",       image: mapFaisalabad, players: 50, climate: "Urban / Dense" },
  { id: "map_6",  name: "Multan Bazaar",                image: mapMultan,     players: 50, climate: "Urban / Desert" },
  { id: "map_7",  name: "Quetta Mountains",             image: mapQuetta,     players: 50, climate: "Mountain / Arid" },
  { id: "map_8",  name: "Peshawar Old City",            image: mapPeshawar,   players: 50, climate: "Urban / Historical" },
  { id: "map_9",  name: "Murree Hills",                 image: mapMurree,     players: 50, climate: "Forest / Snow" },
  { id: "map_10", name: "Skardu Lake",                  image: mapSkardu,     players: 50, climate: "Lakeside / Mountain" },
  { id: "map_11", name: "Naran Kaghan",                 image: mapNaran,      players: 50, climate: "Valley / River" },
  { id: "map_12", name: "Fortress Stadium, Lahore",     image: mapFortress,   players: 50, climate: "Stadium / Urban" },
];

export const MOCK_FRIENDS: Friend[] = [
  { uid: "1029384756", name: "PindiBoy", level: 45, isOnline: true, avatar: avatar1 },
  { uid: "9876543210", name: "LahoriKing", level: 120, isOnline: true, avatar: avatar1 },
  { uid: "5647382910", name: "SindhiSniper", level: 88, isOnline: false, avatar: avatar1 },
  { uid: "2345678901", name: "QuettaDon", level: 15, isOnline: true, avatar: avatar1 },
  { uid: "3456789012", name: "KarachiGamer", level: 200, isOnline: false, avatar: avatar1 },
];

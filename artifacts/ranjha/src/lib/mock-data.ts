import { Character, Pet, Gun, Outfit, Skill, GameMap, Friend } from "./types";

import gunAr from "@/assets/images/gun-ar.png";
import outfitMughal from "@/assets/images/outfit-mughal.png";
import avatar1 from "@/assets/images/avatar-1.png";

// 10 unique character portraits, rotated across 45 chars
import face01 from "@/assets/images/characters/face-01.png";
import face02 from "@/assets/images/characters/face-02.png";
import face03 from "@/assets/images/characters/face-03.png";
import face04 from "@/assets/images/characters/face-04.png";
import face05 from "@/assets/images/characters/face-05.png";
import face06 from "@/assets/images/characters/face-06.png";
import face07 from "@/assets/images/characters/face-07.png";
import face08 from "@/assets/images/characters/face-08.png";
import face09 from "@/assets/images/characters/face-09.png";
import face10 from "@/assets/images/characters/face-10.png";

const FACES = [face01, face02, face03, face04, face05, face06, face07, face08, face09, face10];

// 15 distinct real animal photos for pets
import petSquirrel from "@/assets/images/pets/pet-squirrel.jpg";
import petRabbit from "@/assets/images/pets/pet-rabbit.jpg";
import petMonkey from "@/assets/images/pets/pet-monkey.jpg";
import petHawk from "@/assets/images/pets/pet-hawk.jpg";
import petWolf from "@/assets/images/pets/pet-wolf.jpg";
import petElephant from "@/assets/images/pets/pet-elephant.jpg";
import petPanther from "@/assets/images/pets/pet-panther.jpg";
import petFalcon from "@/assets/images/pets/pet-falcon.jpg";
import petBear from "@/assets/images/pets/pet-bear.jpg";
import petLion from "@/assets/images/pets/pet-lion.jpg";
import petTiger from "@/assets/images/pets/pet-tiger.jpg";
import petSnowLeopard from "@/assets/images/pets/pet-snowleopard.jpg";
import petRhino from "@/assets/images/pets/pet-rhino.jpg";
import petKomodo from "@/assets/images/pets/pet-komodo.webp";
import petPhoenix from "@/assets/images/pets/pet-phoenix.jpg";

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

// ─── 45 Characters with rotated unique faces ────────────────────────────────
const allCharNames = [
  "Ranjha", "Heer",
  "Mirza", "Sahiban", "Sohni", "Mahiwal", "Sultan", "Zarina", "Bilal", "Ayesha", "Tariq", "Khalid",
  "Saif", "Zara", "Omar", "Hassan", "Ali", "Fatima", "Zainab", "Hamza", "Usman", "Khadija",
  "Farooq", "Shahid", "Imran", "Nadia", "Sana", "Kamran", "Faisal", "Sadia", "Rida", "Adil",
  "Waqas", "Noman", "Iqra", "Kiran", "Salman", "Yasir", "Farhan", "Hina", "Nida", "Junaid",
  "Shoaib", "Amir", "Asif"
];

// Pre-defined hero stats for the two main characters
const HERO_OVERRIDES: Record<string, Partial<Character>> = {
  "Ranjha": { rarity: "Legendary", unlockLevel: 1, ability: "Mughal Fury: Increases damage by 20% for 5s when HP is below 30%", hp: 100, speed: 85, skillPower: 90 },
  "Heer":   { rarity: "Epic",      unlockLevel: 1, ability: "Sindhi Stealth: Become invisible to mini-map radar for 10s", hp: 90, speed: 95, skillPower: 80 },
};

// Deterministic rotation: pick faces so consecutive chars differ. Using offset-based rotation.
function pickFace(i: number): string {
  // Use a stride of 3 to spread faces — neighbors won't repeat for ≥10 chars.
  return FACES[(i * 3) % FACES.length];
}

const RARITIES: Character["rarity"][] = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const ABILITIES_POOL = [
  "Quickdraw: Reload 25% faster on first reload after kill",
  "Iron Lungs: Sprint 15% longer before fatigue",
  "Bandit's Eye: Spot loot through walls within 8m",
  "Ghost Step: Footsteps are silent while crouched",
  "Stone Skin: Take 10% less damage from explosives",
  "Sharpshooter: +20% headshot damage with snipers",
  "Rapid Heal: Medkit use is 30% faster",
  "Last Stand: Revives in 10s with 50 HP after a downed teammate revives you",
  "Kashmir Storm: Throwables fly 25% farther",
  "Falcon Strike: Pet damage +30%",
];

export const CHARACTERS: Character[] = allCharNames.map((name, i) => {
  const ov = HERO_OVERRIDES[name];
  const face = pickFace(i);
  if (ov) {
    return {
      id: `char_${i + 1}`,
      name,
      portrait: face,
      ...ov,
    } as Character;
  }
  return {
    id: `char_${i + 1}`,
    name,
    rarity: RARITIES[i % RARITIES.length],
    unlockLevel: Math.min(200, 2 + i * 4),
    ability: ABILITIES_POOL[i % ABILITIES_POOL.length],
    portrait: face,
    hp: 75 + ((i * 7) % 26),     // 75..100, deterministic
    speed: 70 + ((i * 11) % 26),  // 70..95
    skillPower: 60 + ((i * 13) % 36), // 60..95
  };
});

// ─── 15 Pets with unique images ─────────────────────────────────────────────
export const PETS: Pet[] = [
  { id: "pet_1",  name: "Squirrel",     rarity: "Common",    unlockLevel: 1,   ability: "Finds extra ammo in loot piles",                    image: petSquirrel },
  { id: "pet_2",  name: "Rabbit",       rarity: "Common",    unlockLevel: 3,   ability: "Increases sprint speed by 2%",                      image: petRabbit },
  { id: "pet_3",  name: "Monkey",       rarity: "Rare",      unlockLevel: 5,   ability: "Fights enemies in close combat",                    image: petMonkey },
  { id: "pet_4",  name: "Hawk",         rarity: "Rare",      unlockLevel: 8,   ability: "Spots enemies on ridgelines and rooftops",          image: petHawk },
  { id: "pet_5",  name: "Wolf",         rarity: "Epic",      unlockLevel: 10,  ability: "Howls to reveal nearby enemies on the mini-map",    image: petWolf },
  { id: "pet_6",  name: "Elephant",     rarity: "Epic",      unlockLevel: 12,  ability: "Charges enemies, breaks through doors",             image: petElephant },
  { id: "pet_7",  name: "Panther",      rarity: "Epic",      unlockLevel: 20,  ability: "Grants silent footsteps to the player",             image: petPanther },
  { id: "pet_8",  name: "Falcon",       rarity: "Epic",      unlockLevel: 30,  ability: "Increases parachute drop speed during deployment",  image: petFalcon },
  { id: "pet_9",  name: "Bear",         rarity: "Legendary", unlockLevel: 45,  ability: "Absorbs 1 bullet hit every 60s",                    image: petBear },
  { id: "pet_10", name: "Lion",         rarity: "Legendary", unlockLevel: 60,  ability: "Intimidates enemies, reducing their fire rate",     image: petLion },
  { id: "pet_11", name: "Tiger",        rarity: "Legendary", unlockLevel: 80,  ability: "Deals bleed damage on every hit",                   image: petTiger },
  { id: "pet_12", name: "Snow Leopard", rarity: "Legendary", unlockLevel: 100, ability: "Grants thermal vision in snow areas",               image: petSnowLeopard },
  { id: "pet_13", name: "Rhino",        rarity: "Legendary", unlockLevel: 130, ability: "Can break through destructible walls",              image: petRhino },
  { id: "pet_14", name: "Komodo",       rarity: "Mythic",    unlockLevel: 160, ability: "Spits poison that slows enemies",                   image: petKomodo },
  { id: "pet_15", name: "Phoenix",      rarity: "Mythic",    unlockLevel: 200, ability: "Revives the player once per match",                 image: petPhoenix },
];

// ─── Guns ───────────────────────────────────────────────────────────────────
export const GUNS: Gun[] = [
  { id: "gun_1",  name: "AK-47",         category: "Assault Rifles", damage: 85, range: 60, rateOfFire: 65, image: gunAr },
  { id: "gun_2",  name: "M4A1",          category: "Assault Rifles", damage: 75, range: 65, rateOfFire: 80, image: gunAr },
  { id: "gun_3",  name: "AWM",           category: "Snipers",        damage: 100, range: 100, rateOfFire: 10, image: gunAr },
  { id: "gun_4",  name: "Kar98K",        category: "Snipers",        damage: 90, range: 90, rateOfFire: 15, image: gunAr },
  { id: "gun_5",  name: "MP5",           category: "SMGs",           damage: 45, range: 35, rateOfFire: 90, image: gunAr },
  { id: "gun_6",  name: "UMP-45",        category: "SMGs",           damage: 50, range: 40, rateOfFire: 85, image: gunAr },
  { id: "gun_7",  name: "Desert Eagle",  category: "Pistols",        damage: 65, range: 30, rateOfFire: 30, image: gunAr },
  { id: "gun_8",  name: "Glock-18",      category: "Pistols",        damage: 30, range: 25, rateOfFire: 70, image: gunAr },
  { id: "gun_9",  name: "M1014",         category: "Shotguns",       damage: 95, range: 15, rateOfFire: 25, image: gunAr },
  { id: "gun_10", name: "S12K",          category: "Shotguns",       damage: 80, range: 20, rateOfFire: 40, image: gunAr },
  { id: "gun_11", name: "M249",          category: "LMGs",           damage: 70, range: 55, rateOfFire: 85, image: gunAr },
  { id: "gun_12", name: "Karambit",      category: "Melee",          damage: 55, range: 5,  rateOfFire: 95, image: gunAr },
  { id: "gun_13", name: "Pan",           category: "Melee",          damage: 90, range: 5,  rateOfFire: 20, image: gunAr },
  { id: "gun_14", name: "Frag Grenade",  category: "Throwables",     damage: 100, range: 40, rateOfFire: 0, image: gunAr },
  { id: "gun_15", name: "Smoke",         category: "Throwables",     damage: 0,  range: 40, rateOfFire: 0, image: gunAr },
  { id: "gun_16", name: "Molotov",       category: "Throwables",     damage: 80, range: 40, rateOfFire: 0, image: gunAr },
];

export const OUTFITS: Outfit[] = [
  { id: "outfit_1",  name: "Mughal Warlord",        image: outfitMughal },
  { id: "outfit_2",  name: "Silk Route Bandit",     image: outfitMughal },
  { id: "outfit_3",  name: "Lahori Don",            image: outfitMughal },
  { id: "outfit_4",  name: "Sindhi Raider",         image: outfitMughal },
  { id: "outfit_5",  name: "Hunza Sniper",          image: outfitMughal },
  { id: "outfit_6",  name: "Karachi Streetfighter", image: outfitMughal },
  { id: "outfit_7",  name: "Desert Nomad",          image: outfitMughal },
  { id: "outfit_8",  name: "Mountain Ghost",        image: outfitMughal },
  { id: "outfit_9",  name: "Royal Guard",           image: outfitMughal },
  { id: "outfit_10", name: "Urban Ninja",           image: outfitMughal },
  { id: "outfit_11", name: "Wasteland Survivor",    image: outfitMughal },
  { id: "outfit_12", name: "Cyber Samurai",         image: outfitMughal },
];

export const SKILLS: Skill[] = [
  { id: "skill_1", name: "Mughal Fury",    type: "Active",  cooldown: 60, description: "Instantly heal 50 HP and gain 20% movement speed for 8s." },
  { id: "skill_2", name: "Sindhi Shield",  type: "Active",  cooldown: 45, description: "Deploy a frontal energy shield that absorbs 500 damage." },
  { id: "skill_3", name: "Pathan Rage",    type: "Passive", cooldown: 0,  description: "Damage increases by 10% for every enemy killed (max 3 stacks)." },
  { id: "skill_4", name: "Punjabi Warcry", type: "Active",  cooldown: 90, description: "Reveal all enemies within 50m for 5 seconds." },
  { id: "skill_5", name: "Sufi Mist",      type: "Active",  cooldown: 50, description: "Create a dense smoke screen that heals allies inside." },
  { id: "skill_6", name: "Eagle Eye",      type: "Passive", cooldown: 0,  description: "Sniper rifles deal 15% more headshot damage." },
];

// ─── 12 Maps with full GTA-style detail ─────────────────────────────────────
export const MAPS: GameMap[] = [
  {
    id: "map_1", name: "Lahore Fort", region: "Punjab", image: mapLahoreFort, players: 50, isMain: true,
    climate: "Urban / Historical", terrain: "Stone fortress, courtyards, narrow alleys",
    recommendedMode: "Squad", lootTier: "Extreme", dangerLevel: 5, weather: "Clear, dust haze",
    description: "The crown jewel of the Mughal era turned into a sprawling battleground. Marble pavilions, hidden tunnels under the Sheesh Mahal, and rooftop sniper nests across the Alamgiri Gate. Loot is the richest in the game — but every squad knows it, and the courtyard is a meat grinder by minute three.",
    pois: [
      { name: "Alamgiri Gate", type: "Hot Zone", x: 18, y: 30, description: "Main entry — extreme firefights every match" },
      { name: "Sheesh Mahal",  type: "Loot",     x: 55, y: 20, description: "Mirror palace — guaranteed legendary loot, but exposed roof" },
      { name: "Naulakha Pavilion", type: "Sniper", x: 70, y: 45, description: "Marble pavilion overlooking the courtyard" },
      { name: "Hathi Pol", type: "Vehicle", x: 25, y: 65, description: "Elephant Gate — armored jeep spawn" },
      { name: "Royal Bath",  type: "Safe",     x: 80, y: 75, description: "Underground hammam — no rotation, low risk" },
    ],
    vehicles: ["Armored Jeep", "Tonga Cart", "Motorbike"],
  },
  {
    id: "map_2", name: "Hunza Valley", region: "Gilgit-Baltistan", image: mapHunza, players: 50,
    climate: "Mountain / Snow", terrain: "Glacier ridges, cliff villages, pine forests",
    recommendedMode: "Squad", lootTier: "High", dangerLevel: 4, weather: "Snowfall, low visibility",
    description: "Karakoram's frozen jewel. Drop near Baltit Fort or the Attabad Lake bridge. Snow muffles footsteps, but bright clothing makes you a target on the white slopes. Snow Leopard pets thrive here.",
    pois: [
      { name: "Baltit Fort", type: "Hot Zone", x: 30, y: 25, description: "900-year-old fort on the cliff — fortified loot stash" },
      { name: "Attabad Lake", type: "Vehicle", x: 65, y: 55, description: "Turquoise lake — boat spawn for fast rotations" },
      { name: "Eagle's Nest", type: "Sniper", x: 75, y: 15, description: "Highest point on the map — controls the valley" },
      { name: "Hopper Glacier", type: "Loot", x: 20, y: 75, description: "Ice cave with hidden weapon crates" },
      { name: "Karimabad Bazaar", type: "Safe", x: 45, y: 65, description: "Sleepy village — rare vertical fights" },
    ],
    vehicles: ["Snowmobile", "4x4 Pickup", "Boat"],
  },
  {
    id: "map_3", name: "Karachi Seaview", region: "Sindh", image: mapKarachi, players: 50,
    climate: "Coastal / Urban", terrain: "Beachfront, high-rises, promenade",
    recommendedMode: "Duo", lootTier: "High", dangerLevel: 4, weather: "Humid, sea breeze",
    description: "Where the Arabian Sea meets the city of lights. Sniper towers on Do Darya rooftops, vehicle chases down the coastal highway, and last-stand fights inside the Dolmen Mall food court.",
    pois: [
      { name: "Clifton Beach", type: "Hot Zone", x: 50, y: 70, description: "Wide-open sand — no cover, all tracers" },
      { name: "Do Darya Rooftop", type: "Sniper", x: 25, y: 30, description: "Restaurant tower — full coast field of view" },
      { name: "Dolmen Mall", type: "Loot", x: 70, y: 25, description: "Indoor — close-quarters, premium gear" },
      { name: "Submarine Park", type: "Safe", x: 15, y: 80, description: "Decommissioned sub display — great cover" },
      { name: "Coastal Highway", type: "Vehicle", x: 60, y: 55, description: "Sports car spawn — fastest lap on the map" },
    ],
    vehicles: ["Sports Car", "Rickshaw", "Jet Ski"],
  },
  {
    id: "map_4", name: "Margalla Hills", region: "Islamabad Capital", image: mapMargalla, players: 50,
    climate: "Forest / Hills", terrain: "Pine forest, hiking trails, viewpoints",
    recommendedMode: "Solo", lootTier: "Medium", dangerLevel: 3, weather: "Misty mornings",
    description: "Pakistan's quietest battleground — dense pine cover and steep hiking trails reward stealth solos. Daman-e-Koh viewpoint is the high-ground prize, and Pir Sohawa's restaurants hide premium loot.",
    pois: [
      { name: "Daman-e-Koh", type: "Sniper", x: 50, y: 25, description: "Capital city viewpoint — dominates the lower slopes" },
      { name: "Pir Sohawa", type: "Loot", x: 75, y: 35, description: "Restaurant strip with rare drops" },
      { name: "Trail 5 Camp", type: "Safe", x: 30, y: 65, description: "Hidden hiker camp — pristine respawn point" },
      { name: "Faisal Masjid Gate", type: "Hot Zone", x: 60, y: 80, description: "Boundary — loot run gauntlet" },
      { name: "Monal Ridge", type: "Vehicle", x: 20, y: 40, description: "Off-road jeep spawn" },
    ],
    vehicles: ["Off-Road Jeep", "Mountain Bike"],
  },
  {
    id: "map_5", name: "Faisalabad Clock Tower", region: "Punjab", image: mapFaisalabad, players: 50,
    climate: "Urban / Dense", terrain: "Eight-bazaar wheel, narrow shop alleys",
    recommendedMode: "Squad", lootTier: "High", dangerLevel: 4, weather: "Hot, smoggy",
    description: "The Lyallpur Ghanta Ghar at the center, with eight bazaar streets radiating out like a wheel. The clock tower roof is a sniper's dream. Each bazaar (Aminpur, Bhowana, Chiniot, Jhang, Kacheri, Karkhana, Montgomery, Rail) has its own loot tier.",
    pois: [
      { name: "Clock Tower Top", type: "Sniper", x: 50, y: 50, description: "Center of the map — sees all 8 bazaars" },
      { name: "Aminpur Bazaar", type: "Loot", x: 25, y: 25, description: "Cloth market — rare outfit drops" },
      { name: "Karkhana Bazaar", type: "Vehicle", x: 75, y: 25, description: "Industrial — armored truck spawn" },
      { name: "Jhang Bazaar", type: "Hot Zone", x: 75, y: 75, description: "Wholesale — early-game brawl" },
      { name: "Rail Bazaar", type: "Safe", x: 25, y: 75, description: "Quiet alleys near the tracks" },
    ],
    vehicles: ["Armored Truck", "Rickshaw", "Motorbike"],
  },
  {
    id: "map_6", name: "Multan Bazaar", region: "Punjab", image: mapMultan, players: 50,
    climate: "Urban / Desert", terrain: "Ancient walled city, blue-tiled shrines",
    recommendedMode: "Duo", lootTier: "Medium", dangerLevel: 3, weather: "Dry heat, dust devils",
    description: "City of saints and sun. Wind through the bazaars under the shadow of Shah Rukn-e-Alam's tomb. Dust storms cut visibility every 90 seconds — a sniper's enemy and a flanker's friend.",
    pois: [
      { name: "Shah Rukn-e-Alam Tomb", type: "Loot", x: 35, y: 30, description: "Iconic blue-tiled shrine — fortified loot vault" },
      { name: "Hussain Agahi Bazaar", type: "Hot Zone", x: 60, y: 50, description: "Main market — packed with loot and fights" },
      { name: "Qasim Bagh", type: "Safe", x: 80, y: 70, description: "Park grounds — wide cover" },
      { name: "Old Fort Walls", type: "Sniper", x: 20, y: 60, description: "Ramparts overlooking the bazaar" },
      { name: "Cantonment Gate", type: "Vehicle", x: 70, y: 20, description: "Pickup spawn for circle rotations" },
    ],
    vehicles: ["Pickup", "Camel", "Rickshaw"],
  },
  {
    id: "map_7", name: "Quetta Mountains", region: "Balochistan", image: mapQuetta, players: 50,
    climate: "Mountain / Arid", terrain: "Bare rock, narrow passes, mining camps",
    recommendedMode: "Solo", lootTier: "Medium", dangerLevel: 3, weather: "Sharp wind, dust",
    description: "Where Suleiman and Toba Kakar ranges crash together. No tree cover — this is the sniper's playground. The Hanna Lake basin is the only safe rotation, and the Chiltan ridge is winner's prize.",
    pois: [
      { name: "Chiltan Ridge", type: "Sniper", x: 30, y: 20, description: "Highest peak — rules the entire map" },
      { name: "Hanna Lake", type: "Safe", x: 60, y: 60, description: "Only water — loot under the bridge" },
      { name: "Mining Camp", type: "Loot", x: 75, y: 30, description: "Abandoned chromite mine — armor crates" },
      { name: "Wali Tangi Pass", type: "Hot Zone", x: 45, y: 80, description: "Single chokepoint — campers paradise" },
      { name: "Quetta Cantonment", type: "Vehicle", x: 20, y: 75, description: "Military jeep spawn" },
    ],
    vehicles: ["Military Jeep", "Mountain Bike"],
  },
  {
    id: "map_8", name: "Peshawar Old City", region: "Khyber-Pakhtunkhwa", image: mapPeshawar, players: 50,
    climate: "Urban / Historical", terrain: "Narrow alleys, mud-brick havelis, bazaars",
    recommendedMode: "Squad", lootTier: "High", dangerLevel: 4, weather: "Cool evenings, smoke",
    description: "City of stories. Qissa Khwani Bazaar still echoes with traders, but now it echoes with gunfire. Climb the Mahabat Khan minarets for ranged kills, or hold a corner of the Sethi Haveli with your squad.",
    pois: [
      { name: "Qissa Khwani Bazaar", type: "Hot Zone", x: 50, y: 40, description: "Storyteller's bazaar — never quiet" },
      { name: "Mahabat Khan Mosque", type: "Sniper", x: 35, y: 25, description: "Minaret view of the entire old city" },
      { name: "Sethi Haveli", type: "Loot", x: 65, y: 60, description: "Wood-carved mansion — vault hidden upstairs" },
      { name: "Bala Hisar Fort", type: "Vehicle", x: 25, y: 70, description: "Northern fort — armored vehicle spawn" },
      { name: "Khyber Bazaar", type: "Safe", x: 80, y: 35, description: "Quieter side market" },
    ],
    vehicles: ["Armored Vehicle", "Rickshaw", "Pickup"],
  },
  {
    id: "map_9", name: "Murree Hills", region: "Punjab", image: mapMurree, players: 50,
    climate: "Forest / Snow", terrain: "Pine slopes, colonial buildings, ski runs",
    recommendedMode: "Duo", lootTier: "Medium", dangerLevel: 3, weather: "Light snow, fog",
    description: "British-era hill station where snowfall blankets the Mall Road. Ride the chairlift to Pindi Point, snipe down the Kashmir Point ridge, and watch your back in the Patriata pine forests.",
    pois: [
      { name: "Mall Road", type: "Hot Zone", x: 50, y: 50, description: "Main shopping street — early drop magnet" },
      { name: "Pindi Point", type: "Sniper", x: 75, y: 25, description: "Cable-car-top viewpoint — apex sniper nest" },
      { name: "Patriata Pines", type: "Safe", x: 25, y: 70, description: "Dense forest — perfect for solos" },
      { name: "Kashmir Point", type: "Loot", x: 65, y: 30, description: "Colonial cottage — premium loot" },
      { name: "Chairlift Station", type: "Vehicle", x: 40, y: 65, description: "Cable car works as a one-way zip" },
    ],
    vehicles: ["Cable Car", "4x4 Pickup", "Snowmobile"],
  },
  {
    id: "map_10", name: "Skardu Lake", region: "Gilgit-Baltistan", image: mapSkardu, players: 50,
    climate: "Lakeside / Mountain", terrain: "Lake island, sand dunes, alpine forest",
    recommendedMode: "Duo", lootTier: "High", dangerLevel: 3, weather: "Bright sun, cold water",
    description: "The Shangrila resort island sits in the middle of a turquoise lake — drop here for the richest loot, but you'll need a boat to escape. The cold-desert dunes opposite are a sniper's nightmare in the morning glare.",
    pois: [
      { name: "Shangrila Island", type: "Loot", x: 50, y: 50, description: "Heart-shaped resort — vault stash" },
      { name: "Cold Desert", type: "Sniper", x: 25, y: 30, description: "Sarfaranga dunes — long sightlines" },
      { name: "Kharpocho Fort", type: "Vehicle", x: 75, y: 25, description: "Hilltop fort with jeep spawn" },
      { name: "Satpara Dam", type: "Hot Zone", x: 70, y: 75, description: "Dam crest — chokepoint of the map" },
      { name: "Floating Hut", type: "Safe", x: 20, y: 70, description: "Wooden hut on stilts — quiet drop" },
    ],
    vehicles: ["Speedboat", "4x4 Pickup", "Quad Bike"],
  },
  {
    id: "map_11", name: "Naran Kaghan", region: "Khyber-Pakhtunkhwa", image: mapNaran, players: 50,
    climate: "Valley / River", terrain: "Glacial lake, river, alpine meadows",
    recommendedMode: "Squad", lootTier: "Extreme", dangerLevel: 5, weather: "Cold, sudden rain",
    description: "Saif-ul-Malook lake at sunrise is the most beautiful and most lethal drop in the game. Mountains close in on every side — once you commit, there's no leaving without a vehicle. Boss spawns at the lake center every 4 minutes.",
    pois: [
      { name: "Saif-ul-Malook Lake", type: "Boss", x: 50, y: 40, description: "Boss spawn — kill for mythic pet drop" },
      { name: "Lulusar Pass", type: "Sniper", x: 70, y: 20, description: "Highest crest — apex predator nest" },
      { name: "Babusar Top", type: "Vehicle", x: 80, y: 60, description: "Pass road — jeep spawn" },
      { name: "Jeep Track Junction", type: "Hot Zone", x: 30, y: 65, description: "Where 4x4 trails meet — ambush central" },
      { name: "Kunhar Riverbank", type: "Safe", x: 20, y: 80, description: "Hidden under the bridge — safe loot" },
    ],
    vehicles: ["Jeep", "Boat", "Horse"],
  },
  {
    id: "map_12", name: "Fortress Stadium, Lahore", region: "Punjab", image: mapFortress, players: 50,
    climate: "Stadium / Urban", terrain: "Cricket field, concrete stands, locker rooms",
    recommendedMode: "Squad", lootTier: "Medium", dangerLevel: 2, weather: "Stadium lights, night",
    description: "The PSL home of Lahore Qalandars under floodlights at night. Pitch is a kill zone — concrete stands and player tunnels are where every fight ends. Best map for tight squad coordination.",
    pois: [
      { name: "Center Pitch", type: "Hot Zone", x: 50, y: 50, description: "Open ground — minute-one death zone" },
      { name: "Pavilion Roof", type: "Sniper", x: 25, y: 25, description: "VIP box — controls 270° of the field" },
      { name: "Player Tunnel", type: "Loot", x: 75, y: 50, description: "Locker rooms — guns and armor" },
      { name: "Floodlight Tower", type: "Sniper", x: 70, y: 20, description: "Top of the light pylon — climb to camp" },
      { name: "Press Box", type: "Safe", x: 30, y: 75, description: "Glass box — quiet but visible" },
    ],
    vehicles: ["Buggy", "Motorbike"],
  },
];

export const MOCK_FRIENDS: Friend[] = [
  { uid: "1029384756", name: "PindiBoy",     level: 45,  isOnline: true,  avatar: avatar1 },
  { uid: "9876543210", name: "LahoriKing",   level: 120, isOnline: true,  avatar: avatar1 },
  { uid: "5647382910", name: "SindhiSniper", level: 88,  isOnline: false, avatar: avatar1 },
  { uid: "2345678901", name: "QuettaDon",    level: 15,  isOnline: true,  avatar: avatar1 },
  { uid: "3456789012", name: "KarachiGamer", level: 200, isOnline: false, avatar: avatar1 },
];

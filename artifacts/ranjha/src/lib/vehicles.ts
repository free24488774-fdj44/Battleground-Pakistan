// ══ VehicleSystem — configurable car stats, drivetrain, and roster ══
// Phase 1 foundation: real per-car physics profiles instead of one hardcoded car.
// Later phases (Garage/Dealership) will read/modify these same profiles.

export type Drivetrain = "FWD" | "RWD" | "AWD";

export interface VehicleStats {
  horsepower: number;      // display stat, also feeds acceleration
  torque: number;          // display stat, also feeds acceleration
  weightKg: number;        // heavier = slower accel, more inertia
  topSpeedKmh: number;     // caps max velocity
  acceleration: number;     // 0-10 arcade rating, derived+used for feel
  braking: number;          // 0-10 arcade rating
  steering: number;         // 0-10 — how sharply it turns
  grip: number;             // 0-10 — how much it slides (higher = less slip)
  drivetrain: Drivetrain;
  nitro: boolean;
}

export interface VehicleModsState {
  paintColor: number;       // hex color, e.g. 0xdd3322
  wheelColor: number;
  finish: "metallic" | "matte" | "gloss";
  engineLevel: number;      // 0 = stock
  turboLevel: number;
  brakeLevel: number;
  tireLevel: number;
}

export interface VehicleDef {
  id: string;
  name: string;
  category: "Hatchback" | "Sedan" | "SUV" | "Sports" | "Muscle" | "Pickup" | "Classic" | "Offroad" | "Rally" | "Electric" | "Van";
  priceCoins: number;
  baseStats: VehicleStats;
}

export const DEFAULT_MODS: VehicleModsState = {
  paintColor: 0x4a5664,
  wheelColor: 0x1a1a1a,
  finish: "gloss",
  engineLevel: 0,
  turboLevel: 0,
  brakeLevel: 0,
  tireLevel: 0,
};

// Starter roster — Phase 3: full 20-car roster (original names, no real-world/GTA references).
export const VEHICLES: VehicleDef[] = [
  { id: "car_01", name: "Chota Hatch", category: "Hatchback", priceCoins: 0,
    baseStats: { horsepower: 65, torque: 90, weightKg: 850, topSpeedKmh: 140, acceleration: 4, braking: 6, steering: 7, grip: 6, drivetrain: "FWD", nitro: false } },
  { id: "car_02", name: "Family Sedan", category: "Sedan", priceCoins: 6000,
    baseStats: { horsepower: 110, torque: 145, weightKg: 1250, topSpeedKmh: 175, acceleration: 5, braking: 6, steering: 6, grip: 7, drivetrain: "FWD", nitro: false } },
  { id: "car_03", name: "Nawab Lux", category: "Sedan", priceCoins: 15000,
    baseStats: { horsepower: 175, torque: 230, weightKg: 1500, topSpeedKmh: 200, acceleration: 6, braking: 7, steering: 6, grip: 7, drivetrain: "AWD", nitro: false } },
  { id: "car_04", name: "Sardar Exec", category: "Sedan", priceCoins: 24000,
    baseStats: { horsepower: 230, torque: 290, weightKg: 1600, topSpeedKmh: 215, acceleration: 6, braking: 7, steering: 6, grip: 7, drivetrain: "RWD", nitro: false } },
  { id: "car_05", name: "Desert Muscle", category: "Muscle", priceCoins: 32000,
    baseStats: { horsepower: 320, torque: 400, weightKg: 1550, topSpeedKmh: 230, acceleration: 8, braking: 6, steering: 6, grip: 6, drivetrain: "RWD", nitro: true } },
  { id: "car_06", name: "Retro Cruiser", category: "Classic", priceCoins: 20000,
    baseStats: { horsepower: 95, torque: 150, weightKg: 1300, topSpeedKmh: 155, acceleration: 4, braking: 4, steering: 5, grip: 5, drivetrain: "RWD", nitro: false } },
  { id: "car_07", name: "Karakoram GT", category: "Sports", priceCoins: 55000,
    baseStats: { horsepower: 420, torque: 380, weightKg: 1350, topSpeedKmh: 270, acceleration: 9, braking: 8, steering: 8, grip: 8, drivetrain: "RWD", nitro: true } },
  { id: "car_08", name: "Falcon Coupe", category: "Sports", priceCoins: 68000,
    baseStats: { horsepower: 470, torque: 410, weightKg: 1320, topSpeedKmh: 285, acceleration: 9, braking: 8, steering: 9, grip: 8, drivetrain: "AWD", nitro: true } },
  { id: "car_09", name: "Zulfiqar X1", category: "Sports", priceCoins: 92000,
    baseStats: { horsepower: 560, torque: 470, weightKg: 1290, topSpeedKmh: 300, acceleration: 10, braking: 9, steering: 9, grip: 9, drivetrain: "AWD", nitro: true } },
  { id: "car_10", name: "Markhor Apex", category: "Sports", priceCoins: 145000,
    baseStats: { horsepower: 720, torque: 610, weightKg: 1250, topSpeedKmh: 340, acceleration: 10, braking: 9, steering: 10, grip: 9, drivetrain: "RWD", nitro: true } },
  { id: "car_11", name: "Toofan Hyper", category: "Sports", priceCoins: 220000,
    baseStats: { horsepower: 900, torque: 780, weightKg: 1180, topSpeedKmh: 380, acceleration: 10, braking: 10, steering: 10, grip: 10, drivetrain: "AWD", nitro: true } },
  { id: "car_12", name: "Dune Runner", category: "Offroad", priceCoins: 26000,
    baseStats: { horsepower: 210, torque: 280, weightKg: 1750, topSpeedKmh: 160, acceleration: 6, braking: 6, steering: 5, grip: 7, drivetrain: "AWD", nitro: false } },
  { id: "car_13", name: "Highland SUV", category: "SUV", priceCoins: 18000,
    baseStats: { horsepower: 165, torque: 220, weightKg: 1900, topSpeedKmh: 165, acceleration: 5, braking: 5, steering: 4, grip: 6, drivetrain: "AWD", nitro: false } },
  { id: "car_14", name: "Sultan Grand SUV", category: "SUV", priceCoins: 48000,
    baseStats: { horsepower: 310, torque: 400, weightKg: 2150, topSpeedKmh: 200, acceleration: 7, braking: 6, steering: 5, grip: 7, drivetrain: "AWD", nitro: false } },
  { id: "car_15", name: "Frontier Pickup", category: "Pickup", priceCoins: 14000,
    baseStats: { horsepower: 145, torque: 260, weightKg: 2100, topSpeedKmh: 150, acceleration: 4, braking: 5, steering: 4, grip: 6, drivetrain: "RWD", nitro: false } },
  { id: "car_16", name: "Rally Sher", category: "Rally", priceCoins: 62000,
    baseStats: { horsepower: 300, torque: 350, weightKg: 1250, topSpeedKmh: 210, acceleration: 8, braking: 8, steering: 9, grip: 9, drivetrain: "AWD", nitro: false } },
  { id: "car_17", name: "Circuit Blade", category: "Sports", priceCoins: 105000,
    baseStats: { horsepower: 540, torque: 460, weightKg: 1100, topSpeedKmh: 310, acceleration: 9, braking: 10, steering: 10, grip: 10, drivetrain: "RWD", nitro: true } },
  { id: "car_18", name: "Barq-E Volt", category: "Electric", priceCoins: 130000,
    baseStats: { horsepower: 610, torque: 820, weightKg: 1700, topSpeedKmh: 290, acceleration: 10, braking: 8, steering: 8, grip: 9, drivetrain: "AWD", nitro: true } },
  { id: "car_19", name: "Chota Hatch Sport", category: "Hatchback", priceCoins: 22000,
    baseStats: { horsepower: 140, torque: 175, weightKg: 1050, topSpeedKmh: 195, acceleration: 7, braking: 7, steering: 8, grip: 7, drivetrain: "FWD", nitro: false } },
  { id: "car_20", name: "Qafla Van", category: "Van", priceCoins: 11000,
    baseStats: { horsepower: 120, torque: 210, weightKg: 2000, topSpeedKmh: 145, acceleration: 3, braking: 5, steering: 4, grip: 6, drivetrain: "FWD", nitro: false } },
];

export function getVehicle(id: string): VehicleDef {
  return VEHICLES.find(v => v.id === id) ?? VEHICLES[0];
}

// Applies performance-upgrade levels (0-5 each) on top of a vehicle's base stats.
// Used by the Garage (Phase 2/3) so upgrades actually change how the car drives.
export function applyMods(base: VehicleStats, mods: VehicleModsState): VehicleStats {
  return {
    ...base,
    horsepower: base.horsepower * (1 + mods.engineLevel * 0.12),
    torque: base.torque * (1 + mods.engineLevel * 0.10 + mods.turboLevel * 0.08),
    topSpeedKmh: base.topSpeedKmh * (1 + mods.turboLevel * 0.06),
    acceleration: Math.min(10, base.acceleration + mods.engineLevel * 0.4 + mods.turboLevel * 0.3),
    braking: Math.min(10, base.braking + mods.brakeLevel * 0.5),
    grip: Math.min(10, base.grip + mods.tireLevel * 0.4),
  };
}

// Converts a VehicleStats profile into the arcade physics constants
// world.tsx's driving loop expects (max forward speed, accel force, turn rate, grip/slip).
export function toArcadePhysics(stats: VehicleStats){
  const maxFwd = 6 + (stats.topSpeedKmh / 270) * 24;      // ~9..30 units/sec
  const accelForce = 8 + (stats.acceleration / 10) * 10;   // ~9..18
  const brakeForce = 0.90 - (stats.braking / 10) * 0.08;   // lower = stronger brake
  const turnRate = 1.8 + (stats.steering / 10) * 1.6;      // ~2.0..3.4
  const gripSlip = 0.80 + (stats.grip / 10) * 0.16;        // higher grip = less slide
  const massDrag = 0.998 - (stats.weightKg / 2200) * 0.01; // heavier coasts a bit longer
  return { maxFwd, accelForce, brakeForce, turnRate, gripSlip, massDrag };
}

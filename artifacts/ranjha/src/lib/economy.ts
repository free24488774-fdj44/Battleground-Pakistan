// ══ EconomySystem — centralized offline currency (PKR) ══
// "PKR" here is a virtual in-game currency name only — NOT real Pakistani Rupees,
// and NOT connected to any real-money purchase. Fully offline, no server involved.
//
// This wraps the existing GameContext.profile.coins field so reward/spend logic
// lives in one place (rather than scattered across race/mission/garage screens).

export interface EconomyActions {
  coins: number;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean; // returns false if not enough funds
  canAfford: (amount: number) => boolean;
}

// Configurable reward table — balance the whole economy from one place.
// Phase 5 (Races/Missions) will call these when those features are built.
export const REWARD_TABLE = {
  race: { first: 3000, second: 1800, third: 900, participation: 200 },
  timeTrial: { gold: 2500, silver: 1500, bronze: 700 },
  drift: { perPoint: 5, maxBonus: 2000 },
  speedChallenge: { perCheckpoint: 150 },
  stunt: { perStunt: 300, perfectBonus: 500 },
  mission: { small: 500, medium: 1500, large: 4000 },
};

export function makeEconomy(coins: number, setCoins: (updater: (c: number) => number) => void): EconomyActions {
  return {
    coins,
    addMoney: (amount: number) => setCoins(c => Math.max(0, c + Math.max(0, amount))),
    spendMoney: (amount: number) => {
      if (coins < amount) return false;
      setCoins(c => Math.max(0, c - amount));
      return true;
    },
    canAfford: (amount: number) => coins >= amount,
  };
}

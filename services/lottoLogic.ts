
import { Draw, GameMode, Statistics, StrategyConfig, FilterConfig, StrategyType, FilterType } from '../types';
import { GAME_RULES, PRIMES } from '../constants';

export function calculateStatistics(draws: Draw[], mode: GameMode): Statistics {
  const rules = GAME_RULES[mode];
  const lastDraw = draws[draws.length - 1];
  
  const stats: Statistics = {
    lastUpdate: lastDraw?.data || 'N/A',
    count: draws.length,
    evenOdd: [],
    primes: [],
    multiples: { 2: [], 3: [], 4: [], 5: [], 6: [] },
    quadrants: [[], [], [], []],
    sums: [],
    lateness: {}
  };

  // Initialize lateness
  rules.range.forEach(n => stats.lateness[n] = 0);

  draws.forEach((draw) => {
    const sorted = [...draw.dezenas].sort((a, b) => a - b);
    
    // Even/Odd
    const even = sorted.filter(n => n % 2 === 0).length;
    stats.evenOdd.push({ even, odd: sorted.length - even });

    // Primes
    stats.primes.push(sorted.filter(n => PRIMES.includes(n)).length);

    // Multiples
    [2, 3, 4, 5, 6].forEach(m => {
      stats.multiples[m].push(sorted.filter(n => n % m === 0).length);
    });

    // Sums
    stats.sums.push(sorted.reduce((a, b) => a + b, 0));

    // Quadrants
    const qSize = rules.maxNumber / 4;
    const qCount = [0, 0, 0, 0];
    sorted.forEach(n => {
      if (n <= qSize) qCount[0]++;
      else if (n <= qSize * 2) qCount[1]++;
      else if (n <= qSize * 3) qCount[2]++;
      else qCount[3]++;
    });
    qCount.forEach((c, i) => stats.quadrants[i].push(c));

    // Lateness logic: Reset on draw
    rules.range.forEach(n => {
      if (draw.dezenas.includes(n)) {
        stats.lateness[n] = 0;
      } else {
        stats.lateness[n]++;
      }
    });
  });

  return stats;
}

export function generateGames(
  count: number, 
  numDezenas: number, 
  mode: GameMode, 
  strategies: StrategyConfig[], 
  filters: FilterConfig[],
  stats: Statistics
): number[][] {
  const games: number[][] = [];
  const rules = GAME_RULES[mode];
  let attempts = 0;
  const maxAttempts = 200000; // High budget for simulation

  // Optimization: If LATENESS is defined, we can split the candidate generation to be much faster
  const latenessStrat = strategies.find(s => s.type === StrategyType.LATENESS);
  const latePool: number[] = [];
  const normalPool: number[] = [];

  if (latenessStrat) {
    const { minDelay } = latenessStrat.params;
    rules.range.forEach(n => {
      if (stats.lateness[n] >= minDelay) latePool.push(n);
      else normalPool.push(n);
    });
  }

  while (games.length < count && attempts < maxAttempts) {
    attempts++;
    let game: number[];

    if (latenessStrat && latePool.length >= latenessStrat.params.count) {
      // Pick specifically K late numbers and the rest from normal
      const current = new Set<number>();
      const k = latenessStrat.params.count;
      
      // Select K from late
      while (current.size < k) {
        current.add(latePool[Math.floor(Math.random() * latePool.length)]);
      }
      // Select the rest from anywhere else (to satisfy "rest generated from others")
      // but to ensure exactly K late, we must select from normalPool
      const remaining = numDezenas - k;
      while (current.size < numDezenas) {
        current.add(rules.range[Math.floor(Math.random() * rules.range.length)]);
      }
      game = Array.from(current).sort((a, b) => a - b);
    } else {
      // Standard random generation
      const current = new Set<number>();
      while (current.size < numDezenas) {
        current.add(rules.range[Math.floor(Math.random() * rules.range.length)]);
      }
      game = Array.from(current).sort((a, b) => a - b);
    }

    // Apply Strategies
    let isValid = true;
    for (const strat of strategies) {
      if (!isValidStrategy(game, strat, stats)) {
        isValid = false;
        break;
      }
    }
    if (!isValid) continue;

    // Apply Filters
    for (const filter of filters) {
      if (!isValidFilter(game, filter, mode)) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      games.push(game);
    }
  }

  return games;
}

function isValidStrategy(game: number[], strat: StrategyConfig, stats: Statistics): boolean {
  switch (strat.type) {
    case StrategyType.LATENESS:
      const { minDelay, count } = strat.params;
      const lateNumbersInGame = game.filter(n => stats.lateness[n] >= minDelay).length;
      return lateNumbersInGame === count;
      
    case StrategyType.EVEN_ODD:
      const even = game.filter(n => n % 2 === 0).length;
      return even === (strat.params.even || 0) && (game.length - even) === (strat.params.odd || 0);
      
    case StrategyType.PRIMES:
      const pCount = game.filter(n => PRIMES.includes(n)).length;
      return pCount >= (strat.params.min || 0) && pCount <= (strat.params.max || game.length);
      
    case StrategyType.MULTIPLES:
      for (const mStr in strat.params) {
          const m = parseInt(mStr);
          const expected = strat.params[m];
          const count = game.filter(n => n % m === 0).length;
          if (count !== expected) return false;
      }
      return true;
      
    default:
      return true;
  }
}

function isValidFilter(game: number[], filter: FilterConfig, mode: GameMode): boolean {
  const rules = GAME_RULES[mode];
  switch (filter.type) {
    case FilterType.SUM_TOTAL:
      const sum = game.reduce((a, b) => a + b, 0);
      return sum >= (filter.params.min || 0) && sum <= (filter.params.max || (rules.maxNumber * game.length));
    case FilterType.QUADRANTS:
      const qCount = [0, 0, 0, 0];
      const qSize = rules.maxNumber / 4;
      game.forEach(n => {
        if (n <= qSize) qCount[0]++;
        else if (n <= qSize * 2) qCount[1]++;
        else if (n <= qSize * 3) qCount[2]++;
        else qCount[3]++;
      });
      return qCount.every((c, i) => {
        const min = filter.params[`q${i+1}Min`];
        const max = filter.params[`q${i+1}Max`];
        // If undefined or NaN, it shouldn't block
        const passesMin = (min === undefined || isNaN(min)) ? true : c >= min;
        const passesMax = (max === undefined || isNaN(max) || max === 0) ? true : c <= max;
        return passesMin && passesMax;
      });
    default:
      return true;
  }
}

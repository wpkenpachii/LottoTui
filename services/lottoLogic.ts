
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

  draws.forEach((draw, index) => {
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
  const maxAttempts = 100000; // Increased attempts for stricter filters

  while (games.length < count && attempts < maxAttempts) {
    attempts++;
    // Generate random game
    const current = new Set<number>();
    while (current.size < numDezenas) {
      current.add(rules.range[Math.floor(Math.random() * rules.range.length)]);
    }
    const game = Array.from(current).sort((a, b) => a - b);

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
      // Updated logic: Check if game has exactly X numbers with delay >= minDelay
      const { minDelay, count } = strat.params;
      const lateNumbersInGame = game.filter(n => stats.lateness[n] >= minDelay).length;
      return lateNumbersInGame === count;
      
    case StrategyType.EVEN_ODD:
      const even = game.filter(n => n % 2 === 0).length;
      return even === strat.params.even && (game.length - even) === strat.params.odd;
      
    case StrategyType.PRIMES:
      const pCount = game.filter(n => PRIMES.includes(n)).length;
      return pCount >= strat.params.min && pCount <= strat.params.max;
      
    case StrategyType.MULTIPLES:
      for (const mStr in strat.params) {
          const m = parseInt(mStr);
          const count = game.filter(n => n % m === 0).length;
          if (count !== strat.params[m]) return false;
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
      return sum >= filter.params.min && sum <= filter.params.max;
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
        return (isNaN(min) || c >= min) && (isNaN(max) || c <= max);
      });
    default:
      return true;
  }
}

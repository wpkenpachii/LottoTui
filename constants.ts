
import { GameMode } from './types';

export const GAME_RULES = {
  [GameMode.MEGASENA]: {
    name: 'Mega-Sena',
    maxNumber: 60,
    minDezenas: 6,
    maxDezenas: 20,
    range: Array.from({ length: 60 }, (_, i) => i + 1),
  },
  [GameMode.LOTOFACIL]: {
    name: 'Lotofácil',
    maxNumber: 25,
    minDezenas: 15,
    maxDezenas: 20,
    range: Array.from({ length: 25 }, (_, i) => i + 1),
  }
};

export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];


export enum GameMode {
  MEGASENA = 'MEGASENA',
  LOTOFACIL = 'LOTOFACIL'
}

export interface Draw {
  concurso: number;
  data: string;
  dezenas: number[];
}

export interface Statistics {
  lastUpdate: string;
  count: number;
  evenOdd: { even: number; odd: number }[];
  primes: number[];
  multiples: Record<number, number[]>;
  quadrants: number[][];
  sums: number[];
  lateness: Record<number, number>;
}

export enum StrategyType {
  LATENESS = 'Números Atrasados',
  EVEN_ODD = 'Quantidade de Pares/Ímpares',
  PRIMES = 'Quantidade de Números Primos',
  MULTIPLES = 'Números Múltiplos'
}

export enum FilterType {
  QUADRANTS = 'Quadrantes',
  SUM_TOTAL = 'Soma Total de Números'
}

export interface StrategyConfig {
  type: StrategyType;
  params: any;
}

export interface FilterConfig {
  type: FilterType;
  params: any;
}

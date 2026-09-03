/**
 * Cores que não mudam de região para região: cobra, números e névoa. O chão,
 * a grelha e a ruína são do bioma, em world/biomes.ts.
 *
 * Valores resolvidos porque o canvas não lê var(), mas todos saem da paleta
 * Ryse: a cobra usa a escala de luz do lime documentada no DS.
 */
export const THEME = {
  /* Fundo, e também o contorno que segura a leitura de texto sobre o mundo. */
  voidBg: 'rgb(8, 9, 12)',

  /* Rampa do corpo. Três paradas: com duas, o corpo inteiro lê como uma
     barra só, sem volume ao longo do comprimento. */
  snakeHead: '#cfe93c',
  snakeMid: '#a9cc35',
  snakeTail: '#7ba22b',

  /* Contorno e fio de luz dos três traços concêntricos do corpo. São a cor
     do corpo escurecida e clareada, nunca preto e branco por cima. */
  snakeSheen: '#eaffa4',
  snakeShadow: 'rgba(0, 0, 0, 0.32)',

  snakeEye: 'rgb(9, 11, 14)',
  snakeGlint: 'rgba(233, 255, 190, 0.55)',
  snakeTongue: '#e0455a',

  rockFrozen: '#38bdf8',

  textPositive: '#10b981',
  textBonus: '#f59e0b',
  textWarn: '#7d828c',
  textRegion: '#7ec4bc',

  /* Poço da bússola: escuro o bastante para a seta ler sobre qualquer bioma. */
  markerWell: 'rgba(9, 11, 14, 0.9)',
  markerLabel: '#dfe7ef',

  deathVeil: 'rgba(7, 8, 10, 0.55)',
} as const;

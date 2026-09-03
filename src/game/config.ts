/**
 * Todo o balanceamento do jogo. Nenhum número mágico fora daqui.
 */
export const CONFIG = {
  /* ---------- Mundo ----------
     Infinito, gerado em chunks determinísticos: a mesma semente e as mesmas
     coordenadas devolvem sempre o mesmo terreno. */
  chunkSize: 24,
  /** Raio, em chunks, mantido em memória ao redor da cabeça. O que sai daqui
      é descartado e regenerado se o jogador voltar; só os itens renascem. */
  chunkKeepRadius: 4,
  /** Nenhuma ruína nasce a esta distância da origem, para a partida não
      começar encurralada. */
  spawnClearRadius: 8,
  startLength: 3,

  /** Geração por chunk. Ruínas saem em aglomerado: célula solta vira ruído. */
  ruinClusters: 5,
  ruinClusterSize: 7,
  foodPerChunk: 4,
  powerUpsPerChunk: 2,

  /** Pontos por pisar numa região inédita. Explorar tem que render mais que
      girar em cima da mesma comida. */
  regionBonus: 25,

  /* ---------- Terreno ---------- */
  /** Lado da grade esparsa de biomas, em células. O bioma de um ponto é a
      mistura dos quatro vértices em volta, então não existe uma linha onde
      uma região começa. */
  regionCells: 110,
  /** Potência sobre os pesos da mistura. Sem ela o mapa inteiro fica na média
      dos quatro biomas; com ela o miolo da região sai puro e só a faixa de
      transição fica misturada. */
  biomeContrast: 3,

  /* ---------- Velocidade (passos por segundo) ---------- */
  baseStepsPerSecond: 6,
  speedRampPerPoints: 90,
  speedRampStep: 0.5,
  maxStepsPerSecond: 11,

  /** Input */
  inputBufferSize: 2,

  /* ---------- Visão e névoa ---------- */
  visionRadius: 9.5,
  /** Quanto o círculo de visão se adianta na direção do movimento. */
  visionLead: 3.4,
  /** Largura da borda macia da visão, em células. */
  visionFalloff: 3.4,
  /** Opacidade do véu sobre o que já foi visto e saiu de vista. */
  memoryVeil: 0.78,
  /** Piso de opacidade do corpo da cobra dentro do escuro: o rabo some na
      névoa, mas nunca a ponto de esconder uma colisão. */
  snakeFogFloor: 0.44,

  /* ---------- Câmera ---------- */
  /** Células visíveis no menor eixo da tela. */
  viewCells: 20,
  /** O campo abre com a velocidade e com o tamanho do corpo. */
  zoomSpeedGain: 0.5,
  zoomLengthGain: 0.06,
  maxViewCells: 30,
  /** Quanto a câmera olha adiante da cabeça, em células. */
  cameraLead: 2,
  /**
   * Suavizações, em unidades por segundo (independente de framerate).
   *
   * A posição é quase rígida de propósito: a cabeça que ela persegue já é
   * interpolada entre dois passos, e amortecer de novo somava um elástico em
   * cima de algo contínuo. Quem precisa de amortecimento é a mira, que com a
   * direção crua saltaria várias células a cada curva.
   */
  cameraFollowLambda: 16,
  cameraGazeLambda: 3.4,
  cameraZoomLambda: 2.4,
  /** Morrer abre o plano. */
  deathViewGain: 1.45,

  /* ---------- Bússola ---------- */
  scentRadius: 60,
  maxMarkers: 4,
  markerMargin: 58,
  /** Migalhas: só aparecem com a comida mais próxima fora da tela. */
  breadcrumbCount: 4,

  /* ---------- Pele da cobra ----------
     O corpo é um tubo traçado pelos centros dos segmentos. As medidas estão
     em fração de célula. */
  snakeBodyWidth: 0.82,
  /** Mal mais larga que o corpo: quem identifica a cabeça são os olhos e a
      língua, não o tamanho dela. */
  snakeHeadWidth: 0.87,
  /** A cauda afina nos últimos segmentos, até esta fração da largura. */
  snakeTailTaper: 0.42,
  snakeTaperSegments: 6,
  /** Em quantos segmentos a rampa de cor vai da cabeça até o tom da cauda.
      Fixo, e não normalizado pelo comprimento atual: normalizado, uma cobra
      curta exibia a rampa inteira em cinco faixas. */
  snakeRampSegments: 22,
  /** Quanto o efeito ativo puxa a cor do corpo. */
  snakeEffectTint: 0.5,

  /** Fagulhas do efeito ativo: brasa no fogo, cristal no gelo. */
  sparkPerSecond: 19,
  sparkMax: 30,
  sparkLifeMs: 760,

  /** A língua não informa nada: é detalhe de vida. */
  tonguePeriodMs: 2600,
  tongueShowMs: 260,

  /* ---------- Efeitos elementais ---------- */
  effectDurationMs: 5000,
  fireSpeedMultiplier: 1.5,
  fireScoreMultiplier: 2,
  iceSpeedMultiplier: 0.6,

  /* ---------- Fruta da terra ---------- */
  earthRockCount: 6,
  earthRockLifetimeMs: 6000,
  earthRockReward: 10,
  /** Células à frente da cabeça onde uma pedra nunca nasce. */
  rockSafetyRadius: 3,
  /** As pedras caem num anel ao redor da cobra. */
  rockSpawnMinRadius: 3,
  rockSpawnMaxRadius: 8,

  /** Apresentação */
  floatingTextMs: 820,
  /** Identificador de armazenamento, não nome de exibição: trocar a chave
      jogaria fora o recorde de quem já jogou. */
  bestScoreKey: 'snake-ryse:best',
} as const;

/** A velocidade base sobe com a pontuação, com teto. */
export function baseStepsPerSecond(score: number): number {
  const ramp = Math.floor(score / CONFIG.speedRampPerPoints) * CONFIG.speedRampStep;
  return Math.min(CONFIG.baseStepsPerSecond + ramp, CONFIG.maxStepsPerSecond);
}

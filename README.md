# Alien Snake

Cobrinha num mundo aberto infinito, coberto de névoa. Você cresce coletando
frutas elementais que mudam a partida, descobre regiões que ninguém pisou e
sobrevive ao que largou pelo caminho.

Roda no navegador, em canvas 2D, sem nenhuma dependência de runtime.

## Sobre este repositório

O jogo é um projeto de faculdade de **Caio Daniel, Camily Ferreira, Elton,
José Carlos e Samuel Rocha**. A ideia, o conceito de frutas elementais e a
primeira versão jogável são deles.

Eu (**Lone**, fundador da Ryse) me propus a revisar e aprimorar o que eles
construíram. O que fiz foi corrigir o que quebrava a jogabilidade, dar
intenção ao que já existia, trocar o tema por um design system de verdade e,
num segundo ciclo, tirar o jogo do tabuleiro fixo e colocá-lo num mundo aberto.

O conceito continua sendo deles. O registro completo do que mudou, e por quê,
está em [CHANGELOG.md](CHANGELOG.md).

## Rodando

Requer Node 20 ou mais novo.

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # checagem de tipos e build de produção em dist/
npm run preview  # serve o build de produção
```

## Como se joga

| Ação | Teclas |
|---|---|
| Mover | `W` `A` `S` `D` ou setas |
| Pausar | `Espaço` ou `Esc` |
| Recomeçar | `Enter` |
| Voltar ao menu (pausado) | `Esc` |
| Ligar / desligar efeitos | `M` |
| Ligar / desligar trilha | `N` |

Curva em duas etapas é válida: só a reversão direta é bloqueada.

### Os itens

| Fruta | Papel | O que faz |
|---|---|---|
| Comida | base | +10, cresce um segmento |
| Essência | recompensa | +30, mas o relógio de 6s começa quando você a avista |
| Fogo | risco | +50% de velocidade e pontos em dobro por 5s |
| Gelo | alívio | −40% de velocidade e as pedras congelam, dá para atravessar |
| Terra | aposta | espalha 6 pedras ao seu redor; cada uma que derreter com você vivo vale +10 |

### O mundo

Não há borda. O terreno nasce em chunks de 24×24 gerados a partir da semente
da partida e das coordenadas, então voltar a um lugar é voltar ao lugar. As
ruínas são permanentes e matam no contato, no lugar da parede que existia
antes.

A névoa esconde o que você ainda não visitou. O que já foi visto continua no
mapa, apagado: você perde a informação viva, nunca o mapa que já pagou para
descobrir. As setas na borda da tela apontam o que vale a pena buscar, e pisar
numa região inédita vale +25.

Cinco regiões (Planície, Bosque, Cinzas, Geleira e Pedreira) puxam cada uma um
elemento para si, e elas se misturam em vez de trocar numa linha reta: o bioma
vive numa grade esparsa e o valor de qualquer ponto é a mistura dos vizinhos.

## Estrutura

```
src/
  core/     laço de quadro, vetores, sorteio com semente
  game/     estado, regras, input, spawn, efeitos, balanceamento
  world/    chunks, biomas, visão e névoa
  items/    catálogo e arte vetorial das frutas
  render/   câmera, terreno, névoa, bússola, pele da cobra
  ui/       menu, HUD, avisos, modais, controles de áudio
  audio/    motor de amostras, trilha e preferências
  styles/   tokens do design system e composição
```

Duas regras organizam o resto:

**A lógica não conhece o DOM.** `game/tick.ts` recebe um delta e devolve
eventos. Quem toca som, anima número e desenha na tela reage a esses eventos.

**Todo número que define o jogo vive em `game/config.ts`.** Velocidade,
densidade de itens, raio de visão, enquadramento da câmera, medidas da cobra.
Não há constante de balanceamento solta pelo código.

Os comentários no código explicam **por que** cada decisão está ali, e em
vários casos qual era o problema antes. É proposital: num projeto que vai ser
lido por outras pessoas, o que custa caro de recuperar não é o que o código
faz, é o motivo de ele fazer assim.

## Recursos de terceiros

| O quê | De onde | Licença |
|---|---|---|
| Efeitos sonoros | *Interface Sounds*, de Kenney | CC0 |
| Trilha de fundo | Recorte com emenda costurada, do acervo da Ryse | uso interno |
| Ícones de interface | Lucide | ISC |
| Tipografia | Poppins, Chakra Petch e JetBrains Mono | SIL Open Font License |

As fontes são servidas do disco, em `public/fonts/`, e não da rede.

Nenhum efeito sonoro é sintetizado: o motor toca, transpõe e sequencia
gravações reais. A trilha é um trecho de 20,4s escolhido por busca de melhor
casamento entre início e fim, com crossfade de embrulho na emenda, porque a
música original não foi feita para dar loop.

## Créditos

**Projeto original:** Caio Daniel, Camily Ferreira, Elton, José Carlos e
Samuel Rocha

**Revisão:** Lone, fundador da Ryse

Os mesmos créditos estão dentro do jogo, na pílula de áudio no canto inferior
direito.

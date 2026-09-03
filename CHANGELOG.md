# Changelog

Registro da revisão do **Alien Snake** (antes *Snake Ryse*), protótipo de
minigame desenvolvido como projeto de faculdade.

**Projeto original:** Caio Daniel, Camily Ferreira, Elton, José Carlos e Samuel Rocha
**Revisão:** Lone, fundador da Ryse

Marcadores seguem a convenção de changelog da Ryse: `[+]` adicionado,
`[*]` alterado, `[!]` corrigido, `[-]` removido.

---

## [Mundo aberto] 02/09/2026

A revisão anterior entregou um bom snake dentro de um retângulo. Este ciclo
tirou o retângulo.

O jogo ainda seguia o padrão de todo snake: tela fixa, canvas fixo, tabuleiro
inteiro visível de uma vez. Nada disso sobrou. O mundo é infinito e nasce
enquanto o jogador anda, a câmera acompanha a cobra de perto, e uma névoa
esconde tudo que ele ainda não visitou.

**[*] O jogo agora se chama Alien Snake**

Era Snake Ryse. As chaves de `localStorage` continuam em `snake-ryse:` de
propósito: elas são identificador, não nome de exibição, e trocá-las jogaria
fora o recorde e as preferências de áudio de quem já jogou.

### O mundo

**[-] O tabuleiro**

`CONFIG.cols` e `CONFIG.rows` não existem mais, e com eles foi embora a parede
que matava. Não havia como pedir "sensação de mundo aberto" mantendo a peça
que anuncia, o tempo todo, exatamente onde o mundo acaba.

**[+] Mundo infinito por chunks**

O terreno nasce em blocos de 24×24 gerados sob demanda a partir da semente e
das coordenadas. Pedir uma célula que ninguém visitou gera o chunk dela na
hora: é isso que faz o mapa não ter borda, e ninguém precisa avisar o mundo de
que a câmera andou.

O que passa do raio de guarda é descartado, porque o mundo é infinito e a
memória não. Voltar lá regenera o terreno idêntico, porque tudo sai da semente
e das coordenadas, e o que renasce são os itens: num jogo sem fim isso é
recurso voltando, não bug.

**[*] A parede virou ruína**

No lugar de uma borda invisível em volta de tudo, aglomerados permanentes de
blocos espalhados pelo mapa. Eles nascem por caminhada aleatória presa dentro
do chunk: deixar a caminhada vazar para o vizinho colocaria uma ruína numa
célula que o chunk vizinho não conhece, e a colisão consulta sempre o chunk da
célula: a ruína existiria no desenho e não na regra.

A causa de morte `parede` virou `ruína`. Ninguém começa encurralado: nenhuma
ruína nasce a menos de 8 células da origem.

**[*] Os itens estão espalhados, não sorteados um de cada vez**

Cada chunk nasce com 4 comidas e 2 elementos. Não existe mais "o item da vez":
com um item único num mapa infinito, o jogador passaria a partida inteira
andando em linha reta até um ponto.

**[+] Regiões que se misturam**

Planície, Bosque, Cinzas, Geleira e Pedreira, cada uma puxando um elemento para
si: o jogador aprende que gelo se acha na geleira.

O bioma não pertence ao chunk. Ele vive numa grade de 110 células, e o valor de
qualquer ponto é a mistura dos quatro vértices em volta: não existe "a linha
onde a Geleira começa". Mistura pura, porém, deixaria o mapa inteiro na média
de quatro biomas, e um mundo onde tudo é 25% de tudo não tem região nenhuma.
Os pesos passam por uma potência que devolve o miolo puro e deixa misturada só
a faixa de transição.

**[*] O chão deixou de ser um retângulo por chunk**

Preenchimento chapado por chunk, na cor do bioma daquele chunk, punha a divisa
entre duas regiões como uma reta de 24 células atravessando a tela. O chão
passou a ser pintado numa imagem de uma amostra por célula, esticada até a
tela, no mesmo truque da névoa: o filtro bilinear do canvas transforma cada
amostra num degradê macio. É o que permite a cor mudar a cada célula, seguindo
a mistura de biomas, sem custar um preenchimento por célula: a transição entre
duas regiões vira transição em vez de aresta.

**[+] Bônus por região inédita**

+25 ao pisar num chunk que ninguém visitou. Sem isso, girar em cima da mesma
comida rende mais do que andar, e um mundo aberto onde não compensa sair do
lugar é um tabuleiro com passos a mais.

**[*] As pedras da terra caem em cerco**

Antes eram sorteadas sobre o tabuleiro inteiro. Num mundo infinito, pedra que
cai a 300 células de distância não é aposta, é nada: agora nascem num anel de 3
a 8 células ao redor da cobra, com as células à frente da cabeça continuando
bloqueadas.

**[*] Rampa de velocidade de 50 para 90 pontos**

Com comida por todo lado a pontuação corre bem mais rápido, e no ritmo antigo o
teto de 11 passos por segundo chegava cedo demais.

### Névoa e visão

**[+] Névoa de guerra com memória**

Três estados, e a diferença entre os dois últimos é o que faz a névoa desafiar
sem irritar: iluminado agora, lembrado (o terreno continua lá, apagado, mas o
que se move nele não) e nunca visto. O jogador nunca perde o mapa que já pagou
para descobrir; ele perde a informação viva.

É desenhada numa imagem de três amostras por célula, esticada até a tela: o
filtro bilinear do canvas faz o degradê de graça, e é isso que permite uma
borda de luz macia sem custar um preenchimento por célula.

**[+] A visão olha para frente**

Centrada na cabeça, a 11 passos por segundo, metade do círculo era gasta
iluminando o caminho por onde o jogador já passou. O centro pende 3,4 células
na direção do movimento: ~13 células de aviso à frente e ~6 atrás, que é a
proporção que o jogo de fato usa.

**[*] O relógio dos elementos só começa quando o jogador avista**

Uma essência que expira a 40 células de distância, no escuro, é uma regra que
ninguém nunca viu acontecer. Agora ela vira a decisão de "eu vi, dá tempo?",
que é o que a essência sempre quis ser.

**[!] O próprio corpo sumindo no escuro**

Uma cobra de cinquenta segmentos que não enxerga o próprio corpo não é desafio,
é armadilha. O corpo passou a ser desenhado por cima da névoa e a receber ela
como cor, com piso de opacidade: ele mergulha na escuridão sem nunca deixar de
ser legível.

### Câmera e movimento

**[+] Câmera com seguimento e zoom**

~20 células no menor eixo da tela, e a célula saiu de ~28px para ~40px. O plano
abre com a velocidade e com o tamanho do corpo, porque correr mais rápido sem
enxergar mais longe é morte por falta de informação e não por erro do jogador,
e abre de vez na morte, para ele ver onde foi que se meteu.

**[+] Movimento contínuo sobre lógica discreta**

A cobra continua andando em células inteiras, que é o que mantém colisão, curva
e crescimento honestos. O desenho é que interpola entre o passo anterior e o
atual, guardando a posição de cada segmento antes de mexer nele. Sem isso o
zoom de imersão só ampliaria o salto de 40px a cada passo.

**[!] Solavanco a cada curva**

O alvo da câmera e o centro do círculo de luz usavam a direção crua, que vira
de −1 para 1 num único quadro: virar para cima jogava os dois sete células de
uma vez, em toda curva. Agora existe uma mira amortecida entre a direção e
quem depende dela, e a mesma curva vira a câmera inclinando para dentro dela.
Corrigido.

O seguimento de posição, em compensação, passou a ser quase rígido: a cabeça
que ele persegue já é interpolada, então amortecer de novo era só somar um
elástico em cima de algo que já era contínuo.

**[!] A grelha tremendo enquanto o mundo desliza**

As linhas eram encaixadas em pixel inteiro. Isso deixa a linha nítida num
tabuleiro parado, mas aqui o mundo escorre debaixo da câmera: cada linha
cruzava o limite do arredondamento num instante diferente e saltava um pixel
sozinha, e a tela inteira piscava ao andar. Corrigido: coordenada fracionária,
que custa meio pixel de nitidez e devolve o movimento liso.

**[-] Soco de zoom ao comer**

Com comida por todo lado o jogador come a cada segundo ou dois, e a câmera
fechava e voltava junto o tempo todo. O ganho já tem o número que sobe e o som.

### Orientação

**[+] Setas na borda da tela**

Com o ícone do item, a distância e o anel de tempo restante. Um minimapa não
teria o que emoldurar num mapa sem borda; a seta na borda responde a única
pergunta que o jogador de fato faz enquanto corre, que é "para que lado?", sem
tirar os olhos do lugar onde ele vai morrer se olhar para outro canto.

A comida mais próxima é o faro da cobra e aparece mesmo no escuro, porque um
mundo infinito sem direção nenhuma não é exploração, é abandono. Todo o resto
precisa ter sido avistado uma vez.

**[+] Migalhas**

Um fio de partículas saindo da cabeça na direção da comida, e só quando ela
está fora da tela. Ligado o tempo todo, o jogador para de olhar o mundo e passa
a seguir uma linha.

**[+] Localizador**

Nome da região e coordenada da cabeça, no rodapé. Sem borda e sem mapa, é a
única coisa na tela que responde "onde eu estou".

**[+] Contador de regiões na HUD**

Quantas regiões distintas a partida já descobriu, ao lado de pontos, recorde,
tamanho e velocidade.

### A cobra

**[*] Pele nova**

Eram quadrados arredondados, um por célula, interpolando entre duas cores. Isso
funcionava a 28px por célula num tabuleiro fixo; a 40px virava uma fileira de
peças de dominó com um degradê chapado por cima, e era a coisa menos trabalhada
da tela.

O corpo agora é um tubo contínuo, traçado entre os centros dos segmentos em
três passadas concêntricas: contorno escuro na largura cheia, corpo em 74% dela
e um fio de luz em 26%. Do escuro na borda para o claro no meio, que é como um
cilindro se lê visto de cima.

Concêntricas, e não deslocadas para um canto. Deslocar o realce numa direção
fixa da tela parece certo enquanto a cobra anda reto e desmonta na primeira
curva: o realce sai de cima do corpo, ganha ponta redonda própria e vira uma
faixa chapada boiando por cima da cobra.

Nenhuma passada usa opacidade. As cápsulas se sobrepõem meia célula em cada
junta, e com transparência a junta ficaria visivelmente mais densa que o resto
do corpo: a névoa entra na cor, não no alfa.

**[*] Rampa de três paradas, normalizada por distância fixa**

Com duas cores, cabeça e cauda eram a mesma cor com menos luz e o corpo inteiro
lia como uma barra só. E normalizar a rampa pelo comprimento *atual* fazia uma
cobra de cinco segmentos exibir a rampa inteira em cinco faixas grandes, como
se o corpo fosse montado com peças de cores diferentes. Ela agora corre sobre
22 segmentos: cobra curta é quase de uma cor só, e o degradê aparece quando há
corpo para mostrá-lo.

**[+] Cauda que afina, sombra projetada, brilho no olho e língua**

A cauda afina nos últimos segmentos, mesmo numa cobra curta: ponta reta faz o
corpo parecer cortado com tesoura em vez de terminar. A língua sai a cada 2,6
segundos e não informa absolutamente nada: é o detalhe que separa uma cobra de
uma fila de blocos que anda.

**[+] Efeitos visuais por status**

Fogo tinge o corpo de laranja e solta brasas subindo; gelo tinge de azul e
solta cristais caindo. Cor e movimento, sem brilho em volta: o status precisa
aparecer de relance sem acender a tela inteira a cada partida.

### Áudio

**[+] Dois sons novos**

Avistar um elemento no escuro é uma nota de atenção, não de prêmio: o prêmio
só acontece se o jogador chegar lá a tempo. Região nova são duas notas
subindo: explorar é a proposta do jogo, então pisar onde ninguém pisou não pode
soar como o mesmo plop de uma fruta qualquer.

### Interface

**[*] A tela inteira é o mundo**

O tabuleiro com cantos arredondados e sombra saiu: a moldura era exatamente o
que dizia ao jogador "isto aqui acaba". A HUD passou a flutuar sobre o jogo,
com cortina de fundo que dissolve em vez de card, e some no menu.

**[*] "Como funciona" virou seção expansível**

As regras cresceram junto com o mundo, e sete parágrafos empurravam o botão
Jogar para fora da tela: a primeira coisa que alguém via ao abrir o jogo era
uma barra de rolagem. Fechada por padrão, com contador de linhas no cabeçalho,
e a barra de rolagem do menu foi escondida.

**[*] O menu se centraliza na vertical**

Com "Como funciona" fechada o conteúdo encolheu e sobrou um vazio embaixo. A
centralização é por margem automática e não por `justify-content: center` no
pai: com `justify-content`, no momento em que o conteúdo passa da altura da
janela o centro empurra o topo para fora da área rolável e o título fica
inalcançável. Margem automática distribui só a folga que existe, então ela
centraliza enquanto cabe e volta a alinhar no topo quando não cabe.

### Estrutura do código

**[+] `src/world/`**

`world.ts` (chunks, itens e a memória da névoa), `biomes.ts` (o campo contínuo
de regiões), `hash.ts` (as primitivas determinísticas por trás dele) e
`vision.ts` (visão, revelação e opacidade da névoa).

**[+] `src/render/` cresceu**

`camera.ts`, `motion.ts` (interpolação entre passos), `fog.ts`, `terrain.ts`,
`compass.ts`, `snakeSkin.ts` e `view.ts`. O `renderer.ts` voltou a ser o que
devia: a ordem das camadas.

**[+] Corte do que está no escuro**

Ruína e item em escuridão fechada não são desenhados, porque a névoa cobriria
tudo de qualquer jeito e essa é a maior parte da tela. São uns dois terços das
chamadas de desenho por quadro.

---

## [Revisão] 02/09/2026

Base revisada: commit `036e5e4`, *initial snake-ryse-minigame prototype*
(31/08/2026), com `src/main.ts` de 228 linhas e `src/style.css` de 296 linhas.

O conceito é de vocês e continua sendo: cobrinha com frutas elementais que
mudam a partida. A revisão mexeu em três frentes: corrigir o que quebrava a
jogabilidade, dar intenção ao que já existia, e trocar o tema inventado pelo
design system da Ryse.

### Correções de jogabilidade

**[!] Morte involuntária ao virar duas vezes seguidas**

O bug mais grave do protótipo. O guard validava a tecla contra a direção
*pendente*, não contra a *aplicada*. Indo para a direita, apertar ↑ e ← dentro
do mesmo passo (166ms a 6 passos por segundo, muito fácil) passava pelos dois
guards e a cobra invertia direto no próprio pescoço:

```
indo pra DIREITA  → direction = {1, 0}
pressiona W       → direction.y === 0, passa → direction = {0, -1}   (ainda não moveu)
pressiona A       → direction.x === 0, passa → direction = {-1, 0}
tick              → cobra andando pra direita move pra esquerda → morde snake[1]
```

Agora existe uma fila de input e cada tecla é validada contra a última direção
já **enfileirada**. ↑ + ← virou uma curva de duas etapas, que é o movimento
legítimo que o jogador quis fazer. Reversão direta continua recusada e colidir
de fato com o corpo continua matando. Corrigido.

**[!] Cauda contava como colisão**

O laço ia até `snake.length`, incluindo o último segmento, que é removido no
mesmo passo. Entrar na célula que a cauda está desocupando é movimento válido
no snake clássico, e o jogo matava por isso em curvas fechadas perfeitamente
legais. Agora a cauda só conta quando a cobra vai crescer naquele passo, porque
aí ela fica onde está. Corrigido.

**[!] Bônus da fruta de fogo não existia**

`pointsGained` era declarado como `0` e nunca recebia valor, porque todos os
ramos somavam direto em `score`. Depois fazia `pointsGained *= 3`, que é `0`. O
multiplicador de 3x era código morto desde o primeiro commit. Além disso a
checagem vinha *depois* de setar a própria expiração, então a fruta de fogo
multiplicaria a si mesma. Corrigido: o multiplicador é lido antes de aplicar o
efeito novo.

**[!] Pedras nasciam em cima do jogador**

Nem as pedras nem os itens excluíam células ocupadas: dava para uma pedra
nascer colada no nariz da cobra e a morte ser impossível de evitar, e para o
item nascer debaixo do corpo. O sorteio agora é feito sobre a lista de células
realmente livres, com as três células à frente da cabeça bloqueadas. Corrigido.

**[!] Fim de jogo travava a página**

`alert()` dentro do `requestAnimationFrame` congelava a thread, não desenhava o
quadro da morte (o jogador nunca via o que o matou) e exigia F5 para jogar de
novo. Corrigido.

**[!] WASD não funcionava com Caps Lock**

A comparação era sensível a maiúscula. Corrigido.

**[!] Setas rolavam a página**

Faltava `preventDefault` nas teclas de direção. Corrigido.

**[!] Dois relógios diferentes**

O laço usava `performance.now()` e os efeitos usavam `Date.now()`. Passou a ser
um relógio só, com o delta vindo do próprio laço.

**[-] Folha de estilo órfã**

`src/style.css` tinha 296 linhas e nunca era importada por ninguém: o CSS real
estava inline no `index.html`. Era sobra de template. Removida.

### Jogabilidade e balanceamento

**[*] Cada elemento ganhou um papel**

O gelo era puro prejuízo (ninguém *quer* ficar lento) e a terra dava +15 e
enchia a tela de pedras, ou seja, era uma armadilha disfarçada de fruta. Agora
cada fruta responde "por que eu ia querer isso?":

| Fruta | Papel | O que faz |
|---|---|---|
| Comida | base | +10, sem efeito |
| Essência | recompensa | +30, mas some em 6s |
| Fogo | risco | +50% de velocidade e pontos em dobro por 5s |
| Gelo | alívio | −40% de velocidade e as pedras congelam, dá para atravessar |
| Terra | aposta | espalha 6 pedras; cada uma que derreter com você vivo vale +10 |

**[*] Peso de sorteio invertido**

A lista era `['food','food','extra_points','earth','ice','fire']`: 33% de
comida contra 67% de power-up. O power-up virou o padrão e a comida virou a
exceção. Agora a comida é 60% dos sorteios, e o mesmo power-up não sai duas
vezes seguidas: antes dava para tirar três frutas de terra em sequência e
afogar o tabuleiro.

**[+] Progressão de dificuldade**

A velocidade base sobe 0,5 passo a cada 50 pontos, com teto em 11. Antes o
valor `6` estava escrito na mão em três lugares, então voltar de um efeito
sempre reiniciava a dificuldade do zero.

**[*] Tabuleiro mais largo**

De 20×20 em canvas fixo de 400px para 28×18 responsivo, dimensionado pelo
espaço disponível e escalado por `devicePixelRatio`: antes borrava em tela
retina e deixava metade da tela vazia em monitor widescreen.

### Estrutura do código

**[*] De um arquivo para uma arquitetura**

`src/main.ts` fazia seis trabalhos ao mesmo tempo. O código foi separado em
`core/` (laço, vetores, sorteio com semente), `game/` (estado, regras, input,
spawn, efeitos), `items/` (catálogo e arte), `render/` (canvas, renderizador,
tema), `ui/` (menu, HUD, toasts, overlays, modal), `audio/` e `styles/`.

O ganho concreto: `tick()` virou função sem DOM, que recebe o delta e devolve
eventos. É isso que permitiu escrever teste de verdade para o bug da reversão,
em vez de testar clicando.

**[+] Catálogo declarativo de itens**

Cor, pontos, peso de sorteio, efeito, arte e o texto da legenda saem todos da
mesma entrada. Adicionar uma fruta nova é adicionar um objeto, e a legenda do
menu se atualiza sozinha. Antes isso estava espalhado em três lugares que
podiam divergir.

**[+] Balanceamento num arquivo só**

Todo número que define o jogo vive em `game/config.ts`. Nada de constante
solta.

### Interface

**[*] Design system da Ryse**

O tema roxo inventado (`#8257e5`) saiu inteiro. A interface passou a usar os
tokens da Ryse, com as fontes servidas do disco (Poppins, Chakra Petch e
JetBrains Mono) em vez da rede.

Cinco regras do sistema estavam sendo quebradas e foram corrigidas: listra de
acento colada na borda dos cards, anel de 1px simulando contorno,
`backdrop-filter`, borda colorida em chip e sombra de queda pesada em card. Os
substitutos são os que o próprio sistema publica: poço de ícone aceso, fio de
luz no topo, vidro por gradiente e fill tonal.

**[+] Menu principal**

As regras moravam num painel lateral permanente que competia com o tabuleiro
durante a partida e ninguém lia. Viraram tela cheia antes de começar, com os
itens, o que cada um faz, os controles e o recorde. Durante o jogo a tela é o
tabuleiro.

**[+] HUD explícita**

Pontos, recorde, tamanho e velocidade ao vivo. A pontuação sobe com contagem
animada em vez de trocar o número de estalo.

**[+] Toasts de efeito**

Antes o jogador comia um quadrado azul e a cobra ficava lenta sem explicação
nenhuma. Agora o efeito ativo aparece na base do tabuleiro com nome, o que ele
faz e a contagem regressiva drenando.

**[+] Estados de jogo**

Menu, jogando, pausado e fim de jogo, com `Espaço` para pausar, `Enter` para
recomeçar e `Esc` para voltar ao menu. A tela de fim de jogo diz **o que** te
matou: parede, pedra ou o próprio corpo.

**[+] Recorde persistente**

Guardado no navegador, com fanfarra própria quando é batido.

### Arte

**[+] Ilustrações vetoriais para os itens**

Os itens eram quadrados coloridos. Agora cada um é uma ilustração desenhada à
mão em espaço 24×24, com silhueta, facetas e direção de luz fixa: maçã
vermelha com cabinho, folha e sombra na borda; gema com seis facetas; chama em
três camadas; floco com seis ramos calculados a 35° do eixo; pedra facetada.

É formato de dado, não de markup: o SVG da legenda é montado a partir do mesmo
dado que o canvas desenha com `Path2D`, então tabuleiro e legenda não podem
divergir.

### Áudio

**[+] Efeitos sonoros**

13 eventos: comer, cada power-up, pedra derretida, item expirado, degrau de
velocidade, pausa, fim de jogo e recorde: a partir de 7 amostras do pack
*Interface Sounds* do Kenney (CC0). Nada é sintetizado: o motor toca,
transpõe e sequencia gravações.

Os 21 candidatos do pack foram decodificados e medidos antes da escolha. Os
estridentes foram descartados por medição, não por gosto.

O som de comer, que toca dezenas de vezes por partida, alterna entre duas
amostras com 5% de variação de tom para não virar metrônomo.

**[+] Trilha de fundo**

Loop de 20,4s em `bgm.ogg`, recortado de `kawaiibgm.mp3`. A música original não
foi feita para dar loop: a correlação entre o fim e o começo era 0,06, ou
seja, um corte seco estalaria. O trecho foi escolhido por busca de melhor
casamento e recebeu crossfade de embrulho: o degrau na volta ficou em 0,005
contra um p99.9 de 0,016 do próprio material. De 2,3MB para 150KB.

**[+] Controles de áudio**

Pílula no canto inferior direito com liga/desliga de efeitos, liga/desliga de
trilha e configurações. O modal ajusta o volume exato de cada um, com o padrão
em 60% para efeitos e 15% para trilha. Atalhos `M` e `N`. Tudo persiste.

Efeitos e trilha são barramentos independentes, com limitador na saída: seis
pedras derretendo no mesmo quadro com um "comer" por cima somavam acima de 1 e
estouravam.

### Verificação

**[+] Testes da lógica pura**

14 asserções cobrindo os dois bugs de movimento, os limites do tabuleiro, a
integridade do catálogo e os padrões de áudio. Rodam sem navegador, porque a
lógica não depende de DOM.

Além disso, cada entrega foi conferida em navegador real: os sons foram
renderizados e medidos, o loop da trilha foi tocado e o degrau da emenda
medido, e o layout foi verificado em viewport larga e estreita.

---

## [0.1.0] 31/08/2026

Protótipo inicial, por Caio Daniel, Camily Ferreira, Elton, José Carlos e
Samuel Rocha.

- **[+]** Cobrinha em canvas com grade 20×20 e colisão com parede e corpo
- **[+]** Comida e item de pontos extras
- **[+]** Frutas elementais de terra, gelo e fogo, com efeitos temporários
- **[+]** Pedras temporárias como obstáculo
- **[+]** Placar e controle de velocidade por FPS

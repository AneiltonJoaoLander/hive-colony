# Hive & Hive Colony

Jogo de tabuleiro **Hive** (e a versão de fã **Hive Colony**) para jogar no navegador — no computador ou no celular.

- Hive original + Mosquito, Joaninha e Tatuzinho
- Hive Colony: Venom, Swarm, Predators, Guardians e Honeycombo
- Destaque das jogadas possíveis (como em sites de xadrez)
- Relógio de xadrez totalmente configurável: minutos e segundos, tempos diferentes por lado, incremento ou atraso
- Setas e marcações como no Lichess (botão direito + Shift/Ctrl/Alt; no celular, dedo parado + outro dedo)
- Layout para celular (retrato e paisagem), instalável na tela inicial (PWA), tela fica ligada durante partidas online
- Sons e efeitos sonoros sintetizados (peças, ataques, sua vez, pouco tempo, perigo para a Rainha, fim de jogo), com volume e mudo
- Contra o computador (3 níveis), 2 jogadores no mesmo aparelho ou **online** (sala por código/link)

## Peças para imprimir

`pecas-hive.pdf` (A4, 10 páginas): todas as peças do Hive e do Hive Colony com versos do Venom alinhados para frente e verso, Honeycombo, referência e resumo das regras. A página `pecas.html` gera o mesmo conteúdo (Ctrl+P).

## Jogar

Abra `index.html` (funciona direto do disco) ou acesse a versão publicada no GitHub Pages.

## Online

O multiplayer usa WebRTC via [PeerJS](https://peerjs.com): o servidor público do PeerJS só faz o encontro dos dois jogadores; as jogadas vão direto de um aparelho ao outro. O anfitrião é a fonte da verdade e, se a conexão cair (ex.: celular em segundo plano), o convidado reconecta sozinho.
Algumas redes (4G com CGNAT, redes corporativas) bloqueiam conexões diretas — nesse caso tente trocar de rede (Wi-Fi ↔ dados móveis).

## Estrutura

| Arquivo | Função |
|---|---|
| `js/engine.js` | regras (movimentos, colocação, vitória, módulos do Colony) |
| `js/ai.js` | computador |
| `js/icons.js` | silhuetas dos insetos (SVG) |
| `js/online.js` | conexão P2P (PeerJS) |
| `js/sound.js` | sons sintetizados (Web Audio) |
| `js/ui.js` | interface, relógio, jogo online |
| `js/vendor/peerjs.min.js` | PeerJS 1.5.4 (MIT) |

O pareamento "inseto da frente → inseto do verso" do módulo Venom está em `VENOM_BACK` (`js/engine.js`).

## Aviso

Projeto de fã, sem fins lucrativos e sem vínculo com os autores. **Hive** é criação de John Yianni (Gen42 Games); **Hive Colony** é uma expansão de fã de Stephen Taylor. Apoie os criadores comprando o jogo de tabuleiro.

const PRODUTOS = {
  bandas: [
    { id: "bandas-accept", nome: "Accept", imagem: "placas/bandas/accept.png", preco: "preço aqui" },
    { id: "bandas-acdc-bb", nome: "AC/DC BB", imagem: "placas/bandas/acdc-bb.png", preco: "preço aqui" },
    { id: "bandas-angra", nome: "Angra", imagem: "placas/bandas/angra.png", preco: "preço aqui" },
    { id: "bandas-arp", nome: "ARP", imagem: "placas/bandas/arp.png", preco: "preço aqui" },
    { id: "bandas-bls", nome: "BLS", imagem: "placas/bandas/bls.png", preco: "preço aqui" },
    { id: "bandas-bs-caravan", nome: "Black Sabbath Caravan", imagem: "placas/bandas/bs-caravan.png", preco: "preço aqui" },
    { id: "bandas-bs-hell", nome: "Black Sabbath Hell", imagem: "placas/bandas/bs-hell.png", preco: "preço aqui" },
    { id: "bandas-bs-master", nome: "Black Sabbath Master", imagem: "placas/bandas/bs-master.png", preco: "preço aqui" },
    { id: "bandas-cannibal", nome: "Cannibal", imagem: "placas/bandas/cannibal.png", preco: "preço aqui" },
    { id: "bandas-cannibal1", nome: "Cannibal 1", imagem: "placas/bandas/cannibal1.png", preco: "preço aqui" },
    { id: "bandas-chindrenofbodom", nome: "Children of Bodom", imagem: "placas/bandas/chindrenofbodom.png", preco: "preço aqui" },
    { id: "bandas-creedence", nome: "Creedence", imagem: "placas/bandas/creedence.png", preco: "preço aqui" },
    { id: "bandas-death", nome: "Death", imagem: "placas/bandas/death.png", preco: "preço aqui" },
    { id: "bandas-deep-purple", nome: "Deep Purple", imagem: "placas/bandas/deep-purple.png", preco: "preço aqui" },
    { id: "bandas-def-leppard", nome: "Def Leppard", imagem: "placas/bandas/def-leppard.png", preco: "preço aqui" },
    { id: "bandas-dio-holy", nome: "Dio Holy", imagem: "placas/bandas/dio-holy.png", preco: "preço aqui" },
    { id: "bandas-dire-straits-brother", nome: "Dire Straits Brother", imagem: "placas/bandas/dire-straits-brother.png", preco: "preço aqui" },
    { id: "bandas-dream-theater", nome: "Dream Theater", imagem: "placas/bandas/dream-theater.png", preco: "preço aqui" },
    { id: "bandas-helloween-keeper1", nome: "Helloween Keeper 1", imagem: "placas/bandas/helloween-keeper1.png", preco: "preço aqui" },
    { id: "bandas-helloween-keeper2", nome: "Helloween Keeper 2", imagem: "placas/bandas/helloween-keeper2.png", preco: "preço aqui" },
    { id: "bandas-helloween1", nome: "Helloween 1", imagem: "placas/bandas/helloween1.png", preco: "preço aqui" },
    { id: "bandas-helloween2", nome: "Helloween 2", imagem: "placas/bandas/helloween2.png", preco: "preço aqui" },
    { id: "bandas-helloween3", nome: "Helloween 3", imagem: "placas/bandas/helloween3.png", preco: "preço aqui" },
    { id: "bandas-iron-killers", nome: "Iron Maiden Killers", imagem: "placas/bandas/iron-killers.png", preco: "preço aqui" },
    { id: "bandas-iron1", nome: "Iron Maiden 1", imagem: "placas/bandas/iron1.png", preco: "preço aqui" },
    { id: "bandas-iron2", nome: "Iron Maiden 2", imagem: "placas/bandas/iron2.png", preco: "preço aqui" },
    { id: "bandas-judas-priest", nome: "Judas Priest", imagem: "placas/bandas/judas-priest.png", preco: "preço aqui" },
    { id: "bandas-kiss", nome: "Kiss", imagem: "placas/bandas/kiss.png", preco: "preço aqui" },
    { id: "bandas-korn-issues", nome: "Korn Issues", imagem: "placas/bandas/korn-issues.png", preco: "preço aqui" },
    { id: "bandas-korn", nome: "Korn", imagem: "placas/bandas/korn.png", preco: "preço aqui" },
    { id: "bandas-led1", nome: "Led Zeppelin 1", imagem: "placas/bandas/led1.png", preco: "preço aqui" },
    { id: "bandas-led2", nome: "Led Zeppelin 2", imagem: "placas/bandas/led2.png", preco: "preço aqui" },
    { id: "bandas-machine-head", nome: "Machine Head", imagem: "placas/bandas/machine-head.png", preco: "preço aqui" },
    { id: "bandas-megatheath-rust", nome: "Megadeth Rust", imagem: "placas/bandas/megatheath-rust.png", preco: "preço aqui" },
    { id: "bandas-metallica-justice", nome: "Metallica Justice", imagem: "placas/bandas/metallica-justice.png", preco: "preço aqui" },
    { id: "bandas-metallica-master", nome: "Metallica Master", imagem: "placas/bandas/metallica-master.png", preco: "preço aqui" },
    { id: "bandas-metallica-reload", nome: "Metallica Reload", imagem: "placas/bandas/metallica-reload.png", preco: "preço aqui" },
    { id: "bandas-motobead-1916", nome: "Motorhead 1916", imagem: "placas/bandas/motohead-1916.png", preco: "preço aqui" },
    { id: "bandas-motorhead-no-remorse", nome: "Motorhead No Remorse", imagem: "placas/bandas/motorhead-no remorse.png", preco: "preço aqui" },
    { id: "bandas-pantera-far", nome: "Pantera Far", imagem: "placas/bandas/pantera-far.png", preco: "preço aqui" },
    { id: "bandas-pantera-hell", nome: "Pantera Hell", imagem: "placas/bandas/pantera-hell.png", preco: "preço aqui" },
    { id: "bandas-pantera-vulgar", nome: "Pantera Vulgar", imagem: "placas/bandas/pantera-vulgar.png", preco: "preço aqui" },
    { id: "bandas-pink-floyd-the-wall", nome: "Pink Floyd The Wall", imagem: "placas/bandas/pink-floyd-the wall.png", preco: "preço aqui" },
    { id: "bandas-pink-floyd", nome: "Pink Floyd", imagem: "placas/bandas/pink-floyd.png", preco: "preço aqui" },
    { id: "bandas-planet-hemp-sagaz", nome: "Planet Hemp Sagaz", imagem: "placas/bandas/planet-hemp-sagaz.png", preco: "preço aqui" },
    { id: "bandas-planet-hemp-usuarios", nome: "Planet Hemp Usuários", imagem: "placas/bandas/planet-hemp-usuarios.png", preco: "preço aqui" },
    { id: "bandas-planet-hemp", nome: "Planet Hemp", imagem: "placas/bandas/planet-hemp.png", preco: "preço aqui" },
    { id: "bandas-rammstein", nome: "Rammstein", imagem: "placas/bandas/rammstein.png", preco: "preço aqui" },
    { id: "bandas-rammstein2", nome: "Rammstein 2", imagem: "placas/bandas/rammstein2.png", preco: "preço aqui" },
    { id: "bandas-ratm-los", nome: "RATM Los", imagem: "placas/bandas/ratm-los.png", preco: "preço aqui" },
    { id: "bandas-saxon-banda", nome: "Saxon Banda", imagem: "placas/bandas/saxon-banda.png", preco: "preço aqui" },
    { id: "bandas-saxon", nome: "Saxon", imagem: "placas/bandas/saxon.png", preco: "preço aqui" },
    { id: "bandas-sepultura-caos", nome: "Sepultura Caos", imagem: "placas/bandas/sepultura-caos.png", preco: "preço aqui" },
    { id: "bandas-sepultura-inner", nome: "Sepultura Inner", imagem: "placas/bandas/sepultura-inner.png", preco: "preço aqui" },
    { id: "bandas-sepultura-roots", nome: "Sepultura Roots", imagem: "placas/bandas/sepultura-roots.png", preco: "preço aqui" },
    { id: "bandas-skid-row", nome: "Skid Row", imagem: "placas/bandas/skid-row.png", preco: "preço aqui" },
    { id: "bandas-slayer", nome: "Slayer", imagem: "placas/bandas/slayer.png", preco: "preço aqui" },
    { id: "bandas-slipknot-logo", nome: "Slipknot Logo", imagem: "placas/bandas/slipknot-logo.png", preco: "preço aqui" },
    { id: "bandas-suicide-silence", nome: "Suicide Silence", imagem: "placas/bandas/suicide-silence.png", preco: "preço aqui" },
    { id: "bandas-twisted-sister", nome: "Twisted Sister", imagem: "placas/bandas/twisted-sister.png", preco: "preço aqui" },
    { id: "bandas-whitesnake-1987", nome: "Whitesnake 1987", imagem: "placas/bandas/whitesnake-1987.png", preco: "preço aqui" }
  ],

  bebidas: [
    { id: "bebidas-cachaçah", nome: "Cachaça H", imagem: "placas/bebida/cachaçah.png", preco: "preço aqui" },
    { id: "bebidas-cachaçam", nome: "Cachaça M", imagem: "placas/bebida/cachaçam.png", preco: "preço aqui" },
    { id: "bebidas-caipirinha-lovers", nome: "Caipirinha Lovers", imagem: "placas/bebida/caipirinha-lovers.png", preco: "preço aqui" },
    { id: "bebidas-cocktails", nome: "Cocktails", imagem: "placas/bebida/cocktails.png", preco: "preço aqui" },
    { id: "bebidas-drink-beer", nome: "Drink Beer", imagem: "placas/bebida/drink-beer.png", preco: "preço aqui" },
    { id: "bebidas-drink-cocktails", nome: "Drink Cocktails", imagem: "placas/bebida/drink-cocktails.png", preco: "preço aqui" },
    { id: "bebidas-drink-tequila", nome: "Drink Tequila", imagem: "placas/bebida/drink-tequila.png", preco: "preço aqui" },
    { id: "bebidas-drink-whiskey", nome: "Drink Whiskey", imagem: "placas/bebida/drink-whiskey.png", preco: "preço aqui" },
    { id: "bebidas-good-beer", nome: "Good Beer", imagem: "placas/bebida/good-beer.png", preco: "preço aqui" },
    { id: "bebidas-in-vino", nome: "In Vino", imagem: "placas/bebida/in-vino.png", preco: "preço aqui" },
    { id: "bebidas-rum", nome: "Rum", imagem: "placas/bebida/rum.png", preco: "preço aqui" },
    { id: "bebidas-tequila", nome: "Tequila", imagem: "placas/bebida/tequila.png", preco: "preço aqui" },
    { id: "bebidas-vodka", nome: "Vodka", imagem: "placas/bebida/vodka.png", preco: "preço aqui" },
    { id: "bebidas-whiskey", nome: "Whiskey", imagem: "placas/bebida/whiskey.png", preco: "preço aqui" },
    { id: "bebida-reuniao", nome: "Bebida Reunião", imagem: "placas/bebida/bebida-reuniao.png", preco: "preço aqui" }
  ],

  "fotos-reais": [
    { id: "fotos-reais-foto1", nome: "Foto Real 1", imagem: "placas/fotos-reais/foto1.png", preco: "preço aqui" },
    { id: "fotos-reais-foto2", nome: "Foto Real 2", imagem: "placas/fotos-reais/foto2.png", preco: "preço aqui" },
    { id: "fotos-reais-foto3", nome: "Foto Real 3", imagem: "placas/fotos-reais/foto3.png", preco: "preço aqui" },
    { id: "fotos-reais-foto4", nome: "Foto Real 4", imagem: "placas/fotos-reais/foto4.png", preco: "preço aqui" },
    { id: "fotos-reais-foto5", nome: "Foto Real 5", imagem: "placas/fotos-reais/foto5.png", preco: "preço aqui" },
    { id: "fotos-reais-foto6", nome: "Foto Real 6", imagem: "placas/fotos-reais/foto6.png", preco: "preço aqui" }
  ],

  games: [
    { id: "games-f-zero", nome: "F-Zero", imagem: "placas/games/f-zero.png", preco: "preço aqui" },
    { id: "games-final-fantasy", nome: "Final Fantasy", imagem: "placas/games/final-fantasy.png", preco: "preço aqui" },
    { id: "games-free-fire", nome: "Free Fire", imagem: "placas/games/free-fire.png", preco: "preço aqui" },
    { id: "games-gta-5", nome: "GTA 5", imagem: "placas/games/gta-5.png", preco: "preço aqui" },
    { id: "games-gta-sa", nome: "GTA San Andreas", imagem: "placas/games/gta-sa.png", preco: "preço aqui" },
    { id: "games-mortal", nome: "Mortal", imagem: "placas/games/mortal.png", preco: "preço aqui" },
    { id: "games-pac", nome: "Pac", imagem: "placas/games/pac.png", preco: "preço aqui" },
    { id: "games-retro", nome: "Retro", imagem: "placas/games/retro.png", preco: "preço aqui" },
    { id: "games-roblox", nome: "Roblox", imagem: "placas/games/roblox.png", preco: "preço aqui" },
    { id: "games-star-fox", nome: "Star Fox", imagem: "placas/games/star-fox.png", preco: "preço aqui" }
  ],

  garage: [
    { id: "garage-garage1", nome: "Garage 1", imagem: "placas/garage/fusca.png", preco: "preço aqui" },
    { id: "garage-garage2", nome: "Garage 2", imagem: "placas/garage/pala-placa.png", preco: "preço aqui" },
    { id: "garage-garage3", nome: "Garage 3", imagem: "placas/garage/vira-projeto.png", preco: "preço aqui" },
    { id: "garage-garage4", nome: "Garage 4", imagem: "placas/garage/garage4.png", preco: "preço aqui" },
    { id: "garage-garage5", nome: "Garage 5", imagem: "placas/garage/garage5.png", preco: "preço aqui" },
    { id: "garage-garage6", nome: "Garage 6", imagem: "placas/garage/garage6.png", preco: "preço aqui" },
    { id: "garage-garage7", nome: "Garage 7", imagem: "placas/garage/garage7.png", preco: "preço aqui" },
    { id: "garage-garage8", nome: "Garage 8", imagem: "placas/garage/garage8.png", preco: "preço aqui" },
    { id: "garage-garage9", nome: "Garage 9", imagem: "placas/garage/garage9.png", preco: "preço aqui" },
    { id: "garage-garage10", nome: "Garage 10", imagem: "placas/garage/garage10.png", preco: "preço aqui" },
    { id: "garage-garage11", nome: "Garage 11", imagem: "placas/garage/garage11.png", preco: "preço aqui" },
    { id: "garage-garage12", nome: "Garage 12", imagem: "placas/garage/garage12.png", preco: "preço aqui" }
  ],

  "home-frases": [
    { id: "home-frases-amigo-familia", nome: "Amigo Família", imagem: "placas/home-frases/amigo-familia.png", preco: "preço aqui" },
    { id: "home-frases-amizade", nome: "Amizade", imagem: "placas/home-frases/amizade.png", preco: "preço aqui" },
    { id: "home-frases-beleza", nome: "Beleza", imagem: "placas/home-frases/beleza.png", preco: "preço aqui" },
    { id: "home-frases-frase1", nome: "Frase 1", imagem: "placas/home-frases/frase1.png", preco: "preço aqui" },
    { id: "home-frases-frase2", nome: "Frase 2", imagem: "placas/home-frases/frase2.png", preco: "preço aqui" },
    { id: "home-frases-frase3", nome: "Frase 3", imagem: "placas/home-frases/frase3.png", preco: "preço aqui" },
    { id: "home-frases-frase4", nome: "Frase 4", imagem: "placas/home-frases/frase4.png", preco: "preço aqui" },
    { id: "home-frases-frase5", nome: "Frase 5", imagem: "placas/home-frases/frase5.png", preco: "preço aqui" },
    { id: "home-frases-frase6", nome: "Frase 6", imagem: "placas/home-frases/frase6.png", preco: "preço aqui" }
  ],

  infantil: [
    { id: "infantil-bat", nome: "Bat", imagem: "placas/infantil/bat.png", preco: "preço aqui" },
    { id: "infantil-brincar", nome: "Brincar", imagem: "placas/infantil/brincar.png", preco: "preço aqui" },
    { id: "infantil-cachorro", nome: "Cachorro", imagem: "placas/infantil/cachorro.png", preco: "preço aqui" },
    { id: "infantil-doces-sonhos", nome: "Doces Sonhos", imagem: "placas/infantil/doces-sonhos.png", preco: "preço aqui" },
    { id: "infantil-dormir", nome: "Dormir", imagem: "placas/infantil/dormir.png", preco: "preço aqui" },
    { id: "infantil-elefante", nome: "Elefante", imagem: "placas/infantil/elefante.png", preco: "preço aqui" },
    { id: "infantil-giraffa", nome: "Girafa", imagem: "placas/infantil/giraffa.png", preco: "preço aqui" },
    { id: "infantil-hippo", nome: "Hippo", imagem: "placas/infantil/hippo.png", preco: "preço aqui" },
    { id: "infantil-leao", nome: "Leão", imagem: "placas/infantil/leao.png", preco: "preço aqui" },
    { id: "infantil-macaco", nome: "Macaco", imagem: "placas/infantil/macaco.png", preco: "preço aqui" },
    { id: "infantil-princesa", nome: "Princesa", imagem: "placas/infantil/princesa.png", preco: "preço aqui" },
    { id: "infantil-principe", nome: "Príncipe", imagem: "placas/infantil/principe.png", preco: "preço aqui" },
    { id: "infantil-quartinho-abencoado-m", nome: "Quartinho Abençoado M", imagem: "placas/infantil/quartinho-abençoado-m.png", preco: "preço aqui" },
    { id: "infantil-quartinho-abencoado", nome: "Quartinho Abençoado", imagem: "placas/infantil/quartinho-abençoado.png", preco: "preço aqui" },
    { id: "infantil-sonhe-alto", nome: "Sonhe Alto", imagem: "placas/infantil/sonhe-alto.png", preco: "preço aqui" },
    { id: "infantil-sonhe", nome: "Sonhe", imagem: "placas/infantil/sonhe.png", preco: "preço aqui" },
    { id: "infantil-superm", nome: "Super M", imagem: "placas/infantil/superm.png", preco: "preço aqui" },
    { id: "infantil-tigre", nome: "Tigre", imagem: "placas/infantil/tigre.png", preco: "preço aqui" },
    { id: "infantil-zebra", nome: "Zebra", imagem: "placas/infantil/zebra.png", preco: "preço aqui" }
  ],

  motos: [
    { id: "motos-alma-livre", nome: "Alma Livre", imagem: "placas/motos/alma-livre.png", preco: "preço aqui" },
    { id: "motos-born", nome: "Born", imagem: "placas/motos/born.png", preco: "preço aqui" },
    { id: "motos-deserto", nome: "Deserto", imagem: "placas/motos/deserto.png", preco: "preço aqui" },
    { id: "motos-ferrugem", nome: "Ferrugem", imagem: "placas/motos/ferrugem.png", preco: "preço aqui" },
    { id: "motos-iron-wings", nome: "Iron Wings", imagem: "placas/motos/iron-wings.png", preco: "preço aqui" },
    { id: "motos-liberdade", nome: "Liberdade", imagem: "placas/motos/liberdade.png", preco: "preço aqui" },
    { id: "motos-ride-die", nome: "Ride or Die", imagem: "placas/motos/ride-die.png", preco: "preço aqui" },
    { id: "motos-rock-ride1", nome: "Rock Ride 1", imagem: "placas/motos/rock-ride1.png", preco: "preço aqui" },
    { id: "motos-rock-ride2", nome: "Rock Ride 2", imagem: "placas/motos/rock-ride2.png", preco: "preço aqui" },
    { id: "motos-velho", nome: "Velho", imagem: "placas/motos/velho.png", preco: "preço aqui" }
  ],

  musica: [
    { id: "musica-musica1", nome: "Música 1", imagem: "placas/musica/musica1.png", preco: "preço aqui" },
    { id: "musica-musica2", nome: "Música 2", imagem: "placas/musica/musica2.png", preco: "preço aqui" },
    { id: "musica-musica3", nome: "Música 3", imagem: "placas/musica/musica3.png", preco: "preço aqui" },
    { id: "musica-musica4", nome: "Música 4", imagem: "placas/musica/musica4.png", preco: "preço aqui" },
    { id: "musica-musica5", nome: "Música 5", imagem: "placas/musica/musica5.png", preco: "preço aqui" },
    { id: "musica-musica6", nome: "Música 6", imagem: "placas/musica/musica6.png", preco: "preço aqui" },
    { id: "musica-musica7", nome: "Música 7", imagem: "placas/musica/musica7.png", preco: "preço aqui" },
    { id: "musica-musica8", nome: "Música 8", imagem: "placas/musica/musica8.png", preco: "preço aqui" },
    { id: "musica-musica9", nome: "Música 9", imagem: "placas/musica/musica9.png", preco: "preço aqui" },
    { id: "musica-musica10", nome: "Música 10", imagem: "placas/musica/musica10.png", preco: "preço aqui" },
    { id: "musica-musica11", nome: "Música 11", imagem: "placas/musica/musica11.png", preco: "preço aqui" },
    { id: "musica-musica12", nome: "Música 12", imagem: "placas/musica/musica12.png", preco: "preço aqui" }
  ],

  rpg: [
    { id: "rpg-3magos", nome: "3 Magos", imagem: "placas/rpg/3magos.png", preco: "preço aqui" },
    { id: "rpg-abobora", nome: "Abóbora", imagem: "placas/rpg/abobora.png", preco: "preço aqui" },
    { id: "rpg-adaga", nome: "Adaga", imagem: "placas/rpg/adaga.png", preco: "preço aqui" },
    { id: "rpg-arco", nome: "Arco", imagem: "placas/rpg/arco.png", preco: "preço aqui" },
    { id: "rpg-espada-gelo", nome: "Espada de Gelo", imagem: "placas/rpg/espada-gelo.png", preco: "preço aqui" },
    { id: "rpg-gelo", nome: "Gelo", imagem: "placas/rpg/gelo.png", preco: "preço aqui" },
    { id: "rpg-machado", nome: "Machado", imagem: "placas/rpg/machado.png", preco: "preço aqui" },
    { id: "rpg-mapa", nome: "Mapa", imagem: "placas/rpg/mapa.png", preco: "preço aqui" },
    { id: "rpg-nature", nome: "Nature", imagem: "placas/rpg/nature.png", preco: "preço aqui" },
    { id: "rpg-pureza", nome: "Pureza", imagem: "placas/rpg/pureza.png", preco: "preço aqui" }
  ],

  street: [
    { id: "street-chao", nome: "Chão", imagem: "placas/street/chao.png", preco: "preço aqui" },
    { id: "street-hh-h", nome: "HH H", imagem: "placas/street/hh-h.png", preco: "preço aqui" },
    { id: "street-hh-m", nome: "HH M", imagem: "placas/street/hh-m.png", preco: "preço aqui" },
    { id: "street-jacketa", nome: "Jacketa", imagem: "placas/street/jacketa.png", preco: "preço aqui" },
    { id: "street-naipess", nome: "Naipess", imagem: "placas/street/naipess.png", preco: "preço aqui" },
    { id: "street-naopedelicença", nome: "Não Pede Licença", imagem: "placas/street/naopedelicença.png", preco: "preço aqui" },
    { id: "street-paz-spray", nome: "Paz Spray", imagem: "placas/street/paz-spray.png", preco: "preço aqui" },
    { id: "street-role-sem-fim", nome: "Rolê Sem Fim", imagem: "placas/street/role-sem-fim.png", preco: "preço aqui" },
    { id: "street-skate1", nome: "Skate 1", imagem: "placas/street/skate1.png", preco: "preço aqui" },
    { id: "street-skate2", nome: "Skate 2", imagem: "placas/street/skate2.png", preco: "preço aqui" },
    { id: "street-skate3", nome: "Skate 3", imagem: "placas/street/skate3.png", preco: "preço aqui" },
    { id: "street-skateh", nome: "Skate H", imagem: "placas/street/skateh.png", preco: "preço aqui" },
    { id: "street-skatem", nome: "Skate M", imagem: "placas/street/skatem.png", preco: "preço aqui" },
    { id: "street-skatista", nome: "Skatista", imagem: "placas/street/skatista.png", preco: "preço aqui" },
    { id: "street-som", nome: "Som", imagem: "placas/street/som.png", preco: "preço aqui" },
    { id: "street-voz", nome: "Voz", imagem: "placas/street/voz.png", preco: "preço aqui" },
    { id: "street-zap-mineiro", nome: "Zap Mineiro", imagem: "placas/street/zap-mineiro.png", preco: "preço aqui" },
    { id: "street-skate-rua", nome: "Skate Rua", imagem: "placas/street/skate-rua.png", preco: "preço aqui" },
    { id: "street-tenis-fio", nome: "Tenis Fio", imagem: "placas/street/tenis-fio.png", preco: "preço aqui" }
  ],

  trip: [
    { id: "trip-crazy", nome: "Crazy", imagem: "placas/trip/crazy.png", preco: "preço aqui" },
    { id: "trip-derretendo", nome: "Derretendo", imagem: "placas/trip/derretendo.png", preco: "preço aqui" },
    { id: "trip-economico", nome: "Econômico", imagem: "placas/trip/economico.png", preco: "preço aqui" },
    { id: "trip-meditando", nome: "Meditando", imagem: "placas/trip/meditando.png", preco: "preço aqui" }
  ]
};

function getProdutosPorCategoria(categoria) {
  return PRODUTOS[categoria] || [];
}

function getProdutoPorId(id) {
  for (const categoria in PRODUTOS) {
    const produto = PRODUTOS[categoria].find(item => item.id === id);
    if (produto) return produto;
  }
  return null;
}

function salvarCarrinho(carrinho) {
  localStorage.setItem("heeeph_cart", JSON.stringify(carrinho));
}

function obterCarrinho() {
  return JSON.parse(localStorage.getItem("heeeph_cart")) || [];
}

function adicionarAoCarrinho(id) {
  const produto = getProdutoPorId(id);
  if (!produto) return;

  const carrinho = obterCarrinho();
  const itemExistente = carrinho.find(item => item.id === id);

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      ...produto,
      quantidade: 1
    });
  }

  salvarCarrinho(carrinho);
  alert(`${produto.nome} foi adicionado ao carrinho!`);
}

function removerDoCarrinho(id) {
  let carrinho = obterCarrinho();
  carrinho = carrinho.filter(item => item.id !== id);
  salvarCarrinho(carrinho);
}

function alterarQuantidade(id, delta) {
  const carrinho = obterCarrinho();
  const item = carrinho.find(produto => produto.id === id);

  if (!item) return;

  item.quantidade += delta;

  if (item.quantidade <= 0) {
    removerDoCarrinho(id);
    return;
  }

  salvarCarrinho(carrinho);
}

function contarItensCarrinho() {
  const carrinho = obterCarrinho();
  return carrinho.reduce((total, item) => total + item.quantidade, 0);
}

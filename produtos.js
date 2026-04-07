const DESTAQUES_HOME = [
  "placas/street/naipess.png",
  "placas/street/skatista.png",
  "placas/bebida/tequila.png"
];

const PRODUTOS = {
  bandas: [
    { id: "bandas-accept", nome: "Accept\n10x15cm", imagem: "placas/bandas/accept.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-acdc-bb", nome: "AC/DC\n10x15cm", imagem: "placas/bandas/acdc-bb.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-angra", nome: "Angra-Angels Cry\n10x15cm", imagem: "placas/bandas/angra.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-arp", nome: "Axel Rudi Pell\n10x15cm", imagem: "placas/bandas/arp.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-bls", nome: "Black Label Society\n10x15cm", imagem: "placas/bandas/bls.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-bs-caravan", nome: "Black Sabbath-Planet Caravan\n10x15cm", imagem: "placas/bandas/bs-caravan.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-bs-hell", nome: "Black Sabbath-Heaven in Hell\n10x15cm", imagem: "placas/bandas/bs-hell.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-bs-master", nome: "Black Sabbath-Master of Reallity\n10x15cm", imagem: "placas/bandas/bs-master.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-cannibal", nome: "Cannibal Corpse Banda\n10x15cm", imagem: "placas/bandas/cannibal.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-cannibal1", nome: "Cannibal Corpse\n10x15cm", imagem: "placas/bandas/cannibal1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-chindrenofbodom", nome: "Children of Bodom\n10x15cm", imagem: "placas/bandas/chindrenofbodom.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-creedence", nome: "Creedence\n10x15cm", imagem: "placas/bandas/creedence.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-death", nome: "Death\n10x15cm", imagem: "placas/bandas/death.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-deep-purple", nome: "Deep Purple\n10x15cm", imagem: "placas/bandas/deep-purple.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-def-leppard", nome: "Def Leppard\n10x15cm", imagem: "placas/bandas/def-leppard.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-dio-holy", nome: "Dio - Holy Diver\n10x15cm", imagem: "placas/bandas/dio-holy.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-dire-straits-brother", nome: "Dire Straits-Brothers in Arms\n10x15cm", imagem: "placas/bandas/dire-straits-brother.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-dream-theater", nome: "Dream Theater\n10x15cm", imagem: "placas/bandas/dream-theater.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-helloween-keeper1", nome: "Helloween Keeper 1\n10x15cm", imagem: "placas/bandas/helloween-keeper1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-helloween-keeper2", nome: "Helloween Keeper 2\n10x15cm", imagem: "placas/bandas/helloween-keeper2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-helloween1", nome: "Helloween 1\n10x15cm", imagem: "placas/bandas/helloween1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-helloween2", nome: "Helloween 2\n10x15cm", imagem: "placas/bandas/helloween2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-helloween3", nome: "Helloween 3\n10x15cm", imagem: "placas/bandas/helloween3.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-iron-killers", nome: "Iron Maiden - Killers\n10x15cm", imagem: "placas/bandas/iron-killers.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-iron1", nome: "Iron Maiden 1\n10x15cm", imagem: "placas/bandas/iron1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-iron2", nome: "Iron Maiden 2\n10x15cm", imagem: "placas/bandas/iron2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-judas-priest", nome: "Judas Priest\n10x15cm", imagem: "placas/bandas/judas-priest.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-kiss", nome: "Kiss\n10x15cm", imagem: "placas/bandas/kiss.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-korn-issues", nome: "Korn Issues\n10x15cm", imagem: "placas/bandas/korn-issues.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-korn", nome: "Korn\n10x15cm", imagem: "placas/bandas/korn.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-led1", nome: "Led Zeppelin 1\n10x15cm", imagem: "placas/bandas/led1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-led2", nome: "Led Zeppelin 2\n10x15cm", imagem: "placas/bandas/led2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-machine-head", nome: "Machine Head\n10x15cm", imagem: "placas/bandas/machine-head.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-megatheath-rust", nome: "Megadeth - Rust in Peace\n10x15cm", imagem: "placas/bandas/megatheath-rust.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-metallica-justice", nome: "Metallica Justice for All\n10x15cm", imagem: "placas/bandas/metallica-justice.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-metallica-master", nome: "Metallica Master\n10x15cm", imagem: "placas/bandas/metallica-master.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-metallica-reload", nome: "Metallica-Reload\n10x15cm", imagem: "placas/bandas/metallica-reload.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-motobead-1916", nome: "Motorhead-1916\n10x15cm", imagem: "placas/bandas/motohead-1916.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-motorhead-no-remorse", nome: "Motorhead-No Remorse\n10x15cm", imagem: "placas/bandas/motorhead-no remorse.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-pantera-far", nome: "Pantera-Far Beyond\n10x15cm", imagem: "placas/bandas/pantera-far.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-pantera-hell", nome: "Pantera-Cowboys from Hell\n10x15cm", imagem: "placas/bandas/pantera-hell.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-pantera-vulgar", nome: "Pantera-Vulgar and Display\n10x15cm", imagem: "placas/bandas/pantera-vulgar.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-pink-floyd-the-wall", nome: "Pink Floyd-The Wall\n10x15cm", imagem: "placas/bandas/pink-floyd-the wall.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-pink-floyd", nome: "Pink Floyd\n10x15cm", imagem: "placas/bandas/pink-floyd.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-planet-hemp-sagaz", nome: "Planet Hemp Sagaz\n10x15cm", imagem: "placas/bandas/planet-hemp-sagaz.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-planet-hemp-usuarios", nome: "Planet Hemp-Usuários\n10x15cm", imagem: "placas/bandas/planet-hemp-usuarios.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-planet-hemp", nome: "Planet Hemp\n10x15cm", imagem: "placas/bandas/planet-hemp.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-rammstein", nome: "Rammstein\n10x15cm", imagem: "placas/bandas/rammstein.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-rammstein2", nome: "Rammstein 2\n10x15cm", imagem: "placas/bandas/rammstein2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-ratm-los", nome: "Rage Against-The Battle of Los Angeles\n10x15cm", imagem: "placas/bandas/ratm-los.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-saxon-banda", nome: "Saxon Banda\n10x15cm", imagem: "placas/bandas/saxon-banda.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-saxon", nome: "Saxon\n10x15cm", imagem: "placas/bandas/saxon.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-sepultura-caos", nome: "Sepultura Caos\n10x15cm", imagem: "placas/bandas/sepultura-caos.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-sepultura-inner", nome: "Sepultura-Arise\n10x15cm", imagem: "placas/bandas/sepultura-inner.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-sepultura-roots", nome: "Sepultura-Roots\n10x15cm", imagem: "placas/bandas/sepultura-roots.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-skid-row", nome: "Skid Row\n10x15cm", imagem: "placas/bandas/skid-row.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-slayer", nome: "Slayer\n10x15cm", imagem: "placas/bandas/slayer.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-slipknot-logo", nome: "Slipknot Logo\n10x15cm", imagem: "placas/bandas/slipknot-logo.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-suicide-silence", nome: "Suicide Silence\n10x15cm", imagem: "placas/bandas/suicide-silence.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-twisted-sister", nome: "Twisted Sister\n10x15cm", imagem: "placas/bandas/twisted-sister.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bandas-whitesnake-1987", nome: "Whitesnake-1987\n10x15cm", imagem: "placas/bandas/whitesnake-1987.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  bebidas: [
    { id: "bebida-reuniao", nome: "Bebida não pode faltar !!\n10x15cm", imagem: "placas/bebida/bebida-reuniao.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-good-beer", nome: "Good Good Good\n10x15cm", imagem: "placas/bebida/good-beer.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-cocktails", nome: "Cocktails\n10x15cm", imagem: "placas/bebida/cocktails.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-cachaçah", nome: "Coleção - Cachaça Macho\n10x15cm", imagem: "placas/bebida/cachaçah.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-cachaçam", nome: "Coleção - Cachaça Fêmea\n10x15cm", imagem: "placas/bebida/cachaçam.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-rum", nome: "Coleção - Rum\n10x15cm", imagem: "placas/bebida/rum.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-tequila", nome: "Coleção - Tequila\n10x15cm", imagem: "placas/bebida/tequila.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "bebidas-vodka", nome: "Coleção - Vodka\n10x15cm", imagem: "placas/bebida/vodka.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-whiskey", nome: "Coleção - Whiskey\n10x15cm", imagem: "placas/bebida/whiskey.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-drink-beer", nome: "Coleção - Drink Beer\n10x15cm", imagem: "placas/bebida/drink-beer.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-drink-cocktails", nome: "Coleção -Drink Cocktails\n10x15cm", imagem: "placas/bebida/drink-cocktails.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-drink-tequila", nome: "Coleção - Drink Tequila\n10x15cm", imagem: "placas/bebida/drink-tequila.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "bebidas-drink-whiskey", nome: "Coleção - Drink Whiskey\n10x15cm", imagem: "placas/bebida/drink-whiskey.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-caipirinha-lovers", nome: "Coleção - Caipirinha Lovers\n10x15cm", imagem: "placas/bebida/caipirinha-lovers.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "bebidas-in-vino", nome: "Coleção - In Vino\n10x15cm", imagem: "placas/bebida/in-vino.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  "fotos-reais": [
    { id: "fotos-reais-foto1", nome: "Placas 10x15 Bandas\n10x15cm", imagem: "placas/reais/bandas-1.png", preco: "", medida: "10x15cm" },
    { id: "fotos-reais-foto2", nome: "Placas 10x15cm\n10x15cm", imagem: "placas/reais/bandas-2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "fotos-reais-foto3", nome: "Mural com 35 placas 10x15cm\n10x15cm", imagem: "placas/reais/bandas-3.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "fotos-reais-foto4", nome: "Em Breve\n10x15cm", imagem: "placas/reais/foto4.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "fotos-reais-foto5", nome: "Em Breve\n10x15cm", imagem: "placas/reais/foto5.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "fotos-reais-foto6", nome: "Em Breve\n10x15cm", imagem: "placas/reais/foto6.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  games: [
    { id: "games-f-zero", nome: "F-Zero\n10x15cm", imagem: "placas/games/f-zero.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-final-fantasy", nome: "Final Fantasy\n10x15cm", imagem: "placas/games/final-fantasy.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-free-fire", nome: "Free Fire\n10x15cm", imagem: "placas/games/free-fire.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-gta-5", nome: "GTA 5\n10x15cm", imagem: "placas/games/gta-5.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-gta-sa", nome: "GTA San Andreas\n10x15cm", imagem: "placas/games/gta-sa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-mortal", nome: "Mortal Kombat\n10x15cm", imagem: "placas/games/mortal.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-pac", nome: "Pac-Man\n10x15cm", imagem: "placas/games/pac.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-retro", nome: "Retrô Gamer\n10x15cm", imagem: "placas/games/retro.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-roblox", nome: "Roblox\n10x15cm", imagem: "placas/games/roblox.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "games-star-fox", nome: "Star Fox\n10x15cm", imagem: "placas/games/star-fox.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  garage: [
    { id: "garage-garage1", nome: "Fuscão !!!\n10x15cm", imagem: "placas/garage/fusca.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage2", nome: "Opala\n10x15cm", imagem: "placas/garage/pala-placa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage3", nome: "Mãos à Obra\n10x15cm", imagem: "placas/garage/vira-projeto.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage4", nome: "Respeito e Atitude, só pra quem conheçe !\n10x15cm", imagem: "placas/garage/mach1-v8.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage5", nome: "Mustang Mach 1\n10x15cm", imagem: "placas/garage/nascido-para-voar.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage6", nome: "SS Zangado !!!\n10x15cm", imagem: "placas/garage/opala-ss.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage7", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage7.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage8", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage8.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage9", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage9.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage10", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage10.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage11", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage11.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "garage-garage12", nome: "Em Breve\n10x15cm", imagem: "placas/garage/garage12.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  "home-frases": [
    { id: "home-frases-amigo-familia", nome: "Amigo Família\n10x15cm", imagem: "placas/home-frases/amigo-familia.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-amizade", nome: "Amizade\n10x15cm", imagem: "placas/home-frases/amizade.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-beleza", nome: "Beleza\n10x15cm", imagem: "placas/home-frases/beleza.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase1", nome: "Frase 1\n10x15cm", imagem: "placas/home-frases/frase1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase2", nome: "Frase 2\n10x15cm", imagem: "placas/home-frases/frase2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase3", nome: "Frase 3\n10x15cm", imagem: "placas/home-frases/frase3.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase4", nome: "Frase 4\n10x15cm", imagem: "placas/home-frases/frase4.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase5", nome: "Frase 5\n10x15cm", imagem: "placas/home-frases/frase5.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "home-frases-frase6", nome: "Frase 6\n10x15cm", imagem: "placas/home-frases/frase6.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  infantil: [
    { id: "infantil-bat", nome: "Batman\n10x15cm", imagem: "placas/infantil/bat.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-superm", nome: "Meu Super Herói !!\n10x15cm", imagem: "placas/infantil/superm.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-brincar", nome: "Ideal para o quarto !!\n10x15cm", imagem: "placas/infantil/brincar.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-cachorro", nome: "Cachorrinho\n10x15cm", imagem: "placas/infantil/cachorro.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-doces-sonhos", nome: "Doces Sonhos\n10x15cm", imagem: "placas/infantil/doces-sonhos.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-dormir", nome: "Hora do Soninho...\n10x15cm", imagem: "placas/infantil/dormir.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-tigre", nome: "Coleção - Tigre\n10x15cm", imagem: "placas/infantil/tigre.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-zebra", nome: "Coleção - Zebra\n10x15cm", imagem: "placas/infantil/zebra.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-elefante", nome: "Coleção - Elefante\n10x15cm", imagem: "placas/infantil/elefante.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-giraffa", nome: "Coleção - Girafa\n10x15cm", imagem: "placas/infantil/giraffa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-hippo", nome: "Coleção - Hippo\n10x15cm", imagem: "placas/infantil/hippo.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-leao", nome: "Coleção - Leão\n10x15cm", imagem: "placas/infantil/leao.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-macaco", nome: "Coleção - Macaco\n10x15cm", imagem: "placas/infantil/macaco.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-princesa", nome: "Princesa\n10x15cm", imagem: "placas/infantil/princesa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-principe", nome: "Príncipe\n10x15cm", imagem: "placas/infantil/principe.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-quartinho-abencoado-m", nome: "Para o quartinho dela\n10x15cm", imagem: "placas/infantil/quartinho-abençoado-m.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-quartinho-abencoado", nome: "Para o quartinho dela\n10x15cm", imagem: "placas/infantil/quartinho-abençoado.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-sonhe-alto", nome: "Sonhe Alto Pequeno\n10x15cm", imagem: "placas/infantil/sonhe-alto.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "infantil-sonhe", nome: "Sonhe Alto\n10x15cm", imagem: "placas/infantil/sonhe.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  motos: [
    { id: "motos-alma-livre", nome: "Alma Livre\n10x15cm", imagem: "placas/motos/alma-livre.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-born", nome: "Born\n10x15cm", imagem: "placas/motos/born.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-deserto", nome: "Deserto\n10x15cm", imagem: "placas/motos/deserto.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-ferrugem", nome: "Ferrugem\n10x15cm", imagem: "placas/motos/ferrugem.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-iron-wings", nome: "Iron Wings\n10x15cm", imagem: "placas/motos/iron-wings.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-liberdade", nome: "Liberdade\n10x15cm", imagem: "placas/motos/liberdade.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-ride-die", nome: "Ride or Die\n10x15cm", imagem: "placas/motos/ride-die.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-rock-ride1", nome: "Rock Ride 1\n10x15cm", imagem: "placas/motos/rock-ride1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-rock-ride2", nome: "Rock Ride 2\n10x15cm", imagem: "placas/motos/rock-ride2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "motos-velho", nome: "Velho Demais\n10x15cm", imagem: "placas/motos/velho.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  musica: [
    { id: "musica-musica1", nome: "Escala Pentatônica\n10x15cm", imagem: "placas/musica/escala-pentatonica.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "musica-musica2", nome: "Modos Gregos\n10x15cm", imagem: "placas/musica/modos.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "musica-musica3", nome: "Sem Música Não Dá !!!!\n10x15cm", imagem: "placas/musica/sem-musica.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "musica-musica4", nome: "Música 4\n10x15cm", imagem: "placas/musica/musica4.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica5", nome: "Música 5\n10x15cm", imagem: "placas/musica/musica5.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica6", nome: "Música 6\n10x15cm", imagem: "placas/musica/musica6.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica7", nome: "Música 7\n10x15cm", imagem: "placas/musica/musica7.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica8", nome: "Música 8\n10x15cm", imagem: "placas/musica/musica8.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica9", nome: "Música 9\n10x15cm", imagem: "placas/musica/musica9.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica10", nome: "Música 10\n10x15cm", imagem: "placas/musica/musica10.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica11", nome: "Música 11\n10x15cm", imagem: "placas/musica/musica11.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "musica-musica12", nome: "Música 12\n10x15cm", imagem: "placas/musica/musica12.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  rpg: [
    { id: "rpg-3magos", nome: "3 Magos\n10x15cm", imagem: "placas/rpg/3magos.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-abobora", nome: "Incensário Abóbora\n10x15cm", imagem: "placas/rpg/abobora.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-adaga", nome: "Senhora Adaga\n10x15cm", imagem: "placas/rpg/adaga.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-arco", nome: "Arco Elétrico\n10x15cm", imagem: "placas/rpg/arco.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-espada-gelo", nome: "Espada de Gelo\n10x15cm", imagem: "placas/rpg/espada-gelo.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-gelo", nome: "Morgana do Gelo\n10x15cm", imagem: "placas/rpg/gelo.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-machado", nome: "Machado Lança de corte\n10x15cm", imagem: "placas/rpg/machado.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-mapa", nome: "Em Busca Do Tesouro !!\n10x15cm", imagem: "placas/rpg/mapa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-nature", nome: "Cajado Nature Life\n10x15cm", imagem: "placas/rpg/nature.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "rpg-pureza", nome: "Cajado da Pureza\n10x15cm", imagem: "placas/rpg/pureza.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  street: [
    { id: "street-chao", nome: "Chão\n10x15cm", imagem: "placas/street/chao.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-hh-h", nome: "Hip Hop Ele\n10x15cm", imagem: "placas/street/hh-h.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-hh-m", nome: "Hip Hop Ela\n10x15cm", imagem: "placas/street/hh-m.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-jacketa", nome: "Jacketa\n10x15cm", imagem: "placas/street/jacketa.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-naipess", nome: "Naipes Baralho\n10x15cm", imagem: "placas/street/naipess.png", preco: "R$29,90", medida: "10x15cm" },
    { id: "street-naopedelicença", nome: "Jamais !!!!\n10x15cm", imagem: "placas/street/naopedelicença.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-paz-spray", nome: "Paz Spray\n10x15cm", imagem: "placas/street/paz-spray.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-role-sem-fim", nome: "Rolê Sem Fim\n10x15cm", imagem: "placas/street/role-sem-fim.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skate1", nome: "Coleção\n10x15cm", imagem: "placas/street/skate1.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skate2", nome: "Coleção\n10x15cm", imagem: "placas/street/skate2.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skate3", nome: "Coleção\n10x15cm", imagem: "placas/street/skate3.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skateh", nome: "Skate Boy\n10x15cm", imagem: "placas/street/skateh.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skatem", nome: "Skate Girl\n10x15cm", imagem: "placas/street/skatem.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skatista", nome: "Skatista de Respeito\n10x15cm", imagem: "placas/street/skatista.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-som", nome: "Som\n10x15cm", imagem: "placas/street/som.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-voz", nome: "Voz\n10x15cm", imagem: "placas/street/voz.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-zap-mineiro", nome: "Zap Mineiro\n10x15cm", imagem: "placas/street/zap-mineiro.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-skate-rua", nome: "Skate Rua\n10x15cm", imagem: "placas/street/skate-rua.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "street-tenis-fio", nome: "Assim é na quebrada !\n10x15cm", imagem: "placas/street/tenis-fio.png", preco: "preço aqui", medida: "10x15cm" }
  ],

  trip: [
    { id: "trip-kombi", nome: "Kombosa da Paz\n10x15cm", imagem: "placas/trip/modo-kombi.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-reggae", nome: "Regue a Vida com muito Amor !\n10x15cm", imagem: "placas/trip/reggae-a-vida.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-leoao-erva", nome: "Leão de Folhas\n10x15cm", imagem: "placas/trip/leao-erva.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-crazy", nome: "Crazy\n10x15cm", imagem: "placas/trip/crazy.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-derretendo", nome: "Sempre Assim !!!\n10x15cm", imagem: "placas/trip/raiz-ritmo.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-economico", nome: "Econômico\n10x15cm", imagem: "placas/trip/economico.png", preco: "preço aqui", medida: "10x15cm" },
    { id: "trip-meditando", nome: "Meditando\n10x15cm", imagem: "placas/trip/meditando.png", preco: "preço aqui", medida: "10x15cm" }
  ]
};

function normalizarCaminhoProduto(caminho) {
  return String(caminho || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/\\/g, "/")
    .toLowerCase();
}

function getTodosOsProdutos() {
  const todasAsCategorias = Object.values(PRODUTOS);
  return todasAsCategorias.flatMap(categoria =>
    Array.isArray(categoria) ? categoria : []
  );
}

function getProdutosDestaqueHome() {
  const todos = getTodosOsProdutos();

  return DESTAQUES_HOME
    .map(caminho => {
      const caminhoNormalizado = normalizarCaminhoProduto(caminho);

      const produto = todos.find(item =>
        normalizarCaminhoProduto(item.imagem) === caminhoNormalizado
      );

      if (!produto) return null;

      return {
        ...produto,
        medida: produto.medida || "10x15cm"
      };
    })
    .filter(Boolean);
}

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
  alert(`${produto.nome} foi adicionado ao carrinho! Obrigado por escolher a marca Heeeph`);
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

// Pool di nickname di fallback ispirati a personaggi famosi dei videogiochi,
// usato per il backfill degli account già esistenti (scripts/assign-default-nicknames.ts)
// e per assegnare automaticamente un nickname agli account creati senza (es.
// login con Google, che salta il form di registrazione e quindi il campo
// nickname).
export const VIDEO_GAME_NICKNAMES = [
  'Lara Croft', 'Kratos', 'Master Chief', 'Link', 'Zelda', 'Samus Aran',
  'Geralt di Rivia', 'Ciri', 'Yennefer', 'Triss Merigold', 'Ellie Williams',
  'Joel Miller', 'Aloy', 'Nathan Drake', 'Elena Fisher', 'Victor Sullivan',
  'Cloud Strife', 'Tifa Lockhart', 'Sephiroth', 'Aerith', 'Barret Wallace',
  'Mario', 'Luigi', 'Peach', 'Bowser', 'Sonic', 'Tails', 'Knuckles',
  'Shadow the Hedgehog', 'Solid Snake', 'Big Boss', 'Revolver Ocelot',
  'Ryu', 'Chun-Li', 'Ken Masters', 'Kirby', 'Pikachu', 'Ganondorf',
  'Bayonetta', 'Dante', 'Vergil', 'Nero', 'Ezio Auditore', 'Altair',
  'Connor Kenway', 'Arthur Morgan', 'John Marston', 'Commander Shepard',
  'Garrus Vakarian', 'Thane Krios', 'Liara T Soni', 'Wander', 'Chell',
  'GLaDOS', 'Isaac Clarke', 'Marcus Fenix', 'Dominic Santiago',
  'Gordon Freeman', 'Alyx Vance', 'Cortana', 'Master Chief John',
  'Trevor Philips', 'Niko Bellic', 'CJ Johnson', 'Tommy Vercetti',
  'Nick Valentine', 'Sub-Zero', 'Scorpion', 'Liu Kang', 'Raiden',
  'Jin Kazama', 'Heihachi', 'Nina Williams', 'Crash Bandicoot',
  'Coco Bandicoot', 'Spyro', 'Banjo', 'Kazooie', 'Conker', 'Rayman',
  'Ratchet', 'Clank', 'Jak', 'Daxter', 'Sackboy', 'Vault Boy',
  'Duke Nukem', 'Lee Everett', 'Clementine', 'Booker DeWitt',
  'Elizabeth Comstock', 'BJ Blazkowicz', 'Agent 47', 'Sam Fisher',
  'Leon Kennedy', 'Jill Valentine', 'Chris Redfield', 'Ada Wong',
  'Claire Redfield', 'Nemesis', 'Pyramid Head', 'Heather Mason',
  'Travis Touchdown', 'Bayek', 'Kassandra', 'Alexios', 'Eivor',
  'Senua', 'Corvo Attano', 'Emily Kaldwin', 'Kazuma Kiryu',
  'Goro Majima', 'Joker', 'Morgana', 'Ryuji Sakamoto', 'Johnny Silverhand',
  'Amaterasu', 'Fox McCloud', 'Captain Falcon', 'Meta Knight', 'Wario',
  'Waluigi', 'Toad', 'Daisy', 'Rosalina', 'Yoshi', 'Donkey Kong',
  'Diddy Kong', 'Ike', 'Marth', 'Pit', 'Samus Zero', 'Villager',
  'Isabelle', 'Steve', 'Sora', 'Riku', 'Kairi', 'Cloud Nine',
  'Lightning', 'Squall Leonhart', 'Noctis', 'Zidane Tribal', 'Terra Branford',
]

// 3-20 caratteri, lettere/numeri/spazi/underscore/trattino, niente spazi
// iniziali o finali — condiviso tra validazione client (form) e server (API).
export const NICKNAME_RE = /^[\p{L}0-9][\p{L}0-9 _-]{1,18}[\p{L}0-9]$/u

function shuffle(list) {
  const array = [...list]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// Genera un nickname libero interrogando la tabella User: prova prima i nomi
// del pool non ancora usati (in ordine casuale), poi ricicla i nomi del pool
// con un suffisso numerico progressivo se gli utenti superano la lista.
export async function generateAvailableNickname(prisma) {
  const taken = new Set(
    (await prisma.user.findMany({ where: { nickname: { not: null } }, select: { nickname: true } }))
      .map((u) => u.nickname.toLowerCase()),
  )

  const freeNames = shuffle(VIDEO_GAME_NICKNAMES.filter((name) => !taken.has(name.toLowerCase())))
  if (freeNames.length > 0) {
    return freeNames[0]
  }

  let suffix = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const base = VIDEO_GAME_NICKNAMES[Math.floor(Math.random() * VIDEO_GAME_NICKNAMES.length)]
    const candidate = `${base} ${suffix}`
    if (!taken.has(candidate.toLowerCase())) {
      return candidate
    }
    suffix += 1
  }
}

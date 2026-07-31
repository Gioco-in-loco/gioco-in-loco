import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const SEARCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};
const BGG_BASE_URL = 'https://boardgamegeek.com';
const DUNGEONDICE_BASE_URL = 'https://www.dungeondice.it';
const BGG_SEARCH_URL = (query) =>
  `${BGG_BASE_URL}/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(query)}`;
const DUNGEONDICE_SEARCH_URL = (query) =>
  `${DUNGEONDICE_BASE_URL}/ricerca?controller=search&s=${encodeURIComponent(query)}`;
const TITLE_STOPWORDS = new Set([
  'a', 'an', 'and', 'da', 'de', 'del', 'della', 'di', 'ed', 'edition', 'edizione', 'for', 'il', 'in', 'la', 'le', 'n', 'of', 'or', 'su', 'the', 'to', 'un', 'una'
]);
const DUNGEONDICE_GENERIC_SUFFIX_TOKENS = new Set([
  'anniversary', 'deluxe', 'eco', 'edition', 'edizione', 'essential', 'gioco', 'pack', 'pocket', 'revised', 'second', 'seconda'
]);
const DUNGEONDICE_BLOCKED_TOKENS = new Set([
  'accessori', 'bag', 'bonus', 'box', 'bundle', 'compatible', 'espansione', 'expansion', 'factories', 'factory', 'gears', 'glazed', 'grids', 'insert', 'joker', 'mini', 'mosaic', 'objective', 'objectives', 'organizer', 'overlay', 'pack', 'pavilion', 'pavillion', 'player', 'promo', 'special', 'tiles', 'token', 'trays', 'tray'
]);
const SEARCH_ALIASES = {
  'ankh': 'Ankh: Gods of Egypt',
  'bombaster': 'Bomb Busters',
  'castelli-di-borgogna': 'The Castles of Burgundy',
  'pandemic-lotr': 'The Lord of the Rings: Fate of the Fellowship'
};
const DIRECT_IMAGE_OVERRIDES = {
  'castelli-di-borgogna': {
    detailUrl: 'https://www.dungeondice.it/30755-the-castles-of-burgundy-special-edition.html',
    imageUrl: 'https://img.dungeondice.it/62185-large_default/the-castles-of-burgundy-special-edition.jpg'
  },
  'darwins-journey': {
    detailUrl: 'https://www.dungeondice.it/24799-darwin-s-journey.html',
    imageUrl: 'https://img.dungeondice.it/64504-large_default/darwin-s-journey.jpg'
  },
  'hegemony': {
    detailUrl: 'https://www.dungeondice.it/33072-hegemony-versione-estesa.html',
    imageUrl: 'https://img.dungeondice.it/71447-large_default/hegemony-versione-estesa.jpg'
  },
  'hansa-teutonica': {
    detailUrl: 'https://www.dungeondice.it/23222-hansa-teutonica-big-box-edizione-inglese.html',
    imageUrl: 'https://img.dungeondice.it/38868-large_default/hansa-teutonica-big-box-edizione-inglese.jpg'
  },
  'isola-proibita': {
    detailUrl: 'https://www.dungeondice.it/3635-l-isola-proibita.html',
    imageUrl: 'https://img.dungeondice.it/6241-large_default/l-isola-proibita.jpg'
  },
  'pandemic-base': {
    detailUrl: 'https://www.dungeondice.it/4773-pandemic-una-nuova-sfida.html',
    imageUrl: 'https://img.dungeondice.it/59503-large_default/pandemic-una-nuova-sfida.jpg'
  },
  'puerto-rico': {
    detailUrl: 'https://www.dungeondice.it/28203-puerto-rico-1897.html',
    imageUrl: 'https://img.dungeondice.it/56362-large_default/puerto-rico-1897.jpg'
  },
  'rovine-di-arnak': {
    detailUrl: 'https://www.dungeondice.it/23537-le-rovine-perdute-di-arnak.html',
    imageUrl: 'https://img.dungeondice.it/50243-large_default/le-rovine-perdute-di-arnak.jpg'
  },
  'tiranni-underdark': {
    detailUrl: 'https://www.dungeondice.it/25827-dungeons-dragons-i-tiranni-dell-underdark.html',
    imageUrl: 'https://img.dungeondice.it/52673-large_default/dungeons-dragons-i-tiranni-dell-underdark.jpg'
  }
};

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSignificantTokens(value) {
  return normalizeTitle(value)
    .split(' ')
    .filter(token => token && !TITLE_STOPWORDS.has(token));
}

function parseSearchResults(html) {
  const rows = html.matchAll(/<tr id='row_'>([\s\S]*?)<\/tr>/gi);
  const results = [];

  for (const rowMatch of rows) {
    const rowHtml = rowMatch[1];
    const linkMatch = rowHtml.match(/href="(?<path>\/boardgame\/\d+\/[^"]+)"[^>]*class='primary'[^>]*>(?<title>[\s\S]*?)<\/a>/i);
    if (!linkMatch?.groups?.path || !linkMatch?.groups?.title) {
      continue;
    }

    const detailPath = linkMatch.groups.path;
    const rawTitle = linkMatch.groups.title.replace(/<[^>]+>/g, '').trim();
    const idMatch = detailPath.match(/\/boardgame\/(\d+)\//i);
    if (!idMatch) {
      continue;
    }

    const srcsetMatch = rowHtml.match(/srcset="([^"]+)"/i);
    const srcMatch = rowHtml.match(/<img[^>]+src="([^"]+)"/i);
    const srcsetCandidates = srcsetMatch
      ? srcsetMatch[1]
          .split(',')
          .map(value => value.trim().split(/\s+/)[0])
          .filter(Boolean)
      : [];
    const imageUrl = srcsetCandidates.at(-1) || srcMatch?.[1] || null;

    results.push({
      id: idMatch[1],
      title: decodeHtmlEntities(rawTitle),
      detailUrl: `${BGG_BASE_URL}${detailPath}`,
      imageUrl
    });
  }

  return results;
}

function parseDungeonDiceSearchResults(html) {
  const articles = html.matchAll(/<article\b[\s\S]*?<\/article>/gi);
  const results = [];

  for (const articleMatch of articles) {
    const articleHtml = articleMatch[0];
    const detailMatch = articleHtml.match(/<a[^>]+class="thumbnail product-thumbnail e-list-product-img"[^>]+href="([^"]+)"/i);
    const imageMatch = articleHtml.match(/data-full-size-image-url="([^"]+)"/i);
    const titleMatch = articleHtml.match(/<h3[^>]*class="e-list-product-title"[^>]*>([^<]+)<\/h3>/i);
    const altMatch = articleHtml.match(/<img[^>]+alt="([^"]+)"/i);

    if (!detailMatch?.[1] || !imageMatch?.[1] || !(titleMatch?.[1] || altMatch?.[1])) {
      continue;
    }

    const detailUrl = decodeHtmlEntities(detailMatch[1].trim());
    const title = decodeHtmlEntities((titleMatch?.[1] || altMatch?.[1]).trim());
    const imageUrl = decodeHtmlEntities(imageMatch[1].trim());
    const idMatch = detailUrl.match(/\/(\d+)-/);

    results.push({
      id: idMatch?.[1] || title,
      title,
      detailUrl,
      imageUrl
    });
  }

  return results;
}

function pickBestMatch(gameName, matches) {
  const imageMatches = matches.filter(match => match.imageUrl);
  if (imageMatches.length === 0) {
    return null;
  }

  const normalizedGameName = normalizeTitle(gameName);
  const scoredMatches = imageMatches.map((match, index) => {
    const normalizedMatchTitle = normalizeTitle(match.title);
    let score = 0;

    if (normalizedMatchTitle === normalizedGameName) {
      score += 100;
    }
    if (normalizedMatchTitle.startsWith(normalizedGameName)) {
      score += 30;
    }
    if (normalizedMatchTitle.includes(normalizedGameName)) {
      score += 10;
    }

    score -= index;
    return { ...match, score };
  });

  scoredMatches.sort((left, right) => right.score - left.score);
  return scoredMatches[0];
}

function isLikelyDungeonDiceMatch(gameName, match) {
  const normalizedGameName = normalizeTitle(gameName);
  const normalizedMatchTitle = normalizeTitle(match.title);

  if (normalizedMatchTitle === normalizedGameName) {
    return true;
  }

  const queryTokens = getSignificantTokens(gameName);
  const matchTokens = getSignificantTokens(match.title);

  if (queryTokens.length === 0 || matchTokens.length === 0) {
    return false;
  }

  if (matchTokens.some(token => DUNGEONDICE_BLOCKED_TOKENS.has(token))) {
    return false;
  }

  if (!queryTokens.every(token => matchTokens.includes(token))) {
    return false;
  }

  const extraTokens = matchTokens.filter(token => !queryTokens.includes(token));

  if (queryTokens.length === 1) {
    return extraTokens.every(token => DUNGEONDICE_GENERIC_SUFFIX_TOKENS.has(token));
  }

  return extraTokens.every(token => DUNGEONDICE_GENERIC_SUFFIX_TOKENS.has(token));
}

function getFileExtension(url, contentType) {
  const pathname = new URL(url).pathname;
  const rawExtension = path.extname(pathname).toLowerCase();
  if (rawExtension) {
    return rawExtension;
  }

  const type = (contentType || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  return '.jpg';
}

function resolveWorkspacePath(inputPath) {
  if (!inputPath) {
    return null;
  }

  return path.isAbsolute(inputPath)
    ? inputPath
    : path.join(PROJECT_ROOT, inputPath);
}

function getLocalImageDir(imageSubdir) {
  return path.join(PUBLIC_DIR, 'images', imageSubdir);
}

function getImagePublicPath(imageSubdir, fileName) {
  return `/images/${imageSubdir}/${fileName}`;
}

function hasRealImage(imageUrl) {
  if (!imageUrl) {
    return false;
  }

  const normalizedImageUrl = imageUrl.toLowerCase();
  return !normalizedImageUrl.includes('placeholder') && !normalizedImageUrl.includes('placehold.co');
}

function parseArgs(args) {
  const config = {
    downloadMode: args.includes('--download'),
    forceMode: args.includes('--force'),
    source: 'auto',
    limit: null,
    onlyTitles: null,
    dataFile: path.join(PROJECT_ROOT, 'src', 'data', 'giochi.json'),
    imageSubdir: 'giochi'
  };

  for (const arg of args) {
    if (arg.startsWith('--source=')) {
      config.source = arg.split('=')[1];
      continue;
    }

    if (arg.startsWith('--limit=')) {
      config.limit = Number.parseInt(arg.split('=')[1], 10);
      continue;
    }

    if (arg.startsWith('--only=')) {
      config.onlyTitles = arg
        .split('=')[1]
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }

    if (arg.startsWith('--file=')) {
      config.dataFile = resolveWorkspacePath(arg.split('=')[1]);
      continue;
    }

    if (arg.startsWith('--image-dir=')) {
      config.imageSubdir = arg.split('=')[1].trim();
    }
  }

  return config;
}

function getSearchTitle(game) {
  return SEARCH_ALIASES[game.id] || game.title;
}

function getDirectImageOverride(game) {
  return DIRECT_IMAGE_OVERRIDES[game.id] || null;
}

async function downloadImage(imageUrl, gameId, imageSubdir) {
  const localImageDir = getLocalImageDir(imageSubdir);
  fs.mkdirSync(localImageDir, { recursive: true });

  const response = await fetchWithDelay(imageUrl, { headers: SEARCH_HEADERS });
  if (!response.ok) {
    throw new Error(`Image download failed with ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  const extension = getFileExtension(imageUrl, contentType);
  const fileName = `${gameId}${extension}`;
  const filePath = path.join(localImageDir, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return getImagePublicPath(imageSubdir, fileName);
}

// Fetch with retry and delay
async function fetchWithDelay(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...SEARCH_HEADERS,
          ...options.headers
        }
      });

      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        await new Promise(r => setTimeout(r, delay * 2));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

async function getBGGImageURL(gameName) {
  const searchResponse = await fetchWithDelay(BGG_SEARCH_URL(gameName));
  if (!searchResponse.ok) {
    throw new Error(`Search failed with ${searchResponse.status}`);
  }

  const searchHtml = await searchResponse.text();
  const searchResults = parseSearchResults(searchHtml);
  const bestMatch = pickBestMatch(gameName, searchResults);

  if (!bestMatch) {
    console.log(`  [WARN] No results found for "${gameName}"`);
    return null;
  }

  console.log(`  [INFO] Found: "${bestMatch.title}" (ID: ${bestMatch.id})`);
  const imageUrl = bestMatch.imageUrl;

  if (!imageUrl) {
    console.log(`  [WARN] No image found for ID ${bestMatch.id}`);
    return null;
  }

  return {
    match: bestMatch,
    imageUrl
  };
}

async function getDungeonDiceImageURL(gameName) {
  const searchResponse = await fetchWithDelay(DUNGEONDICE_SEARCH_URL(gameName));
  if (!searchResponse.ok) {
    throw new Error(`DungeonDice search failed with ${searchResponse.status}`);
  }

  const searchHtml = await searchResponse.text();
  const searchResults = parseDungeonDiceSearchResults(searchHtml);
  const acceptableResults = searchResults.filter(match => isLikelyDungeonDiceMatch(gameName, match));
  const bestMatch = pickBestMatch(gameName, acceptableResults);

  if (!bestMatch) {
    console.log(`  [WARN] No DungeonDice results found for "${gameName}"`);
    return null;
  }

  console.log(`  [INFO] Found on DungeonDice: "${bestMatch.title}" (ID: ${bestMatch.id})`);
  return {
    match: bestMatch,
    imageUrl: bestMatch.imageUrl
  };
}

async function getImageResult(gameName, source) {
  if (source === 'dungeondice') {
    return getDungeonDiceImageURL(gameName);
  }

  if (source === 'bgg') {
    return getBGGImageURL(gameName);
  }

  if (source === 'auto') {
    const primaryResult = await getDungeonDiceImageURL(gameName);
    if (primaryResult?.imageUrl) {
      return primaryResult;
    }

    return getBGGImageURL(gameName);
  }

  throw new Error(`Unsupported source: ${source}`);
}

async function updateImages() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);
  const dataFileLabel = path.relative(PROJECT_ROOT, config.dataFile).replace(/\\/g, '/');

  console.log(`[INFO] Reading ${dataFileLabel}...`);
  const giochiData = JSON.parse(fs.readFileSync(config.dataFile, 'utf-8'));

  console.log(`[INFO] Found ${giochiData.length} games to process\n`);
  console.log(`[INFO] Mode: ${config.downloadMode ? 'download-local' : 'remote-url'} | source=${config.source}${config.forceMode ? ' (force enabled)' : ''} | image-dir=${config.imageSubdir}`);

  const updates = [];
  const errors = [];
  let processedCount = 0;

  for (let i = 0; i < giochiData.length; i++) {
    const game = giochiData[i];

    if (config.onlyTitles && !config.onlyTitles.includes(game.title.toLowerCase()) && !config.onlyTitles.includes(game.id.toLowerCase())) {
      continue;
    }

    if (config.limit && processedCount >= config.limit) {
      break;
    }

    if (!config.forceMode && hasRealImage(game.image)) {
      console.log(`[SKIP] ${game.title} - already has image`);
      continue;
    }

    processedCount += 1;
    console.log(`[${i + 1}/${giochiData.length}] Processing: "${game.title}"`);

    try {
      const directOverride = getDirectImageOverride(game);
      const searchTitle = getSearchTitle(game);
      if (searchTitle !== game.title) {
        console.log(`  [INFO] Using alias: "${searchTitle}"`);
      }

      const result = directOverride
        ? {
            match: {
              id: game.id,
              title: game.title,
              detailUrl: directOverride.detailUrl
            },
            imageUrl: directOverride.imageUrl
          }
        : await getImageResult(searchTitle, config.source);

      if (directOverride) {
        console.log('  [INFO] Using direct high-resolution override');
      }

      if (result?.imageUrl) {
        const nextImage = config.downloadMode
          ? await downloadImage(result.imageUrl, game.id, config.imageSubdir)
          : result.imageUrl;

        updates.push({
          id: game.id,
          title: game.title,
          oldImage: game.image,
          newImage: nextImage,
          source: result.match.detailUrl
        });
        game.image = nextImage;
        console.log(`  [OK] Updated: ${nextImage}`);
      } else {
        errors.push({ id: game.id, title: game.title, reason: `No image found using source ${config.source}` });
        console.log(`  [FAIL] Could not find image`);
      }

      await new Promise(r => setTimeout(r, 600));

    } catch (error) {
      errors.push({ id: game.id, title: game.title, reason: error.message });
      console.log(`  [ERROR] ${error.message}`);
    }
  }

  console.log(`\n[INFO] Writing updated ${dataFileLabel}...`);
  fs.writeFileSync(config.dataFile, JSON.stringify(giochiData, null, 2), 'utf-8');

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Total games: ${giochiData.length}`);
  console.log(`Updated: ${updates.length}`);
  console.log(`Errors: ${errors.length}`);

  if (updates.length > 0) {
    console.log('\n--- Updated Games ---');
    updates.forEach(u => {
      console.log(`  ${u.title}: ${u.newImage}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n--- Failed Games ---');
    errors.forEach(e => {
      console.log(`  ${e.title} (${e.id}): ${e.reason}`);
    });
  }

  console.log('\n[INFO] Done!');
}

// Run
updateImages().catch(console.error);
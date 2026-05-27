export const MATERIAL_FILTERS = ['Brass', 'Copper', 'Kansa'];

export const synonyms = {
  bucket: ['balti', 'baldi'],
  balti: ['bucket'],
  baldi: ['bucket'],

  thal: ['thaal', 'thali', 'thaali'],
  thaal: ['thal', 'thali', 'thaali'],
  thali: ['thal', 'thaal', 'thaali'],
  thaali: ['thal', 'thaal', 'thali'],

  hammer: ['mathar'],
  hammered: ['mathar'],
  mathar: ['hammer'],

  rice: ['biryani'],
  biryani: ['rice'],

  kansa: ['bronze'],
  bronze: ['kansa'],

  katora: ['waati', 'wati', 'vaati', 'vati'],
  waati: ['katora', 'wati', 'vaati', 'vati'],
  wati: ['katora', 'waati', 'vaati', 'vati'],
  vaati: ['katora', 'waati', 'wati', 'vati'],
  vati: ['katora', 'waati', 'wati', 'vaati'],

  box: ['dabba'],
  dabba: ['box'],

  masala: ['spice'],
  spice: ['masala'],

  kalchul: ['ladle'],
  ladle: ['kalchul'],
};

export function normalize(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text) {
  return normalize(text).split(' ').filter(Boolean);
}

export function expandQuery(query) {
  const words = tokenize(query);
  const expanded = [...words];

  words.forEach((word) => {
    if (synonyms[word]) {
      expanded.push(...synonyms[word]);
    }
  });

  return [...new Set(expanded)];
}

export function levenshtein(a, b) {
  if (a === b) return 0;

  const matrix = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function tokenScore(queryToken, productToken) {
  if (queryToken === productToken) {
    return 100;
  }

  if (productToken.startsWith(queryToken)) {
    return 40;
  }

  if (productToken.includes(queryToken)) {
    return 25;
  }

  if (queryToken.length <= 2) {
    return 0;
  }

  const distance = levenshtein(queryToken, productToken);

  if (distance === 1) {
    return 18;
  }

  if (distance === 2 && queryToken.length >= 5) {
    return 10;
  }

  return 0;
}

export function prepareProductForSearch(product) {
  const searchableText = normalize(`${product.productName} ${product.material || ''}`);

  return {
    ...product,
    searchableText,
    searchableTokens: tokenize(searchableText),
  };
}

export function prepareProductsForSearch(products) {
  return products.map(prepareProductForSearch);
}

export function scoreProduct(product, queryTokens, rawQuery) {
  let score = 0;
  const productTokens = product.searchableTokens ?? tokenize(`${product.productName} ${product.material || ''}`);

  if (product.searchableText === rawQuery) {
    score += 500;
  }

  if (product.searchableText?.includes(rawQuery)) {
    score += 120;
  }

  queryTokens.forEach((queryToken) => {
    let bestTokenScore = 0;

    productTokens.forEach((productToken) => {
      const currentScore = tokenScore(queryToken, productToken);

      if (currentScore > bestTokenScore) {
        bestTokenScore = currentScore;
      }
    });

    score += bestTokenScore;
  });

  if (product.material && queryTokens.includes(normalize(product.material))) {
    score += 35;
  }

  return score;
}

export function searchProducts(products, query, activeMaterial = null) {
  const clean = normalize(query);

  if (!clean) return [];

  const queryTokens = expandQuery(clean);
  let results = products
    .map((product) => ({
      product,
      score: scoreProduct(product, queryTokens, clean),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.product);

  if (activeMaterial) {
    results = results.filter((product) => product.material === activeMaterial);
  }

  return results;
}

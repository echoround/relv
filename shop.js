(function shopBootstrap() {
  const imagePath = (id) => `assets/shop/${id}.webp`;

  const m23Specs = [
    ['Tera', '80CrV2 süsinikteras'],
    ['Teritus', 'Scandi'],
    ['Kõvadus', 'HRC 62'],
    ['Tera pikkus', '65 mm'],
    ['Kogupikkus', '165 mm'],
    ['Kaal', '78 g'],
    ['Tupp', 'Kydex'],
    ['Päritolu', 'Soome']
  ];

  const m07Specs = (finish, weight = '198 g') => [
    ['Tera', '80CrV2 süsinikteras'],
    ['Viimistlus', finish],
    ['Teritus', finish === 'Katmata' ? 'Scandi' : 'Saber'],
    ['Kõvadus', 'HRC 59'],
    ['Tera pikkus', '119 mm'],
    ['Kogupikkus', '243 mm'],
    ['Kaal', weight],
    ['Tupp', 'Komposiit']
  ];

  const m95Specs = (finish, sheath = 'Komposiit') => [
    ['Tera', '80CrV2 süsinikteras'],
    ['Viimistlus', finish],
    ['Teritus', finish === 'Katmata' ? 'Scandi' : 'Saber'],
    ['Kõvadus', 'HRC 59'],
    ['Tera pikkus', '150 mm'],
    ['Kogupikkus', '273 mm'],
    ['Kaal', sheath === 'Nahk' ? '196 g' : '198 g'],
    ['Tupp', sheath]
  ];

  const products = [
    {
      id: 3228,
      name: 'M23 Ranger Cub katmata / oranž, Kydex ümbris',
      category: 'knives',
      price: 99,
      image: imagePath(3228),
      summary: 'Kompaktne Soomes valmistatud 65 mm teraga väljanuga, millel on oranž TPE-käepide ja Kydex-tupp.',
      specs: m23Specs
    },
    {
      id: 3230,
      name: 'M23 Ranger Cub katmata / roheline, Kydex ümbris',
      category: 'knives',
      price: 99,
      image: imagePath(3230),
      summary: 'Kompaktne Soomes valmistatud 65 mm teraga väljanuga, millel on roheline TPE-käepide ja Kydex-tupp.',
      specs: m23Specs
    },
    {
      id: 3231,
      name: 'M23 Ranger Cub katmata / koiott, Kydex ümbris',
      category: 'knives',
      price: 99,
      image: imagePath(3231),
      summary: 'Kompaktne Soomes valmistatud 65 mm teraga väljanuga, millel on koiotitooni TPE-käepide ja Kydex-tupp.',
      specs: m23Specs
    },
    {
      id: 3232,
      name: 'M23 Ranger Cub katmata / must, Kydex ümbris',
      category: 'knives',
      price: 99,
      image: imagePath(3232),
      summary: 'Kompaktne Soomes valmistatud 65 mm teraga väljanuga, millel on must TPE-käepide ja Kydex-tupp.',
      specs: m23Specs
    },
    {
      id: 3233,
      name: 'M07 Ranger Puukko OD Green Cerakote / roheline',
      category: 'knives',
      price: 99,
      image: imagePath(3233),
      summary: 'Rohelise Cerakote-viimistlusega vastupidav puukko, 119 mm süsinikterasest tera ja komposiittupp.',
      specs: m07Specs('OD Green Cerakote')
    },
    {
      id: 3234,
      name: 'M07 Ranger Puukko FDE Cerakote / koiott',
      category: 'knives',
      price: 99,
      image: imagePath(3234),
      summary: 'FDE Cerakote-viimistlusega vastupidav puukko, 119 mm süsinikterasest tera ja komposiittupp.',
      specs: m07Specs('FDE Cerakote')
    },
    {
      id: 3235,
      name: 'M07 Ranger Puukko PTFE Teflon / must',
      category: 'knives',
      price: 99,
      image: imagePath(3235),
      summary: 'Musta PTFE-viimistlusega puukko, 119 mm süsinikterasest tera, TPE-käepide ja komposiittupp.',
      specs: m07Specs('PTFE', '180 g')
    },
    {
      id: 3236,
      name: 'M07 Ranger Puukko katmata / must',
      category: 'knives',
      price: 89,
      image: imagePath(3236),
      summary: 'Klassikalise katmata Scandi-teraga puukko, 119 mm süsinikterasest tera ja must TPE-käepide.',
      specs: m07Specs('Katmata', '180 g')
    },
    {
      id: 3237,
      name: 'M95 Ranger Puukko OD Green Cerakote / roheline',
      category: 'knives',
      price: 99,
      image: imagePath(3237),
      summary: 'Pikema 150 mm teraga Ranger Puukko, rohelise Cerakote-viimistluse ja komposiittupega.',
      specs: m95Specs('OD Green Cerakote')
    },
    {
      id: 3238,
      name: 'M95 Ranger Puukko FDE Cerakote / koiott',
      category: 'knives',
      price: 99,
      image: imagePath(3238),
      summary: 'Pikema 150 mm teraga Ranger Puukko, FDE Cerakote-viimistluse ja komposiittupega.',
      specs: m95Specs('FDE Cerakote')
    },
    {
      id: 3239,
      name: 'M95 Ranger Puukko PTFE Teflon / must, nahast ümbris',
      category: 'knives',
      price: 105,
      image: imagePath(3239),
      summary: 'Musta PTFE-viimistlusega 150 mm teraga Ranger Puukko, kaasas klassikaline nahast tupp.',
      specs: m95Specs('PTFE', 'Nahk')
    },
    {
      id: 3240,
      name: 'M95 Ranger Puukko katmata / must, nahast ümbris',
      category: 'knives',
      price: 99,
      image: imagePath(3240),
      summary: 'Katmata Scandi-teraga M95 Ranger Puukko, 150 mm süsinikterasest tera ja nahast tupp.',
      specs: m95Specs('Katmata', 'Nahk')
    },
    {
      id: 891,
      name: 'Suurendatud poldilukk Nord Arms',
      category: 'accessories',
      price: 30,
      image: imagePath(891),
      summary: 'Rihveldatud pinnaga titaanist suurendatud poldilukk AR-15 platvormile.',
      specs: [
        ['Sobivus', 'AR-15'],
        ['Materjal', 'Titaan'],
        ['Pind', 'Rihveldatud'],
        ['Tootja', 'Nord Arms']
      ]
    },
    {
      id: 874,
      name: 'Bipod Carbon Nord Arms, keskmine 20,5–31 cm',
      category: 'accessories',
      price: 190,
      image: imagePath(874),
      summary: 'Kerge süsinikjalgadega keskmise kõrgusega harkjalg, kümne kõrgusastme ja QAS-hoovaga.',
      specs: [
        ['Kõrgus', '20,5–31 cm'],
        ['Kõrgusastmeid', '10'],
        ['Jalgade laius', '20,5–30,5 cm'],
        ['Kaal', '440 g'],
        ['Jalgade materjal', 'Süsinik'],
        ['Kinnitus', 'QAS-hoob']
      ]
    },
    {
      id: 870,
      name: 'Alien salv',
      category: 'accessories',
      price: 90,
      image: imagePath(870),
      summary: 'Laugo Arms Alieni originaalne 17-lasuline salv, loodud stabiilseks ja kiireks etteandeks.',
      specs: [
        ['Sobivus', 'Laugo Arms Alien'],
        ['Mahutavus', '17 padrunit'],
        ['Tüüp', 'Originaalsalv'],
        ['Tootja', 'Laugo Arms']
      ]
    },
    {
      id: 860,
      name: 'Päästikumehhanism AR-9 TriggerTech Primary Straight Black',
      category: 'triggers',
      price: 340,
      image: imagePath(860),
      summary: 'Sirge päästikukeelega kaheastmeline TriggerTech Primary AR-9 platvormile.',
      specs: [
        ['Platvorm', 'AR-9'],
        ['Esimene aste', '340 g'],
        ['Teine aste', '1247 g'],
        ['Reset', '0,762 mm'],
        ['Tihvtid', 'Standard Mil-Spec'],
        ['Värv', 'Must']
      ]
    },
    {
      id: 843,
      name: 'Päästikumehhanism AR-15 TriggerTech Diamond Short Two Stage',
      category: 'triggers',
      price: 372,
      image: imagePath(843),
      summary: 'Reguleeritav drop-in kaheastmeline TriggerTech Diamond päästikumehhanism AR-15 platvormile.',
      specs: [
        ['Platvorm', 'AR-15'],
        ['Esimene aste', '340 g'],
        ['Teine aste', '680–1814 g'],
        ['Reset', '0,762 mm'],
        ['Tihvtid', 'Standard Mil-Spec'],
        ['Paigaldus', 'Drop-in']
      ]
    },
    {
      id: 815,
      name: 'Päästikumehhanism AR-15 TriggerTech Short Two Stage',
      category: 'triggers',
      price: 330,
      image: imagePath(815),
      summary: 'Reguleeritav drop-in kaheastmeline TriggerTech päästikumehhanism AR-15 platvormile.',
      specs: [
        ['Platvorm', 'AR-15'],
        ['Esimene aste', '340 g'],
        ['Teine aste', '793–1927 g'],
        ['Reset', '0,762 mm'],
        ['Tihvtid', 'Standard Mil-Spec'],
        ['Paigaldus', 'Drop-in']
      ]
    },
    {
      id: 773,
      name: 'Taskunuga Extrema Ratio MF1 Black',
      category: 'knives',
      price: 303,
      image: imagePath(773),
      summary: 'Tugev 92 mm Böhler N690 teraga must taskunuga, kogupikkusega 227 mm.',
      specs: [
        ['Tera', 'Böhler N690 teras'],
        ['Kõvadus', 'HRC 58'],
        ['Tera pikkus', '92 mm'],
        ['Tera paksus', '4 mm'],
        ['Kogupikkus', '227 mm'],
        ['Kaal', '166 g'],
        ['Viimistlus', 'MIL-C-13924']
      ]
    },
    {
      id: 769,
      name: 'Taskunuga Extrema Ratio MF0 D Black',
      category: 'knives',
      price: 290,
      image: imagePath(769),
      summary: 'Kompaktne 68 mm Böhler N690 teraga must taskunuga, kogupikkusega 181 mm.',
      specs: [
        ['Tera', 'Böhler N690 teras'],
        ['Kõvadus', 'HRC 58'],
        ['Tera pikkus', '68 mm'],
        ['Tera paksus', '4 mm'],
        ['Kogupikkus', '181 mm'],
        ['Kaal', '139 g'],
        ['Viimistlus', 'MIL-C-13924']
      ]
    },
    {
      id: 765,
      name: 'Taskunuga Extrema Ratio BD2 Lucky Black',
      category: 'knives',
      price: 182,
      image: imagePath(765),
      summary: 'Kahe teraga BD2 Lucky taskunuga, Böhler N690 terasest ja musta viimistlusega.',
      specs: [
        ['Tera', 'Böhler N690 teras'],
        ['Kõvadus', 'HRC 58'],
        ['Tera pikkus', '123 mm'],
        ['Kogupikkus', '280 mm'],
        ['Kaal', '137 g'],
        ['Viimistlus', 'MIL-C-13924']
      ]
    },
    {
      id: 761,
      name: 'Taskunuga Extrema Ratio BDØ R Black',
      category: 'knives',
      price: 87,
      image: imagePath(761),
      summary: 'Eriti kerge ja kompaktne 60 mm Böhler N690 teraga taskunuga, nailonkäepidemega.',
      specs: [
        ['Tera', 'Böhler N690 teras'],
        ['Kõvadus', 'HRC 58'],
        ['Tera pikkus', '60 mm'],
        ['Tera paksus', '2,5 mm'],
        ['Kogupikkus', '145 mm'],
        ['Kaal', '52 g'],
        ['Käepide', 'Nailon']
      ]
    },
    {
      id: 742,
      name: 'Taskunuga Extrema Ratio BFØ R CD Desert',
      category: 'knives',
      price: 85,
      image: imagePath(742),
      summary: 'Kerge desert-toonis taskunuga 55 mm Böhler N690 tera ja stonewashed-viimistlusega.',
      specs: [
        ['Tera', 'Böhler N690 teras'],
        ['Kõvadus', 'HRC 58'],
        ['Tera pikkus', '55 mm'],
        ['Tera paksus', '2,5 mm'],
        ['Kogupikkus', '140 mm'],
        ['Kaal', '53 g'],
        ['Viimistlus', 'Stonewashed']
      ]
    },
    {
      id: 666,
      name: 'Vortex Viper 6 MOA punatäppsihik + Glocki kinnitus',
      category: 'optics',
      price: 330,
      image: imagePath(666),
      summary: 'Vortex Viper 6 MOA punatäppsihik koos alumiiniumist Glocki kinnituse ja kinnituskruvidega.',
      specs: [
        ['Täpi suurus', '6 MOA'],
        ['Mudel', 'Vortex Viper VRD-6'],
        ['Kinnitus', 'Glock'],
        ['Kinnitusmaterjal', 'Alumiinium'],
        ['Komplektis', 'Sihik, kinnitus, 2 kruvi']
      ]
    },
    {
      id: 644,
      name: 'Vortex Spitfire HD Gen II 3× Prism Scope AR-BDC4',
      category: 'optics',
      price: 490,
      image: imagePath(644),
      summary: 'Kompaktne 3× suurendusega prismasihik AR-BDC4 punase niitristi ja laia reguleerimisulatusega.',
      specs: [
        ['Suurendus', '3×'],
        ['Objektiiv', '21 mm'],
        ['Niitrist', 'AR-BDC4, punane'],
        ['Vaateväli 100 m', '12,7 m'],
        ['Silma kaugus', '66 mm'],
        ['Pikkus', '76 mm'],
        ['Kaal', '263 g'],
        ['Toide', 'CR2032']
      ]
    },
    {
      id: 634,
      name: 'Vortex Pro 30 mm Cantilever optikakinnitus',
      category: 'optics',
      price: 250,
      image: imagePath(634),
      summary: 'Tugev Vortex Pro cantilever-kinnitus 30 mm optikatorule, tsentri kõrgusega 36,4 mm.',
      specs: [
        ['Torule', '30 mm'],
        ['Tsentri kõrgus', '36,4 mm'],
        ['Kaal', '200 g'],
        ['Tüüp', 'Cantilever'],
        ['Tootja', 'Vortex']
      ]
    },
    {
      id: 620,
      name: 'Vortex Precision QR Cantilever 30 mm 2″ kiirkinnitus',
      category: 'optics',
      price: 430,
      image: imagePath(620),
      summary: 'Precision QR kiirkinnitus 30 mm optikatorule, 2-tollise nihke ja 37 mm tsentrikõrgusega.',
      specs: [
        ['Torule', '30 mm'],
        ['Nihe', '2 tolli'],
        ['Tsentri kõrgus', '37 mm'],
        ['Kaal', '252 g'],
        ['Tüüp', 'Kiirkinnitus'],
        ['Tootja', 'Vortex']
      ]
    },
    {
      id: 608,
      name: 'Vortex Micro 6× optiline suurendi',
      category: 'optics',
      price: 510,
      image: imagePath(608),
      summary: 'Kompaktne 6× suurendusega Vortex Micro optiline suurendi, kaaluga 309 grammi.',
      specs: [
        ['Suurendus', '6×'],
        ['Objektiiv', '28 mm'],
        ['Vaateväli', '5,8 m / 91 m'],
        ['Nurga vaateväli', '3,7°'],
        ['Pikkus', '109 mm'],
        ['Kaal', '309 g'],
        ['Torn', 'Kaanega']
      ]
    },
    {
      id: 211,
      name: 'Vortex Spitfire HD Gen II 5× Prism Scope AR-BDC4',
      category: 'optics',
      price: 580,
      image: imagePath(211),
      summary: 'Kompaktne 5× prismasihik punase AR-BDC4 niitristi, 25 mm objektiivi ja CR2032 toitega.',
      specs: [
        ['Suurendus', '5×'],
        ['Objektiiv', '25 mm'],
        ['Niitrist', 'AR-BDC4, punane'],
        ['Vaateväli 100 m', '7,8 m'],
        ['Silma kaugus', '68,6 mm'],
        ['Pikkus', '91 mm'],
        ['Kaal', '306 g'],
        ['Toide', 'CR2032']
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'Kõik' },
    { id: 'knives', label: 'Noad' },
    { id: 'optics', label: 'Optika' },
    { id: 'triggers', label: 'Päästikud' },
    { id: 'accessories', label: 'Lisavarustus' }
  ];

  const featuredOrder = [874, 608, 3232, 666, 860, 3239, 211, 843, 773, 620, 3228, 891, 870];
  const featuredRank = new Map(featuredOrder.map((id, index) => [id, index]));
  const categoryLabel = new Map(categories.map((category) => [category.id, category.label]));
  const euro = new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' });

  const grid = document.querySelector('[data-shop-grid]');
  const categoryHost = document.querySelector('[data-shop-categories]');
  const searchInput = document.getElementById('shop-search-input');
  const searchClear = document.querySelector('.shop-search-clear');
  const sortSelect = document.getElementById('shop-sort-select');
  const resultsCount = document.querySelector('[data-shop-results-count]');
  const emptyState = document.querySelector('[data-shop-empty]');
  const resetButton = document.querySelector('[data-shop-reset]');
  const dialog = document.querySelector('[data-shop-dialog]');

  if (!grid || !categoryHost || !searchInput || !sortSelect) return;

  const urlParams = new URLSearchParams(window.location.search);
  const requestedCategory = urlParams.get('category') || 'all';
  const requestedSort = urlParams.get('sort') || 'featured';
  const validCategory = categories.some((category) => category.id === requestedCategory);
  const validSort = ['featured', 'price-asc', 'price-desc', 'name'].includes(requestedSort);

  const state = {
    query: urlParams.get('q') || '',
    category: validCategory ? requestedCategory : 'all',
    sort: validSort ? requestedSort : 'featured'
  };

  function foldText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('et-EE');
  }

  function getCategoryCount(id) {
    if (id === 'all') return products.length;
    return products.filter((product) => product.category === id).length;
  }

  function renderCategories() {
    const fragment = document.createDocumentFragment();

    categories.forEach((category) => {
      const button = document.createElement('button');
      const count = document.createElement('span');
      button.type = 'button';
      button.className = 'shop-filter-chip';
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(state.category === category.id));
      button.append(document.createTextNode(category.label));
      count.textContent = String(getCategoryCount(category.id));
      button.appendChild(count);
      button.addEventListener('click', () => {
        state.category = category.id;
        render();
      });
      fragment.appendChild(button);
    });

    categoryHost.replaceChildren(fragment);
  }

  function getVisibleProducts() {
    const query = foldText(state.query.trim());
    const filtered = products.filter((product) => {
      if (state.category !== 'all' && product.category !== state.category) return false;
      if (!query) return true;

      const searchText = foldText([
        product.name,
        product.summary,
        categoryLabel.get(product.category),
        ...product.specs.flat()
      ].join(' '));

      return searchText.includes(query);
    });

    return filtered.sort((a, b) => {
      if (state.sort === 'price-asc') return a.price - b.price || a.name.localeCompare(b.name, 'et');
      if (state.sort === 'price-desc') return b.price - a.price || a.name.localeCompare(b.name, 'et');
      if (state.sort === 'name') return a.name.localeCompare(b.name, 'et');

      const aRank = featuredRank.has(a.id) ? featuredRank.get(a.id) : featuredOrder.length + products.indexOf(a);
      const bRank = featuredRank.has(b.id) ? featuredRank.get(b.id) : featuredOrder.length + products.indexOf(b);
      return aRank - bRank;
    });
  }

  function createProductCard(product, index) {
    const card = document.createElement('article');
    card.className = 'shop-product-card';
    card.id = `product-${product.id}`;
    card.dataset.productId = String(product.id);

    const media = document.createElement('div');
    media.className = 'shop-product-media';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.width = 1000;
    image.height = 1000;
    image.decoding = 'async';
    image.loading = index < 3 ? 'eager' : 'lazy';

    const soldBadge = document.createElement('span');
    soldBadge.className = 'shop-sold-badge';
    soldBadge.textContent = 'Välja müüdud';
    media.append(image, soldBadge);

    const copy = document.createElement('div');
    copy.className = 'shop-product-copy';

    const category = document.createElement('p');
    category.className = 'shop-product-category';
    category.textContent = categoryLabel.get(product.category);

    const title = document.createElement('h3');
    title.className = 'shop-product-title';
    title.id = `product-title-${product.id}`;
    title.textContent = product.name;

    const summary = document.createElement('p');
    summary.className = 'shop-product-summary';
    summary.textContent = product.summary;

    const footer = document.createElement('div');
    footer.className = 'shop-product-footer';

    const price = document.createElement('span');
    price.className = 'shop-product-price';
    price.textContent = euro.format(product.price);

    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'shop-product-detail';
    details.textContent = 'Vaata lähemalt';
    details.setAttribute('aria-label', `Vaata toodet ${product.name}`);
    details.addEventListener('click', () => openProduct(product));

    footer.append(price, details);
    copy.append(category, title, summary, footer);
    card.setAttribute('aria-labelledby', title.id);
    card.append(media, copy);
    return card;
  }

  function updateUrl() {
    const url = new URL(window.location.href);

    if (state.query.trim()) url.searchParams.set('q', state.query.trim());
    else url.searchParams.delete('q');

    if (state.category !== 'all') url.searchParams.set('category', state.category);
    else url.searchParams.delete('category');

    if (state.sort !== 'featured') url.searchParams.set('sort', state.sort);
    else url.searchParams.delete('sort');

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function render() {
    const visible = getVisibleProducts();
    const fragment = document.createDocumentFragment();
    visible.forEach((product, index) => fragment.appendChild(createProductCard(product, index)));
    grid.replaceChildren(fragment);

    resultsCount.textContent = visible.length === 1 ? '1 toode' : `${visible.length} toodet`;
    grid.hidden = visible.length === 0;
    emptyState.hidden = visible.length !== 0;
    searchClear.hidden = !state.query;
    sortSelect.value = state.sort;

    categoryHost.querySelectorAll('[data-category]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.category === state.category));
    });

    updateUrl();
  }

  function openProduct(product) {
    if (!dialog) return;

    const image = dialog.querySelector('[data-shop-dialog-image]');
    image.src = product.image;
    image.alt = product.name;
    dialog.querySelector('[data-shop-dialog-category]').textContent = categoryLabel.get(product.category);
    dialog.querySelector('[data-shop-dialog-title]').textContent = product.name;
    dialog.querySelector('[data-shop-dialog-price]').textContent = euro.format(product.price);
    dialog.querySelector('[data-shop-dialog-summary]').textContent = product.summary;

    const specs = dialog.querySelector('[data-shop-dialog-specs]');
    const fragment = document.createDocumentFragment();
    product.specs.forEach(([label, value]) => {
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      fragment.append(term, description);
    });
    specs.replaceChildren(fragment);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function resetFilters() {
    state.query = '';
    state.category = 'all';
    state.sort = 'featured';
    searchInput.value = '';
    render();
    searchInput.focus();
  }

  function addProductStructuredData() {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          image: new URL(product.image, window.location.href).href,
          description: product.summary,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: product.price.toFixed(2),
            availability: 'https://schema.org/OutOfStock',
            url: `${window.location.origin}${window.location.pathname}#product-${product.id}`
          }
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  searchInput.value = state.query;
  sortSelect.value = state.sort;
  renderCategories();
  render();
  addProductStructuredData();

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    render();
  });

  searchClear.addEventListener('click', () => {
    state.query = '';
    searchInput.value = '';
    render();
    searchInput.focus();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
  });

  resetButton?.addEventListener('click', resetFilters);

  dialog?.querySelector('[data-shop-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}());

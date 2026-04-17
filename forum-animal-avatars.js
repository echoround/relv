const BACKGROUND_PALETTES = [
  { id: 'dawn', sky: '#2d3557', glow: '#ffb4a2', mist: '#ffd6c7' },
  { id: 'lagoon', sky: '#16324f', glow: '#5eead4', mist: '#b8fff3' },
  { id: 'violet', sky: '#33204f', glow: '#d8b4fe', mist: '#f3d8ff' },
  { id: 'mint', sky: '#1f3a36', glow: '#86efac', mist: '#d8ffe1' },
  { id: 'sunset', sky: '#432534', glow: '#fca5a5', mist: '#ffd8cf' },
  { id: 'glacier', sky: '#243b5c', glow: '#93c5fd', mist: '#d9eeff' },
  { id: 'peach', sky: '#4a2f2b', glow: '#fdba74', mist: '#ffe1bf' },
  { id: 'berry', sky: '#40224a', glow: '#f9a8d4', mist: '#ffd8ec' },
  { id: 'forest', sky: '#21362b', glow: '#bef264', mist: '#ecffc7' },
  { id: 'storm', sky: '#2c3346', glow: '#c4b5fd', mist: '#e7ddff' },
  { id: 'marine', sky: '#15384a', glow: '#67e8f9', mist: '#caf6ff' },
  { id: 'ember', sky: '#462a22', glow: '#fda4af', mist: '#ffd1d5' },
  { id: 'gold', sky: '#4a3421', glow: '#fcd34d', mist: '#ffebb2' },
  { id: 'orchid', sky: '#34214f', glow: '#f0abfc', mist: '#fad9ff' },
  { id: 'teal', sky: '#1e3f44', glow: '#99f6e4', mist: '#dbfff7' },
  { id: 'cloud', sky: '#31405d', glow: '#cbd5e1', mist: '#eef4ff' }
];

const ANIMAL_ARCHETYPES = [
  {
    id: 'fox',
    label: 'fox',
    render() {
      return `
        <path d="M31 45L47 22L56 46Z" fill="#f9d6bf"/>
        <path d="M97 45L81 22L72 46Z" fill="#f9d6bf"/>
        <path d="M37 47L49 28L55 46Z" fill="#f08a38"/>
        <path d="M91 47L79 28L73 46Z" fill="#f08a38"/>
        <path d="M28 70C28 49 44 36 64 36C84 36 100 49 100 70C100 91 84 105 64 105C44 105 28 91 28 70Z" fill="#f39a3c"/>
        <path d="M43 76C43 65 52 57 64 57C76 57 85 65 85 76C85 88 76 96 64 96C52 96 43 88 43 76Z" fill="#fff1e7"/>
        <circle cx="49" cy="66" r="4" fill="#201d28"/>
        <circle cx="79" cy="66" r="4" fill="#201d28"/>
        <path d="M61 76H67L71 84L64 90L57 84Z" fill="#2c2025"/>
        <path d="M54 87C57 90 60 92 64 92C68 92 71 90 74 87" fill="none" stroke="#d8716b" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'bear',
    label: 'bear',
    render() {
      return `
        <circle cx="42" cy="42" r="14" fill="#6f4c3d"/>
        <circle cx="86" cy="42" r="14" fill="#6f4c3d"/>
        <circle cx="42" cy="42" r="7" fill="#f0c6a9"/>
        <circle cx="86" cy="42" r="7" fill="#f0c6a9"/>
        <circle cx="64" cy="70" r="34" fill="#7f5944"/>
        <ellipse cx="64" cy="80" rx="19" ry="14" fill="#f3d3b5"/>
        <circle cx="51" cy="68" r="4" fill="#241e1f"/>
        <circle cx="77" cy="68" r="4" fill="#241e1f"/>
        <ellipse cx="64" cy="79" rx="6.5" ry="5" fill="#2f2020"/>
        <path d="M58 88C60 90 62 91 64 91C66 91 68 90 70 88" fill="none" stroke="#d68a8a" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'rabbit',
    label: 'rabbit',
    render() {
      return `
        <path d="M44 49C39 28 43 15 52 15C60 15 61 32 59 50Z" fill="#f6eee9"/>
        <path d="M84 49C89 28 85 15 76 15C68 15 67 32 69 50Z" fill="#f6eee9"/>
        <path d="M48 47C44 30 47 20 52 20C57 20 57 31 56 47Z" fill="#ffd5df"/>
        <path d="M80 47C84 30 81 20 76 20C71 20 71 31 72 47Z" fill="#ffd5df"/>
        <ellipse cx="64" cy="73" rx="31" ry="34" fill="#f6eee9"/>
        <circle cx="52" cy="69" r="4" fill="#2a2430"/>
        <circle cx="76" cy="69" r="4" fill="#2a2430"/>
        <ellipse cx="64" cy="82" rx="15" ry="12" fill="#fff7f5"/>
        <path d="M60 79L64 74L68 79" fill="#e490a5"/>
        <path d="M59 87C61 90 62 92 64 92C66 92 67 90 69 87" fill="none" stroke="#db9ab0" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'owl',
    label: 'owl',
    render() {
      return `
        <path d="M38 46L48 33L58 46Z" fill="#7f5f49"/>
        <path d="M90 46L80 33L70 46Z" fill="#7f5f49"/>
        <ellipse cx="64" cy="72" rx="32" ry="35" fill="#8b674f"/>
        <ellipse cx="64" cy="79" rx="21" ry="23" fill="#e9dcc8"/>
        <circle cx="51" cy="66" r="12" fill="#fff7ea"/>
        <circle cx="77" cy="66" r="12" fill="#fff7ea"/>
        <circle cx="51" cy="66" r="6.5" fill="#2f2a2a"/>
        <circle cx="77" cy="66" r="6.5" fill="#2f2a2a"/>
        <path d="M64 72L57 80H71Z" fill="#f0a343"/>
        <path d="M49 92L57 84L64 92L71 84L79 92" fill="none" stroke="#7f5f49" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }
  },
  {
    id: 'frog',
    label: 'frog',
    render() {
      return `
        <circle cx="46" cy="44" r="12" fill="#79d482"/>
        <circle cx="82" cy="44" r="12" fill="#79d482"/>
        <circle cx="46" cy="44" r="7" fill="#f3fff3"/>
        <circle cx="82" cy="44" r="7" fill="#f3fff3"/>
        <ellipse cx="64" cy="75" rx="34" ry="30" fill="#7fe08b"/>
        <ellipse cx="64" cy="81" rx="20" ry="14" fill="#c7f7cb"/>
        <circle cx="46" cy="44" r="3.5" fill="#1d2a22"/>
        <circle cx="82" cy="44" r="3.5" fill="#1d2a22"/>
        <path d="M52 84C57 88 61 89 64 89C67 89 71 88 76 84" fill="none" stroke="#2a6840" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="56" cy="80" rx="4" ry="3" fill="#9ee9a7"/>
        <ellipse cx="72" cy="80" rx="4" ry="3" fill="#9ee9a7"/>
      `;
    }
  },
  {
    id: 'penguin',
    label: 'penguin',
    render() {
      return `
        <ellipse cx="64" cy="74" rx="30" ry="36" fill="#202530"/>
        <ellipse cx="64" cy="78" rx="20" ry="26" fill="#f8fbff"/>
        <ellipse cx="52" cy="68" rx="4.5" ry="5" fill="#222632"/>
        <ellipse cx="76" cy="68" rx="4.5" ry="5" fill="#222632"/>
        <path d="M64 77L56 84H72Z" fill="#f0a43f"/>
        <path d="M41 70C35 68 31 70 28 77" fill="none" stroke="#202530" stroke-width="6" stroke-linecap="round"/>
        <path d="M87 70C93 68 97 70 100 77" fill="none" stroke="#202530" stroke-width="6" stroke-linecap="round"/>
        <path d="M52 100L59 94" fill="none" stroke="#f0a43f" stroke-width="5" stroke-linecap="round"/>
        <path d="M76 100L69 94" fill="none" stroke="#f0a43f" stroke-width="5" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'deer',
    label: 'deer',
    render() {
      return `
        <path d="M42 44L35 25L42 29L45 17L50 32L57 24L53 43" fill="none" stroke="#8a6a4b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M86 44L93 25L86 29L83 17L78 32L71 24L75 43" fill="none" stroke="#8a6a4b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="64" cy="73" rx="28" ry="32" fill="#a77d56"/>
        <ellipse cx="64" cy="84" rx="16" ry="14" fill="#f3dfca"/>
        <ellipse cx="52" cy="67" rx="4" ry="5" fill="#292225"/>
        <ellipse cx="76" cy="67" rx="4" ry="5" fill="#292225"/>
        <path d="M58 83H70" fill="none" stroke="#2b1f22" stroke-width="4" stroke-linecap="round"/>
        <circle cx="58" cy="83" r="2.4" fill="#2b1f22"/>
        <circle cx="70" cy="83" r="2.4" fill="#2b1f22"/>
      `;
    }
  },
  {
    id: 'raccoon',
    label: 'raccoon',
    render() {
      return `
        <circle cx="42" cy="42" r="12" fill="#6c717f"/>
        <circle cx="86" cy="42" r="12" fill="#6c717f"/>
        <ellipse cx="64" cy="72" rx="33" ry="34" fill="#808796"/>
        <path d="M39 70C44 56 55 50 64 50C73 50 84 56 89 70C81 75 72 78 64 78C56 78 47 75 39 70Z" fill="#3b4049"/>
        <ellipse cx="64" cy="82" rx="18" ry="14" fill="#e9edf6"/>
        <circle cx="51" cy="67" r="4.5" fill="#f5f9ff"/>
        <circle cx="77" cy="67" r="4.5" fill="#f5f9ff"/>
        <circle cx="51" cy="67" r="2.5" fill="#22252c"/>
        <circle cx="77" cy="67" r="2.5" fill="#22252c"/>
        <ellipse cx="64" cy="81" rx="6.5" ry="5" fill="#22252c"/>
      `;
    }
  },
  {
    id: 'cat',
    label: 'cat',
    render() {
      return `
        <path d="M35 47L46 25L57 46Z" fill="#f2b48a"/>
        <path d="M93 47L82 25L71 46Z" fill="#f2b48a"/>
        <path d="M40 44L47 31L53 45Z" fill="#ffd5e6"/>
        <path d="M88 44L81 31L75 45Z" fill="#ffd5e6"/>
        <ellipse cx="64" cy="72" rx="31" ry="33" fill="#f2b48a"/>
        <ellipse cx="64" cy="83" rx="16" ry="12" fill="#fff0eb"/>
        <ellipse cx="50" cy="69" rx="4" ry="5" fill="#261f25"/>
        <ellipse cx="78" cy="69" rx="4" ry="5" fill="#261f25"/>
        <path d="M64 77L60 82H68Z" fill="#d77086"/>
        <path d="M48 82L35 78" fill="none" stroke="#fff4ef" stroke-width="3" stroke-linecap="round"/>
        <path d="M48 87L34 87" fill="none" stroke="#fff4ef" stroke-width="3" stroke-linecap="round"/>
        <path d="M80 82L93 78" fill="none" stroke="#fff4ef" stroke-width="3" stroke-linecap="round"/>
        <path d="M80 87L94 87" fill="none" stroke="#fff4ef" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'koala',
    label: 'koala',
    render() {
      return `
        <circle cx="40" cy="50" r="16" fill="#c0c7d1"/>
        <circle cx="88" cy="50" r="16" fill="#c0c7d1"/>
        <circle cx="40" cy="50" r="8" fill="#e4e8ee"/>
        <circle cx="88" cy="50" r="8" fill="#e4e8ee"/>
        <ellipse cx="64" cy="74" rx="29" ry="33" fill="#c7ced8"/>
        <ellipse cx="64" cy="84" rx="18" ry="15" fill="#ecf0f5"/>
        <ellipse cx="52" cy="70" rx="4" ry="5" fill="#2a2d34"/>
        <ellipse cx="76" cy="70" rx="4" ry="5" fill="#2a2d34"/>
        <ellipse cx="64" cy="81" rx="8" ry="10" fill="#4a5663"/>
        <path d="M58 91C60 93 62 94 64 94C66 94 68 93 70 91" fill="none" stroke="#d4a4a6" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'pig',
    label: 'pig',
    render() {
      return `
        <path d="M36 48L46 30L55 46Z" fill="#f6a9bf"/>
        <path d="M92 48L82 30L73 46Z" fill="#f6a9bf"/>
        <ellipse cx="64" cy="73" rx="32" ry="33" fill="#f8b3c6"/>
        <ellipse cx="64" cy="82" rx="18" ry="13" fill="#f7cad7"/>
        <circle cx="51" cy="68" r="4" fill="#472934"/>
        <circle cx="77" cy="68" r="4" fill="#472934"/>
        <ellipse cx="58" cy="82" rx="3" ry="4.5" fill="#c86b86"/>
        <ellipse cx="70" cy="82" rx="3" ry="4.5" fill="#c86b86"/>
        <path d="M58 91C60 93 62 94 64 94C66 94 68 93 70 91" fill="none" stroke="#d8849c" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'tiger',
    label: 'tiger',
    render() {
      return `
        <path d="M35 47L46 25L57 46Z" fill="#f1a13e"/>
        <path d="M93 47L82 25L71 46Z" fill="#f1a13e"/>
        <path d="M40 44L47 31L53 45Z" fill="#fff3e3"/>
        <path d="M88 44L81 31L75 45Z" fill="#fff3e3"/>
        <ellipse cx="64" cy="72" rx="31" ry="33" fill="#f1a13e"/>
        <ellipse cx="64" cy="83" rx="17" ry="12" fill="#fff1e3"/>
        <ellipse cx="50" cy="69" rx="4" ry="5" fill="#2a211f"/>
        <ellipse cx="78" cy="69" rx="4" ry="5" fill="#2a211f"/>
        <path d="M64 78L60 83H68Z" fill="#2c2220"/>
        <path d="M52 52L47 63" stroke="#2a211f" stroke-width="4" stroke-linecap="round"/>
        <path d="M76 52L81 63" stroke="#2a211f" stroke-width="4" stroke-linecap="round"/>
        <path d="M64 48V60" stroke="#2a211f" stroke-width="4" stroke-linecap="round"/>
        <path d="M44 78L36 83" stroke="#2a211f" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M84 78L92 83" stroke="#2a211f" stroke-width="3.5" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'wolf',
    label: 'wolf',
    render() {
      return `
        <path d="M34 48L47 22L58 46Z" fill="#a0a9b6"/>
        <path d="M94 48L81 22L70 46Z" fill="#a0a9b6"/>
        <path d="M40 45L47 31L53 45Z" fill="#e7eef8"/>
        <path d="M88 45L81 31L75 45Z" fill="#e7eef8"/>
        <ellipse cx="64" cy="72" rx="31" ry="33" fill="#9aa5b3"/>
        <path d="M43 78C47 61 56 54 64 54C72 54 81 61 85 78C79 88 72 94 64 94C56 94 49 88 43 78Z" fill="#eef4fa"/>
        <circle cx="50" cy="68" r="4" fill="#23272e"/>
        <circle cx="78" cy="68" r="4" fill="#23272e"/>
        <path d="M64 77L60 84H68Z" fill="#27262b"/>
        <path d="M50 87C55 90 59 92 64 92C69 92 73 90 78 87" fill="none" stroke="#d2a3a7" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'seal',
    label: 'seal',
    render() {
      return `
        <ellipse cx="64" cy="74" rx="33" ry="30" fill="#b7c3cf"/>
        <ellipse cx="64" cy="82" rx="18" ry="13" fill="#ecf4fb"/>
        <circle cx="50" cy="71" r="4" fill="#242830"/>
        <circle cx="78" cy="71" r="4" fill="#242830"/>
        <ellipse cx="64" cy="80" rx="7" ry="5" fill="#39414d"/>
        <path d="M48 81L36 78" fill="none" stroke="#ecf4fb" stroke-width="3" stroke-linecap="round"/>
        <path d="M48 86L34 86" fill="none" stroke="#ecf4fb" stroke-width="3" stroke-linecap="round"/>
        <path d="M80 81L92 78" fill="none" stroke="#ecf4fb" stroke-width="3" stroke-linecap="round"/>
        <path d="M80 86L94 86" fill="none" stroke="#ecf4fb" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'hedgehog',
    label: 'hedgehog',
    render() {
      return `
        <path d="M31 70C31 46 48 34 64 34C80 34 97 46 97 70C97 70 85 48 64 48C43 48 31 70 31 70Z" fill="#6c5845"/>
        <path d="M40 44L35 32" stroke="#6c5845" stroke-width="5" stroke-linecap="round"/>
        <path d="M54 38L50 24" stroke="#6c5845" stroke-width="5" stroke-linecap="round"/>
        <path d="M74 38L78 24" stroke="#6c5845" stroke-width="5" stroke-linecap="round"/>
        <path d="M88 44L93 32" stroke="#6c5845" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="64" cy="78" rx="25" ry="24" fill="#f1dcc1"/>
        <circle cx="52" cy="74" r="4" fill="#282220"/>
        <circle cx="76" cy="74" r="4" fill="#282220"/>
        <ellipse cx="64" cy="83" rx="6.5" ry="5" fill="#392826"/>
        <path d="M58 91C60 92 62 93 64 93C66 93 68 92 70 91" fill="none" stroke="#d59893" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'alpaca',
    label: 'alpaca',
    render() {
      return `
        <path d="M42 49L44 31L54 44Z" fill="#f5efe4"/>
        <path d="M86 49L84 31L74 44Z" fill="#f5efe4"/>
        <ellipse cx="64" cy="74" rx="28" ry="32" fill="#f5efe4"/>
        <path d="M42 58C47 48 56 42 64 42C72 42 81 48 86 58" fill="none" stroke="#efe7da" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="64" cy="84" rx="16" ry="13" fill="#fff7ef"/>
        <circle cx="52" cy="70" r="4" fill="#2c2525"/>
        <circle cx="76" cy="70" r="4" fill="#2c2525"/>
        <ellipse cx="64" cy="81" rx="7" ry="8" fill="#5b453d"/>
      `;
    }
  },
  {
    id: 'duck',
    label: 'duck',
    render() {
      return `
        <circle cx="64" cy="72" r="32" fill="#f6f0a5"/>
        <circle cx="50" cy="66" r="4" fill="#232124"/>
        <circle cx="78" cy="66" r="4" fill="#232124"/>
        <path d="M64 74C72 74 78 78 82 83C76 89 70 92 64 92C58 92 52 89 46 83C50 78 56 74 64 74Z" fill="#f0a33c"/>
        <path d="M41 52L33 48" fill="none" stroke="#f6f0a5" stroke-width="7" stroke-linecap="round"/>
        <path d="M87 52L95 48" fill="none" stroke="#f6f0a5" stroke-width="7" stroke-linecap="round"/>
      `;
    }
  },
  {
    id: 'otter',
    label: 'otter',
    render() {
      return `
        <circle cx="42" cy="48" r="11" fill="#8a664f"/>
        <circle cx="86" cy="48" r="11" fill="#8a664f"/>
        <ellipse cx="64" cy="74" rx="31" ry="33" fill="#946e54"/>
        <ellipse cx="64" cy="84" rx="17" ry="13" fill="#f2dec7"/>
        <circle cx="51" cy="70" r="4" fill="#241f20"/>
        <circle cx="77" cy="70" r="4" fill="#241f20"/>
        <ellipse cx="64" cy="81" rx="7" ry="6" fill="#342724"/>
        <path d="M48 81L37 78" fill="none" stroke="#f2dec7" stroke-width="3" stroke-linecap="round"/>
        <path d="M80 81L91 78" fill="none" stroke="#f2dec7" stroke-width="3" stroke-linecap="round"/>
      `;
    }
  }
];
let avatarInstanceCounter = 0;

function hashSeed(value) {
  let hash = 0;
  const source = String(value || 'anon');

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash >>> 0;
}

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createBackgroundMarkup(palette, uniqueId) {
  return `
    <defs>
      <linearGradient id="bg-${uniqueId}" x1="18" y1="18" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.sky}" />
        <stop offset="1" stop-color="${palette.glow}" />
      </linearGradient>
      <radialGradient id="mist-${uniqueId}" cx="0.28" cy="0.24" r="0.72">
        <stop offset="0" stop-color="${palette.mist}" stop-opacity="0.78" />
        <stop offset="1" stop-color="${palette.mist}" stop-opacity="0" />
      </radialGradient>
      <clipPath id="clip-${uniqueId}">
        <circle cx="64" cy="64" r="60" />
      </clipPath>
    </defs>
    <circle cx="64" cy="64" r="60" fill="url(#bg-${uniqueId})" />
    <circle cx="42" cy="37" r="34" fill="url(#mist-${uniqueId})" />
    <path d="M6 92C23 73 43 73 60 82C78 91 92 100 122 89V124H6Z" fill="#ffffff" opacity="0.12" />
    <path d="M10 92C28 78 45 78 61 86C77 94 91 101 118 92" fill="none" stroke="#ffffff" stroke-opacity="0.26" stroke-width="4" stroke-linecap="round" opacity="0.72" />
  `;
}

function renderAnonymousAvatar(uniqueId) {
  const palette = { sky: '#3a414f', glow: '#6b7485', mist: '#cbd5e1' };
  return `
    ${createBackgroundMarkup(palette, uniqueId)}
    <g clip-path="url(#clip-${uniqueId})">
      <circle cx="64" cy="70" r="31" fill="#d5dae3" />
      <circle cx="50" cy="45" r="12" fill="#d5dae3" />
      <circle cx="78" cy="45" r="12" fill="#d5dae3" />
      <circle cx="50" cy="45" r="5.5" fill="#edf2f8" />
      <circle cx="78" cy="45" r="5.5" fill="#edf2f8" />
      <ellipse cx="64" cy="81" rx="17" ry="12" fill="#eef3f8" />
      <circle cx="51" cy="69" r="4" fill="#3a414f" />
      <circle cx="77" cy="69" r="4" fill="#3a414f" />
      <path d="M64 78L60 83H68Z" fill="#566070" />
      <path d="M57 89C59 91 61 92 64 92C67 92 69 91 71 89" fill="none" stroke="#8f97a6" stroke-width="3" stroke-linecap="round" />
    </g>
  `;
}

export function renderForumAnimalAvatarSvg(seed, options = {}) {
  const normalizedSeed = String(seed || 'anon').trim().toLowerCase();
  const anonymous = Boolean(options.anonymous) || normalizedSeed === 'anon';
  const hash = hashSeed(normalizedSeed || 'anon');
  const size = Number(options.size) > 0 ? Number(options.size) : 44;
  const label = options.label || (anonymous ? 'anon' : normalizedSeed);
  avatarInstanceCounter += 1;
  const uniqueId = `${hash.toString(36)}-${size}-${avatarInstanceCounter.toString(36)}`;

  if (anonymous) {
    return `
      <svg class="forum-animal-avatar-svg" viewBox="0 0 128 128" width="${size}" height="${size}" aria-hidden="true" focusable="false" data-animal="anon">
        ${renderAnonymousAvatar(uniqueId)}
      </svg>
    `;
  }

  const animal = ANIMAL_ARCHETYPES[hash % ANIMAL_ARCHETYPES.length];
  const palette = BACKGROUND_PALETTES[(hash >>> 3) % BACKGROUND_PALETTES.length];

  return `
    <svg class="forum-animal-avatar-svg" viewBox="0 0 128 128" width="${size}" height="${size}" aria-hidden="true" focusable="false" data-animal="${escapeAttribute(animal.id)}" data-label="${escapeAttribute(label)}">
      ${createBackgroundMarkup(palette, uniqueId)}
      <g clip-path="url(#clip-${uniqueId})">
        ${animal.render()}
      </g>
    </svg>
  `;
}

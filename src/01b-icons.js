// ============================================================
//  介面圖示：一套線條圖示（跟卡片圖騰同樣的筆觸），取代介面上的 emoji
//  ic('home') → 內嵌 SVG，顏色跟著文字走（currentColor）
// ============================================================

const IC = {
  // 分頁
  home: '<path d="M4 11 L12 4 L20 11"/><path d="M6 10 V20 H18 V10"/><path d="M10 20 V14 H14 V20"/>',
  ticket: '<path d="M3 8 V6 H21 V8 A2 2 0 0 0 21 12 A2 2 0 0 0 21 16 V18 H3 V16 A2 2 0 0 0 3 12 A2 2 0 0 0 3 8 Z"/><path d="M9 6 V18" stroke-dasharray="1.5 2"/>',
  ferris: '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="1.6"/><path d="M12 3 V17 M5 10 H19 M7 5 L17 15 M17 5 L7 15"/><path d="M8.5 21 L12 12 L15.5 21 M7 21 H17"/>',
  map: '<path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z"/><path d="M9 4 V18 M15 6 V20"/>',
  book: '<path d="M12 6 C9 4 6 4 3 5 V19 C6 18 9 18 12 20 C15 18 18 18 21 19 V5 C18 4 15 4 12 6 Z"/><path d="M12 6 V20"/>',
  // 工具列
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="1.5 1.8"/><path d="M12 9 V15 M10 10.5 H13.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3"/>',
  moon: '<path d="M19 15 A8 8 0 1 1 9 4 A6.5 6.5 0 0 0 19 15 Z"/><path d="M17 4 L17.6 5.4 L19 6 L17.6 6.6 L17 8 L16.4 6.6 L15 6 L16.4 5.4 Z" fill="currentColor" stroke="none"/>',
  candle: '<path d="M9 10 H15 V21 H9 Z"/><path d="M12 10 V8"/><path d="M12 2.5 C14 5 14 7 12 8 C10 7 10 5 12 2.5 Z"/><path d="M6 21 H18"/>',
  bell: '<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z"/><path d="M10 20.5 A2 2 0 0 0 14 20.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8 L13.6 5.2 L16.4 4.4 L16.6 7.4 L19.4 8.6 L18 11.2 L19.8 13.6 L17.2 15 L17.2 18 L14.2 17.6 L12.6 20.2 L10.6 18 L7.8 19 L7.2 16 L4.4 15 L5.8 12.4 L4.2 10 L6.8 8.6 L6.8 5.6 L9.8 6 Z"/>',
  // 區塊
  pin: '<path d="M12 21 C9 16 5.5 13 5.5 9 A6.5 6.5 0 0 1 18.5 9 C18.5 13 15 16 12 21 Z"/><circle cx="12" cy="9" r="2.5"/>',
  pushpin: '<path d="M9 3 H15 L14 9 L17 12 H7 L10 9 Z"/><path d="M12 12 V21"/>',
  weather: '<circle cx="9" cy="9" r="3.2"/><path d="M9 3 V4.2 M3 9 H4.2 M4.8 4.8 L5.6 5.6 M13.2 4.8 L12.4 5.6"/><path d="M8 19 H18 A3.5 3.5 0 0 0 17.6 12 A5 5 0 0 0 8.5 13.4 A3 3 0 0 0 8 19 Z"/>',
  heart: '<path d="M12 20 C6 15.5 3 12.5 3 8.8 C3 6 5.2 4 7.7 4 C9.6 4 11 5.1 12 6.6 C13 5.1 14.4 4 16.3 4 C18.8 4 21 6 21 8.8 C21 12.5 18 15.5 12 20 Z"/>',
  letter: '<path d="M3 6 H21 V18 H3 Z"/><path d="M3 6 L12 13 L21 6"/><path d="M12 15.2 C10.6 14.1 9.8 13.3 9.8 12.4 C9.8 11.7 10.4 11.2 11 11.2 C11.5 11.2 11.8 11.5 12 11.9 C12.2 11.5 12.5 11.2 13 11.2 C13.6 11.2 14.2 11.7 14.2 12.4 C14.2 13.3 13.4 14.1 12 15.2 Z" fill="currentColor" stroke="none"/>',
  chat: '<path d="M4 5 H20 V16 H11 L6 20 V16 H4 Z"/><path d="M8 10.5 H8.01 M12 10.5 H12.01 M16 10.5 H16.01" stroke-width="2.4"/>',
  sparkle: '<path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z"/><path d="M19 3 V6 M17.5 4.5 H20.5"/>',
  stamp: '<path d="M9 3 H15 V9 C15 10 17 10.5 19 11 V14 H5 V11 C7 10.5 9 10 9 9 Z"/><path d="M5 17 H19 M7 20 H17"/>',
  clipboard: '<path d="M7 4 H17 V21 H7 Z"/><path d="M10 3 H14 V5.5 H10 Z"/><path d="M9.5 10 L11 11.5 L14.5 8.5 M9.5 15.5 L11 17 L14.5 14"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="M14 10 L20 4 M17 4 H20 V7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7 V12 L15.5 14"/>',
  hourglass: '<path d="M6 3 H18 M6 21 H18"/><path d="M7.5 3 C7.5 8 12 9.5 12 12 C12 14.5 7.5 16 7.5 21 M16.5 3 C16.5 8 12 9.5 12 12 C12 14.5 16.5 16 16.5 21"/><path d="M9.5 19 C10.5 17.5 13.5 17.5 14.5 19"/>',
  trophy: '<path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z"/><path d="M7 6 H4 A3 3 0 0 0 7 11 M17 6 H20 A3 3 0 0 1 17 11"/><path d="M12 14 V18 M8 21 H16 M9.5 18 H14.5"/>',
  film: '<path d="M4 4 H20 V20 H4 Z"/><path d="M8 4 V20 M16 4 V20 M4 8 H8 M4 12 H8 M4 16 H8 M16 8 H20 M16 12 H20 M16 16 H20"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12 H21 M18 12 V15 M15 12 V14"/>',
  castle: '<path d="M4 21 V9 H6 V7 H8 V9 H10 V7 H14 V9 H16 V7 H18 V9 H20 V21 Z"/><path d="M10 21 V16 A2 2 0 0 1 14 16 V21"/><path d="M12 7 V3 L15 4 L12 5"/>',
  piggy: '<path d="M5 12 C5 8 8.5 6 12.5 6 C16 6 18.5 7.5 19.2 10 H21 V14 H19.2 C18.7 15.5 17.8 16.5 16.5 17.2 V20 H14 V18 H10.5 V20 H8 V17 C6 16 5 14.2 5 12 Z"/><path d="M11 6.2 L10 3.5 L13 5"/><circle cx="16" cy="10.5" r=".6" fill="currentColor"/><path d="M5 12 C3.8 12 3.2 11.2 3.2 10.4"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.2"/><path d="M4 7 V11 C4 12.2 6.2 13.2 9 13.2 S14 12.2 14 11 V7"/><ellipse cx="15" cy="14" rx="5" ry="2.2"/><path d="M10 14 V18 C10 19.2 12.2 20.2 15 20.2 S20 19.2 20 18 V14"/>',
  gacha: '<circle cx="12" cy="8.5" r="6"/><path d="M8 7 A1.5 1.5 0 0 1 10.5 5.5 M13.5 10 A1.8 1.8 0 1 0 16 11.5"/><path d="M5.5 13 H18.5 V21 H5.5 Z"/><circle cx="9.5" cy="17" r="1.6"/><path d="M14 16 H16.5 V18.5 H14 Z"/>',
  wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 3.5 V10.2 M12 13.8 V20.5 M3.5 12 H10.2 M13.8 12 H20.5 M6 6 L10.7 10.7 M13.3 13.3 L18 18 M18 6 L13.3 10.7 M10.7 13.3 L6 18"/><path d="M10.5 1.5 H13.5 L12 4 Z" fill="currentColor"/>',
  dining: '<circle cx="12" cy="12" r="5.5"/><path d="M4 3 V9 M2.5 3 V7.5 A1.5 1.5 0 0 0 5.5 7.5 V3 M4 9 V21"/><path d="M20 3 C18.5 4 18 6.5 18 9 H20 V21"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>',
  minds: '<circle cx="8.5" cy="12" r="5"/><circle cx="15.5" cy="12" r="5"/><path d="M12 9.6 C11.3 10.4 11.3 13.6 12 14.4"/><path d="M15.5 4 L16 5.5 L17.5 6 L16 6.5 L15.5 8 L15 6.5 L13.5 6 L15 5.5 Z" fill="currentColor" stroke="none"/>',
  swords: '<path d="M4 4 L14 14 M4 4 H7.5 L16 12.5 M4 4 V7.5 L12.5 16"/><path d="M20 4 L10 14 M20 4 H16.5 M20 4 V7.5"/><path d="M13 17 L17 13 M15 15 L19 19 M7 13 L11 17 M9 15 L5 19"/>',
  flask: '<path d="M9 3 H15 M10 3 V9 L4.5 18.5 A1.6 1.6 0 0 0 6 21 H18 A1.6 1.6 0 0 0 19.5 18.5 L14 9 V3"/><path d="M7 15 H17"/><circle cx="10" cy="17.5" r=".7" fill="currentColor"/><circle cx="13.5" cy="18" r=".9" fill="currentColor"/>',
  star: '<path d="M12 3.5 L14.5 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.5 9 Z"/>',
  shooting: '<path d="M15.5 3.5 L17 7 L20.5 7.4 L17.8 9.8 L18.6 13.3 L15.5 11.5 L12.4 13.3 L13.2 9.8 L10.5 7.4 L14 7 Z"/><path d="M10 12 L3 19 M12 15 L7 20 M7.5 10.5 L3.5 14.5" stroke-dasharray="1.5 2.2"/>',
  cake: '<path d="M4 13 H20 V20 H4 Z"/><path d="M4 16 C6 17.5 8 17.5 10 16 C12 17.5 14 17.5 16 16 C18 17.5 19 17 20 16"/><path d="M8 13 V9 M12 13 V9 M16 13 V9"/><path d="M8 5.5 C9 6.5 9 7.5 8 8 C7 7.5 7 6.5 8 5.5 Z M12 5.5 C13 6.5 13 7.5 12 8 C11 7.5 11 6.5 12 5.5 Z M16 5.5 C17 6.5 17 7.5 16 8 C15 7.5 15 6.5 16 5.5 Z"/>',
  rose: '<path d="M12 12 C8 12 6.5 9.5 7 6.5 C9 7.5 10 6 12 4 C14 6 15 7.5 17 6.5 C17.5 9.5 16 12 12 12 Z"/><path d="M12 12 V21 M12 17 C14 15 16.5 15 17.5 15.5 C16.5 17.5 14 18 12 17 M12 15 C10.5 13.8 8.5 13.8 7.5 14.3"/>',
  tree: '<path d="M12 3 L17 9 H14.5 L18.5 14 H15.5 L19.5 19 H4.5 L8.5 14 H5.5 L9.5 9 H7 Z"/><path d="M12 19 V21.5"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3 L11 9.7 M15.5 3 L13 9.7"/><path d="M12 12.5 L12.8 14.3 L14.7 14.5 L13.3 15.8 L13.7 17.7 L12 16.7 L10.3 17.7 L10.7 15.8 L9.3 14.5 L11.2 14.3 Z"/>',
  cloud: '<path d="M7 18 H17.5 A4 4 0 0 0 17 10 A5.5 5.5 0 0 0 6.6 11.6 A3.3 3.3 0 0 0 7 18 Z"/><path d="M12 11 V16 M10 13.5 L12 11 L14 13.5"/>',
  swap: '<path d="M4 9 A8 8 0 0 1 18.5 6.5 M18.5 3 V6.5 H15"/><path d="M20 15 A8 8 0 0 1 5.5 17.5 M5.5 21 V17.5 H9"/>',
  flag: '<path d="M5 21 V4 M5 4 C8 2.5 10 5.5 13 4 C15 3 17 3.5 19 4.5 V12 C17 11 15 10.5 13 11.5 C10 13 8 10 5 11.5"/>',
  lock: '<path d="M6 11 H18 V20 H6 Z"/><path d="M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/>',
  camera: '<path d="M3 8 H7 L9 5.5 H15 L17 8 H21 V19 H3 Z"/><circle cx="12" cy="13" r="3.8"/>',
  violin: '<path d="M14.5 3 L20 8.5 M17 3.5 L19.5 6"/><path d="M15.5 6.5 L11 11"/><path d="M11 11 C9 9.5 6.5 10 5.5 11.8 C4.5 13.4 5.5 14.6 4.5 16 C3.6 17.3 4 19 5.5 20 C7 21 8.6 20.5 9.4 19.4 C10.6 18.3 11.8 19.3 13.2 18.2 C15 16.8 14.6 14 13 13 Z"/><path d="M7.5 15.5 L10 18 M9.5 13.5 L8.5 14.5"/>',
  gift: '<path d="M4 10 H20 V20 H4 Z M3 7 H21 V10 H3 Z"/><path d="M12 7 V20"/><path d="M12 7 C10.5 4 7 3.5 7 5.5 C7 7 10 7 12 7 C14 7 17 7 17 5.5 C17 3.5 13.5 4 12 7 Z"/>',
  house: '<path d="M4 11 L12 4 L20 11 V20 H4 Z"/><path d="M12 11 C10.8 10 9.6 10.4 9.6 11.6 C9.6 12.8 11 13.8 12 14.6 C13 13.8 14.4 12.8 14.4 11.6 C14.4 10.4 13.2 10 12 11 Z"/>',
  plane: '<path d="M3 13 L10 11 L14 4 H16 L14.5 10.5 L20 9 A1.6 1.6 0 0 1 20.5 12 L5.5 16 Z"/><path d="M8 20 H17"/>',
  photo: '<path d="M4 5 H20 V19 H4 Z"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17 L9 13 L13 16 L16 13.5 L20 17"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M3 20 C3 15.8 5.7 13.5 9 13.5 C12.3 13.5 15 15.8 15 20"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 13.6 C18.6 13.4 21 15.5 21 19"/>',
  hundred: '<path d="M4 7 L6 6 V17 M10.5 6.5 A2.5 5.5 0 1 0 10.6 6.5 Z M17.5 6.5 A2.5 5.5 0 1 0 17.6 6.5 Z"/><path d="M3 20 H21"/>',
  edit: '<path d="M4 20 H8 L19 9 A2.1 2.1 0 0 0 16 6 L5 17 Z"/><path d="M14 8 L17 11"/>',
  plus: '<path d="M12 5 V19 M5 12 H19"/>',
  chevron: '<path d="M9 5 L16 12 L9 19"/>',
  download: '<path d="M12 4 V15 M7.5 10.5 L12 15 L16.5 10.5 M5 19.5 H19"/>',
  candy: '<path d="M8 12 A4 4 0 1 0 16 12 A4 4 0 1 0 8 12 Z"/><path d="M8 12 L4 9 V15 Z M16 12 L20 9 V15 Z"/><path d="M10.5 9.5 L13.5 14.5"/>',
  logout: '<path d="M10 4 H5 V20 H10"/><path d="M14 8 L18 12 L14 16 M18 12 H9"/>',
  trash: '<path d="M4 7 H20 M9 7 V4.5 H15 V7 M6.5 7 L7.5 20 H16.5 L17.5 7"/><path d="M10 11 V16 M14 11 V16"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 L20 20"/>',
  check: '<path d="M5 12.5 L10 17 L19 7.5"/>',
  // 心情天氣
  w_sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M4.9 4.9 L6.7 6.7 M17.3 17.3 L19.1 19.1 M4.9 19.1 L6.7 17.3 M17.3 6.7 L19.1 4.9"/>',
  w_partly: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5 V4 M2.5 9 H4 M4.4 4.4 L5.4 5.4 M13.6 4.4 L12.6 5.4"/><path d="M8.5 19.5 H18 A3.5 3.5 0 0 0 17.6 12.5 A5 5 0 0 0 8.6 13.8 A2.9 2.9 0 0 0 8.5 19.5 Z"/>',
  w_cloud: '<path d="M6.5 18 H17.5 A4 4 0 0 0 17.1 10 A5.6 5.6 0 0 0 6.4 11.4 A3.3 3.3 0 0 0 6.5 18 Z"/>',
  w_rain: '<path d="M6.5 14.5 H17.5 A4 4 0 0 0 17.1 6.5 A5.6 5.6 0 0 0 6.4 7.9 A3.3 3.3 0 0 0 6.5 14.5 Z"/><path d="M8 17.5 L7 20.5 M12 17.5 L11 20.5 M16 17.5 L15 20.5"/>',
  w_storm: '<path d="M6.5 13.5 H17.5 A4 4 0 0 0 17.1 5.5 A5.6 5.6 0 0 0 6.4 6.9 A3.3 3.3 0 0 0 6.5 13.5 Z"/><path d="M12.5 14 L10 18 H13 L11 22"/>',
  w_rainbow: '<path d="M3 18 A9 9 0 0 1 21 18"/><path d="M6 18 A6 6 0 0 1 18 18"/><path d="M9 18 A3 3 0 0 1 15 18"/>',
  w_sleep: '<path d="M17 15.5 A7.5 7.5 0 1 1 8.5 5 A6 6 0 0 0 17 15.5 Z"/><path d="M15 4 H19 L15 8 H19" stroke-width="1.4"/>',
  w_fire: '<path d="M12 21 C8 21 6 18.5 6 15.5 C6 12 9 10.5 9 7 C11.5 8.5 12 10.5 11.8 12.2 C13 11.4 13.6 10 13.6 8.5 C16.5 10.5 18 13 18 15.5 C18 18.5 16 21 12 21 Z"/><path d="M12 21 C10.5 21 9.7 19.8 9.7 18.6 C9.7 17 11 16.3 11.4 15 C13 16 14.3 17.2 14.3 18.6 C14.3 19.8 13.5 21 12 21 Z"/>',
};
const spiceIc = (l) => `<i data-ic="${D.SPICE[l || 1].ic}"></i>`;
// 心情：用存下來的 emoji 找對應的手繪天氣圖示
const moodCls = (emoji) => { const m = D.MOODS.find((x) => x.icon === emoji); return m ? 'mood-' + m.ic : ''; };
const moodIc = (emoji, cls = '') => { const m = D.MOODS.find((x) => x.icon === emoji); return m ? `<i data-ic="${m.ic}" class="${cls}"></i>` : emoji; };
function ic(name, cls = '') {
  const p = IC[name]; if (!p) return '';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
// 徽章框裡的圖示（遊戲卡片、頁面標題用）
function icMedal(name, cls = '') {
  return `<span class="ic-medal ${cls}"><svg viewBox="0 0 48 48" class="ic-ring" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1.2 2.4" opacity=".7"/></svg>${ic(name)}</span>`;
}

// 佔位 <i data-ic="名稱"> 自動換成 SVG（畫面一出現就換）
function hydrateIcons(root) {
  root.querySelectorAll('i[data-ic]').forEach((el) => {
    const n = el.dataset.ic;
    const html = el.hasAttribute('data-medal') ? icMedal(n, el.className) : ic(n, el.className);
    if (html) el.outerHTML = html; else el.removeAttribute('data-ic');
  });
}
new MutationObserver((ms) => {
  for (const m of ms) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.matches('i[data-ic]')) { if (n.parentNode) hydrateIcons(n.parentNode); }
    else if (n.querySelector('i[data-ic]')) hydrateIcons(n);
    if (typeof catifyEmpty === 'function' && (n.matches('.empty') || n.querySelector('.empty'))) catifyEmpty(n.matches('.empty') ? n.parentNode || n : n);
  }
}).observe(document.documentElement, { childList: true, subtree: true });

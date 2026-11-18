// ============================================================
//  兩人遊樂園 — 內容資料庫
//  想改卡片、題目、任務，都可以直接改這個檔案
//  spice：1 = 甜蜜、2 = 曖昧、3 = 火辣（兩人都打開火辣才會出現）
// ============================================================

export const RARITY = {
  N:   { name: 'N',   label: '日常',  weight: 60, color: 'var(--r-n)' },
  R:   { name: 'R',   label: '好康',  weight: 25, color: 'var(--r-r)' },
  SR:  { name: 'SR',  label: '稀有',  weight: 12, color: 'var(--r-sr)' },
  SSR: { name: 'SSR', label: '傳說',  weight: 3,  color: 'var(--r-ssr)' },
};
export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR'];

export const SPICE = {
  1: { label: '甜蜜', icon: '🍬' },
  2: { label: '曖昧', icon: '🌙' },
  3: { label: '火辣', icon: '🔥' },
};

// 在一起的日子＆兩人生日（建立空間時會預先填好，之後可以在設定裡改）
export const DEFAULT_DATES = {
  anniversary: '2021-11-23',
  herBirthday: '03-16',
  hisBirthday: '11-11',
};

// ---------- 生日系列：她送他的生日卡（對方加入時自動放進他的票夾） ----------
// used = 已經用掉幾張（生日當天用掉的）
export const BIRTHDAY_CARDS = [
  { title: '打鼻子', rarity: 'N', qty: 5, desc: '（🐰排球兔排隊中⋯⋯）' },
  { title: '吹頭髮服務', rarity: 'N', qty: 10, desc: '吹到全乾，附贈頭皮按摩' },
  { title: '做家事券', rarity: 'N', qty: 10, desc: '指定一項家事，我來做' },
  { title: '洗碗券', rarity: 'N', qty: 10, desc: '今天的碗都交給我' },
  { title: '背我走10步', rarity: 'N', qty: 1, desc: '一、二、三……要數出來喔' },
  { title: '抱我轉10圈', rarity: 'N', qty: 1, desc: '嘿嘿' },
  { title: '一日司機', rarity: 'R', qty: 10, desc: '想去哪就去哪，司機隨叫隨到' },
  { title: '換我煮一道菜', rarity: 'R', qty: 1, desc: '你要吃完 🍳' },
  { title: '挑禮物', rarity: 'R', qty: 1, used: 1, desc: '💝' },
  { title: '吃蛋糕', rarity: 'R', qty: 1, used: 1, desc: '🎂' },
  { title: '睡前加碼', rarity: 'SR', qty: 5, spice: 2, desc: '先不要睡😽' },
  { title: '角色扮演', rarity: 'SR', qty: 5, spice: 3, desc: '服裝、台詞、劇情你決定' },
  { title: '今天我主動', rarity: 'SR', qty: 2, spice: 3, desc: '（心情好時）' },
  { title: '免死金牌', rarity: 'SR', qty: 1, desc: '吵架時拿出來，我先笑' },
  { title: '你教我拉一個音', rarity: 'SR', qty: 1, desc: '一對一私人小提琴課' },
  { title: '拉生日快樂給自己', rarity: 'SSR', qty: 1, used: 1, desc: '壽星的專屬演奏會' },
  { title: '唱生日快樂給你聽', rarity: 'SSR', qty: 1, used: 1, desc: '還好唱（走音版）' },
  { title: '拍一張25歲的你和我的合照', rarity: 'SSR', qty: 1, used: 1, desc: '這張要放進相框' },
];

// 生日系列收藏卡（不能兌換，只能收藏）
export const BIRTHDAY_COLLECTIBLES = [
  { title: '25歲生日感言', desc: '🎤' },
  { title: '中獎了！', desc: '獎品是一個好寶！（已領取）' },
  { title: '以後每個生日', desc: '我都想在你身邊' },
  { title: '謝謝你', desc: '謝謝你出現在我生命中' },
];
export const BIRTHDAY_SERIES = '生日系列';
export const BIRTHDAY_SLOGAN = '有你在，家才像家';

// ---------- 扭蛋卡池（兩人都可以在 app 裡再新增） ----------
export const POOL = [
  // 日常
  { title: '早餐送到床邊', rarity: 'R', spice: 1, desc: '睡飽再起床，早餐已經在旁邊' },
  { title: '按摩15分鐘', rarity: 'N', spice: 1, desc: '肩膀、腳底、哪裡都行' },
  { title: '今天不滑手機陪你', rarity: 'R', spice: 1, desc: '一整個晚上，眼裡只有你' },
  { title: '晚餐你指定', rarity: 'N', spice: 1, desc: '想吃什麼都依你' },
  { title: '撒嬌無限一小時', rarity: 'N', spice: 1, desc: '這一小時內撒嬌不設上限' },
  { title: '電影你選', rarity: 'N', spice: 1, desc: '恐怖片也陪你看' },
  { title: '宵夜外送員', rarity: 'N', spice: 1, desc: '半夜嘴饞，我去買' },
  { title: '約會全包', rarity: 'SR', spice: 1, desc: '行程、餐廳、買單，我全包' },
  { title: '說好日', rarity: 'SSR', spice: 1, desc: '一整天，你說什麼我都說好' },
  // 曖昧
  { title: '親親20下', rarity: 'R', spice: 2, desc: '要數出來' },
  { title: '今晚你決定', rarity: 'SR', spice: 2, desc: '今晚的一切由你安排' },
  { title: '指定穿搭', rarity: 'SR', spice: 2, desc: '今天穿什麼，你說了算' },
  { title: '一起泡澡', rarity: 'SR', spice: 2, desc: '水溫、泡泡、音樂我準備' },
  { title: '慢慢來的夜晚', rarity: 'SR', spice: 2, desc: '不趕時間，慢慢來' },
  { title: '耳邊悄悄話', rarity: 'R', spice: 2, desc: '只能小聲說的話' },
  // 火辣
  { title: '一個你想試的新玩法', rarity: 'SSR', spice: 3, desc: '說出來，我們一起試' },
  { title: '全聽你的', rarity: 'SR', spice: 3, desc: '今晚我只聽你的' },
  { title: '主導權轉移', rarity: 'SR', spice: 3, desc: '今晚換你主導' },
  // 神秘盲盒（扭到時會由對方偷偷寫內容）
  { title: '神秘盲盒', rarity: 'SSR', spice: 1, mystery: true, desc: '對方偷偷寫好的驚喜，兌換時才揭曉' },
];

// 以前放在卡池、後來拿掉的預設卡（app 啟動時會自動從卡池清掉）
export const POOL_REMOVED = ['吹頭髮服務', '一日司機'];

// ---------- 節日限定卡 ----------
export const HOLIDAY_CARDS = {
  herBirthday: { title: '壽星女王券', rarity: 'SSR', desc: '今天妳是女王，所有願望一律批准 👑', series: '節日系列' },
  hisBirthday: { title: '壽星國王券', rarity: 'SSR', desc: '今天你是國王，所有願望一律批准 👑', series: '節日系列' },
  anniversary: { title: '週年紀念券', rarity: 'SSR', desc: '謝謝你又陪我走了一年 💞', series: '節日系列' },
  valentine:   { title: '情人節限定券', rarity: 'SR', desc: '今天要特別甜', series: '節日系列' },
  christmas:   { title: '聖誕交換券', rarity: 'SR', desc: '換一個擁抱和一個願望 🎄', series: '節日系列' },
  newyear:     { title: '新年第一張券', rarity: 'SR', desc: '新的一年也請多指教 🎆', series: '節日系列' },
};
export const TRAVEL_CARD = { title: '旅行出發券', rarity: 'SSR', desc: '基金存滿了！出發吧 ✈️', series: '旅行系列' };

// ---------- 每週任務（每週自動挑 3 個） ----------
export const WEEKLY_TASKS = [
  '一起散步 30 分鐘', '幫對方拍一張好看的照片', '說出對方的三個優點', '一起煮一餐',
  '寫一張小紙條藏起來', '一起看一次夕陽', '一起打掃一個角落', '睡前聊天不滑手機',
  '一起去一家沒去過的店', '幫對方按摩 10 分鐘', '一起運動一次', '牽手逛一次街',
  '一起看一部電影', '分享一首最近喜歡的歌', '主動說一次「謝謝你」', '一起整理一次照片',
  '早上給對方一個擁抱', '一起計畫下一次約會', '一起喝一杯咖啡或茶', '一起挑戰一道新菜',
];

// ---------- 對戰挑戰題庫 ----------
export const BATTLE_TASKS = [
  '連續 3 天早睡（12 點前）', '一週運動 3 次', '一週不喝含糖飲料', '先讀完一本書',
  '連續 5 天喝水 2000cc', '一週不叫外送', '先學會一首歌', '每天走 8000 步走滿 5 天',
];

// ---------- 默契問答（選擇題，答案一樣就算有默契） ----------
export const QUIZ = [
  { q: '理想的週末是？', opts: ['在家耍廢', '出門走走', '睡到自然醒', '吃大餐'] },
  { q: '我們最常吵架的原因？', opts: ['吃什麼', '誰比較懶', '回訊息太慢', '根本沒吵過'] },
  { q: '下一趟旅行最想去？', opts: ['日本', '海島', '歐洲', '國內小旅行'] },
  { q: '誰比較會撒嬌？', opts: ['我', '你', '一樣', '看心情'] },
  { q: '誰比較會先道歉？', opts: ['我', '你', '一起', '用卡片解決'] },
  { q: '最喜歡的約會？', opts: ['看電影', '吃好吃的', '在家窩著', '散步聊天'] },
  { q: '對方最可愛的時候？', opts: ['剛睡醒', '吃東西', '生氣時', '撒嬌時'] },
  { q: '我們家的家事誰做比較多？', opts: ['我', '你', '一半一半', '洗碗券說了算'] },
  { q: '如果中了一百萬？', opts: ['存起來', '去旅行', '買房基金', '吃遍美食'] },
  { q: '最想一起學的事？', opts: ['做菜', '跳舞', '樂器', '潛水'] },
  { q: '我們第一次約會吃什麼類型？', opts: ['中式', '日式', '西式', '路邊小吃'] },
  { q: '睡覺時誰比較會搶被子？', opts: ['我', '你', '都會', '各蓋各的'] },
  { q: '最喜歡的季節？', opts: ['春', '夏', '秋', '冬'] },
  { q: '對方生氣時最有效的哄法？', opts: ['抱抱', '買吃的', '講笑話', '讓他冷靜'] },
  { q: '如果養寵物？', opts: ['貓', '狗', '兔子', '先養自己'] },
  { q: '早餐派？', opts: ['中式', '西式', '超商', '不吃早餐'] },
  { q: '我們誰比較浪漫？', opts: ['我', '你', '一樣', '都不浪漫'] },
  { q: '最想重溫的回憶？', opts: ['第一次約會', '第一次旅行', '告白那天', '某個平凡的晚上'] },
  { q: '結婚典禮想要？', opts: ['小而美', '盛大派對', '海外婚禮', '只拍婚紗'] },
  { q: '對方最常說的口頭禪類型？', opts: ['好啦', '等一下', '隨便', '哈哈哈'] },
];

// ---------- 每日一問（兩人都回答才看得到對方答案） ----------
export const DAILY_QUESTIONS = [
  '今天最開心的一件事是什麼？', '最近有什麼想跟我說但還沒說的？', '你最喜歡我哪個小習慣？',
  '如果明天放假，你想怎麼過？', '你覺得我們最像的地方是？', '最近讓你覺得被愛的瞬間？',
  '你小時候的夢想是什麼？', '五年後的我們，你想像是什麼樣子？', '最想跟我一起完成的一件事？',
  '你第一次覺得「就是他了」是什麼時候？', '今天有沒有想我？想了什麼？', '最近壓力大嗎？我能幫什麼？',
  '如果可以瞬間移動，現在想去哪？', '你最喜歡我們的哪張合照？為什麼？', '我做什麼事會讓你偷偷心動？',
  '最近一次被我感動是什麼時候？', '你希望我們多做什麼事？', '最想吃我煮的哪道菜？',
  '你覺得我們的戀愛像什麼電影？', '如果用一個詞形容今天的我們？', '有沒有一首歌讓你想到我？',
  '最近最想要的禮物是什麼？', '說一件你很少跟別人說的事', '你覺得我最近有什麼改變？',
  '下一個紀念日想怎麼過？', '最喜歡跟我一起做的家事？', '我們吵架後，你最希望我怎麼做？',
  '最近有什麼新發現的興趣？', '如果今天是最後一天，你想做什麼？', '你最感謝我的一件事？',
  '用三個字形容我', '你最喜歡的約會地點？', '最想跟我去的國家？', '你覺得愛是什麼？',
];

// ---------- 真心話大冒險 ----------
export const TRUTH = {
  1: ['第一次見到我的印象是什麼？', '你最喜歡我身上哪個部位？', '有沒有偷偷吃醋過？', '最想跟我一起做的瘋狂事？',
      '最喜歡我穿什麼？', '你曾經為我做過最傻的事？', '心裡有沒有偷偷幫我們想過婚禮？', '最近一次偷看我是什麼時候？'],
  2: ['你最想被我親哪裡？', '什麼時候覺得我最性感？', '最難忘的一個吻？', '你最喜歡我怎麼抱你？',
      '有沒有做過關於我的夢？說說看', '最讓你心跳加速的一句話？'],
  3: ['說一個你一直想試但沒說出口的', '你最喜歡的一個夜晚是哪次？', '你覺得我們最有默契的時刻？', '說出一個今晚想要的'],
};
export const DARE = {
  1: ['抱對方 30 秒不准放開', '用最肉麻的語氣說「我愛你」', '幫對方按摩肩膀 3 分鐘', '模仿對方生氣的樣子',
      '對對方唱一段歌', '用三個詞誇對方', '跟對方十指緊扣 1 分鐘', '在對方臉上親 5 下'],
  2: ['在對方耳邊說一句悄悄話', '用眼神看對方 30 秒不准笑', '親對方的脖子一下', '讓對方選一個地方親',
      '跳一段撒嬌舞給對方看', '坐在對方腿上 1 分鐘'],
  3: ['讓對方幫你選今晚的穿搭', '閉上眼睛讓對方主導 1 分鐘', '說出今晚的計畫，然後照做', '抽一張曖昧卡直接用掉'],
};

// ---------- 命運轉盤（每週免費一次） ----------
export const FATE_WHEEL = [
  { label: '+5 點', type: 'points', value: 5 },
  { label: '扭蛋券', type: 'ticket', value: 1 },
  { label: '+10 點', type: 'points', value: 10 },
  { label: 'N 卡', type: 'card', value: 'N' },
  { label: '+3 點', type: 'points', value: 3 },
  { label: 'R 卡', type: 'card', value: 'R' },
  { label: '抱抱 10 秒', type: 'hug' },
  { label: 'SR 卡', type: 'card', value: 'SR' },
];

export const DEFAULT_FOOD = ['火鍋', '拉麵', '壽司', '牛排', '早午餐', '韓式炸雞', '泰式料理', '咖哩飯', '滷味', '自己煮'];

// ---------- 心情天氣 ----------
export const MOODS = [
  { icon: '☀️', label: '晴天', hint: '心情超好' },
  { icon: '🌤️', label: '晴時多雲', hint: '還不錯' },
  { icon: '☁️', label: '陰天', hint: '有點悶' },
  { icon: '🌧️', label: '下雨', hint: '需要哄哄' },
  { icon: '⛈️', label: '雷雨', hint: '小心靠近' },
  { icon: '🌈', label: '彩虹', hint: '雨過天晴' },
  { icon: '🌙', label: '想睡', hint: '想抱著睡' },
  { icon: '🔥', label: '熱情', hint: '今晚…' },
];

// ---------- 點數規則 ----------
export const POINTS = {
  gachaCost: 20,
  stamp: 2,          // 被蓋一個章
  weeklyTask: 5,
  quizMatch: 5,
  quizMiss: 1,
  daily: 2,
  goal: 5,
  trip: 5,
  stampsPerSheet: 10, // 集滿一張章卡送一張扭蛋券
};
export const CRAFT_COST = 3; // 3 張同級合成 1 張高一級

// ---------- 成就徽章 ----------
// 判斷邏輯在 app.js 的 checkAchievements()
export const ACHIEVEMENTS = [
  { id: 'first_redeem', icon: '🎟️', name: '初次兌換', desc: '第一次兌換票券' },
  { id: 'redeem_20', icon: '🏅', name: '兌換達人', desc: '累計兌換 20 張票券' },
  { id: 'first_ssr', icon: '🌟', name: '歐皇降臨', desc: '第一次扭到 SSR' },
  { id: 'gacha_10', icon: '🎰', name: '扭蛋上癮', desc: '扭蛋 10 次' },
  { id: 'craft', icon: '⚗️', name: '鍊金術師', desc: '第一次合成卡片' },
  { id: 'fund_full', icon: '💰', name: '存錢小豬', desc: '旅行基金存滿' },
  { id: 'trips_3', icon: '🗺️', name: '足跡三地', desc: '記錄 3 個旅行地點' },
  { id: 'trips_10', icon: '🌏', name: '環遊世界中', desc: '記錄 10 個旅行地點' },
  { id: 'miss_100', icon: '💗', name: '想你一百次', desc: '想你按鈕累計 100 次' },
  { id: 'miss_streak_30', icon: '🔥', name: '天天想你', desc: '連續 30 天按想你' },
  { id: 'quiz_10', icon: '🧠', name: '心有靈犀', desc: '默契問答答對 10 次' },
  { id: 'daily_30', icon: '💬', name: '無話不談', desc: '一起回答 30 個每日一問' },
  { id: 'goals_5', icon: '🎯', name: '說到做到', desc: '完成 5 個年度目標' },
  { id: 'capsule', icon: '⏳', name: '時光旅人', desc: '打開第一封時光膠囊' },
  { id: 'notes_5', icon: '💌', name: '尋寶高手', desc: '找到 5 張情話小紙條' },
  { id: 'battle_win', icon: '⚔️', name: '挑戰勝利', desc: '贏得一場對戰挑戰' },
  { id: 'stamp_sheet', icon: '📮', name: '集章完成', desc: '集滿一張章卡' },
  { id: 'wish', icon: '🌠', name: '願望成真', desc: '許願池的願望被實現' },
];

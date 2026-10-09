// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

export const MEMORY_GRID_STRINGS_EN = {
  memoryGridTitle: "MEMORY GRID",
  memoryInstructionReveal: "REVEAL TWO CARDS. FIND MATCHING FOODS.",
  memoryInstructionTurns: "FEWER TURNS IS BETTER. TAKE YOUR TIME.",
  memoryInstructionKeys: "TAP A CARD, OR USE ARROWS AND ENTER.",
  memoryTurns: "TURNS", memoryPairs: "PAIRS", memoryBest: "BEST TURNS", memoryNoBest: "NO BEST YET",
  memoryReady: "READY TO MATCH?", memoryWon: "ALL PAIRS FOUND!", memoryPaused: "GAME PAUSED",
  memoryChoose: "Choose a card.", memoryChooseSecond: "Choose a second card.",
  memoryMismatch: "Different foods. Remember them!", memoryMatch: "A matching pair!",
  memoryCard: "Card", memoryHidden: "face down", memoryMatched: "matched",
  memoryStart: "Start game", memoryPause: "Pause game", memoryResume: "Resume game", memoryRestart: "Restart game",
  memoryCredit: "Food artwork", memoryLocalBest: "Best scores stay on this device.",
  memoryLoading: "Loading food artwork…", memoryArtError: "Artwork could not load. Reload the page to try again.",
  memoryApple: "Apple", memoryBread: "Bread", memoryCheese: "Cheese", memoryStrawberry: "Strawberry",
  memoryWatermelon: "Watermelon", memoryLemon: "Lemon", memoryEggplant: "Eggplant", memoryPineapple: "Pineapple",
  memoryFish: "Fish", memoryPotato: "Potato", memoryEggs: "Eggs", memoryCherry: "Cherry",
  memoryScore: "SCORE", memoryCompletionPoints: "COMPLETION POINTS", memoryEfficiencyBonus: "MEMORY BONUS",
  memoryScoringHelp: "Finish for 1,000 points plus a bonus for fewer turns. Take your time.",
  memorySharedScores: "Top scores are shared online. Best turns stay on this device.",
} as const;

export type MemoryStringKey = keyof typeof MEMORY_GRID_STRINGS_EN;
const keys = Object.keys(MEMORY_GRID_STRINGS_EN) as MemoryStringKey[];
function locale(values: readonly string[]): Record<MemoryStringKey, string> {
  if (values.length !== keys.length) throw new Error("Incomplete Memory Grid locale");
  return Object.fromEntries(keys.map((key, index) => [key, values[index]!])) as Record<MemoryStringKey, string>;
}

export const MEMORY_GRID_TRANSLATIONS: Record<string, Record<MemoryStringKey, string>> = {
  en: MEMORY_GRID_STRINGS_EN,
  zh: locale([
    "记忆方格", "翻开两张卡片，找到相同的食物。", "回合越少越好，慢慢来。", "点按卡片，或使用方向键和回车键。",
    "回合", "配对", "最佳回合数", "暂无纪录", "准备好配对了吗？", "全部配对成功！", "游戏已暂停",
    "请选择一张卡片。", "请选择第二张卡片。", "食物不同，记住它们！", "配对成功！", "卡片", "背面朝上", "已配对",
    "开始游戏", "暂停游戏", "继续游戏", "重新开始", "食物插画", "最佳成绩保存在此设备上。",
    "正在加载食物插画…", "插画未能加载，请刷新页面重试。",
    "苹果", "面包", "奶酪", "草莓", "西瓜", "柠檬", "茄子", "菠萝", "鱼", "土豆", "鸡蛋", "樱桃",
    "得分", "完成奖励", "记忆奖励", "完成游戏可获得1,000分，回合越少奖励越高。慢慢来。", "最高分在线共享。最佳回合数保存在此设备上。",
  ]),
  es: locale([
    "CUADRÍCULA DE MEMORIA", "DESTAPA DOS CARTAS. ENCUENTRA ALIMENTOS IGUALES.", "MENOS TURNOS ES MEJOR. SIN PRISA.", "TOCA UNA CARTA O USA LAS FLECHAS Y ENTER.",
    "TURNOS", "PAREJAS", "MEJORES TURNOS", "SIN RÉCORD", "¿LISTO PARA EMPAREJAR?", "¡TODAS LAS PAREJAS!", "JUEGO EN PAUSA",
    "Elige una carta.", "Elige otra carta.", "Alimentos distintos. ¡Recuérdalos!", "¡Una pareja!", "Carta", "boca abajo", "emparejada",
    "Iniciar juego", "Pausar juego", "Continuar juego", "Reiniciar juego", "Ilustraciones de alimentos", "Los récords se guardan en este dispositivo.",
    "Cargando ilustraciones…", "No se pudieron cargar las ilustraciones. Recarga la página.",
    "Manzana", "Pan", "Queso", "Fresa", "Sandía", "Limón", "Berenjena", "Piña", "Pescado", "Papa", "Huevos", "Cereza",
    "PUNTUACIÓN", "PUNTOS POR COMPLETAR", "BONO DE MEMORIA", "Completa el tablero para ganar 1.000 puntos y un bono por menos turnos. Sin prisa.", "Las mejores puntuaciones se comparten en línea. El récord de turnos queda en este dispositivo.",
  ]),
  ru: locale([
    "КАРТОЧКИ ПАМЯТИ", "ОТКРОЙТЕ ДВЕ КАРТОЧКИ. НАЙДИТЕ ОДИНАКОВУЮ ЕДУ.", "МЕНЬШЕ ХОДОВ — ЛУЧШЕ. НЕ СПЕШИТЕ.", "НАЖМИТЕ КАРТОЧКУ ИЛИ ИСПОЛЬЗУЙТЕ СТРЕЛКИ И ENTER.",
    "ХОДЫ", "ПАРЫ", "ЛУЧШИЕ ХОДЫ", "РЕКОРДА НЕТ", "ГОТОВЫ ИСКАТЬ ПАРЫ?", "ВСЕ ПАРЫ НАЙДЕНЫ!", "ИГРА НА ПАУЗЕ",
    "Выберите карточку.", "Выберите вторую карточку.", "Разная еда. Запомните её!", "Пара найдена!", "Карточка", "рубашкой вверх", "пара найдена",
    "Начать игру", "Приостановить игру", "Продолжить игру", "Начать заново", "Рисунки еды", "Рекорды хранятся на этом устройстве.",
    "Загрузка рисунков…", "Не удалось загрузить рисунки. Обновите страницу.",
    "Яблоко", "Хлеб", "Сыр", "Клубника", "Арбуз", "Лимон", "Баклажан", "Ананас", "Рыба", "Картофель", "Яйца", "Вишня",
    "ОЧКИ", "ОЧКИ ЗА ЗАВЕРШЕНИЕ", "БОНУС ЗА ПАМЯТЬ", "Найдите все пары: 1 000 очков и бонус за меньшее число ходов. Не спешите.", "Лучшие очки видны всем онлайн. Рекорд ходов хранится на этом устройстве.",
  ]),
  uk: locale([
    "КАРТКИ ПАМ’ЯТІ", "ВІДКРИЙТЕ ДВІ КАРТКИ. ЗНАЙДІТЬ ОДНАКОВУ ЇЖУ.", "МЕНШЕ ХОДІВ — КРАЩЕ. НЕ ПОСПІШАЙТЕ.", "НАТИСНІТЬ КАРТКУ АБО ВИКОРИСТОВУЙТЕ СТРІЛКИ Й ENTER.",
    "ХОДИ", "ПАРИ", "НАЙКРАЩІ ХОДИ", "РЕКОРДУ НЕМАЄ", "ГОТОВІ ШУКАТИ ПАРИ?", "УСІ ПАРИ ЗНАЙДЕНО!", "ГРА НА ПАУЗІ",
    "Виберіть картку.", "Виберіть другу картку.", "Різна їжа. Запам’ятайте її!", "Пару знайдено!", "Картка", "сорочкою догори", "пару знайдено",
    "Почати гру", "Призупинити гру", "Продовжити гру", "Почати знову", "Малюнки їжі", "Рекорди зберігаються на цьому пристрої.",
    "Завантаження малюнків…", "Не вдалося завантажити малюнки. Оновіть сторінку.",
    "Яблуко", "Хліб", "Сир", "Полуниця", "Кавун", "Лимон", "Баклажан", "Ананас", "Риба", "Картопля", "Яйця", "Вишня",
    "ОЧКИ", "ОЧКИ ЗА ЗАВЕРШЕННЯ", "БОНУС ЗА ПАМ’ЯТЬ", "Знайдіть усі пари: 1 000 очок і бонус за меншу кількість ходів. Не поспішайте.", "Найкращі очки видно всім онлайн. Рекорд ходів зберігається на цьому пристрої.",
  ]),
  vi: locale([
    "Ô TRÍ NHỚ", "LẬT HAI THẺ. TÌM CÁC MÓN GIỐNG NHAU.", "CÀNG ÍT LƯỢT CÀNG TỐT. CỨ THONG THẢ.", "CHẠM THẺ HOẶC DÙNG PHÍM MŨI TÊN VÀ ENTER.",
    "LƯỢT", "CẶP", "SỐ LƯỢT TỐT NHẤT", "CHƯA CÓ KỶ LỤC", "SẴN SÀNG GHÉP CẶP?", "ĐÃ TÌM ĐỦ CÁC CẶP!", "ĐÃ TẠM DỪNG",
    "Chọn một thẻ.", "Chọn thẻ thứ hai.", "Hai món khác nhau. Hãy nhớ chúng!", "Đã ghép một cặp!", "Thẻ", "úp mặt", "đã ghép",
    "Bắt đầu trò chơi", "Tạm dừng trò chơi", "Tiếp tục trò chơi", "Chơi lại", "Hình ảnh thực phẩm", "Kỷ lục được lưu trên thiết bị này.",
    "Đang tải hình ảnh…", "Không tải được hình ảnh. Hãy tải lại trang.",
    "Táo", "Bánh mì", "Phô mai", "Dâu tây", "Dưa hấu", "Chanh", "Cà tím", "Dứa", "Cá", "Khoai tây", "Trứng", "Anh đào",
    "ĐIỂM", "ĐIỂM HOÀN THÀNH", "THƯỞNG TRÍ NHỚ", "Hoàn thành để nhận 1.000 điểm và thưởng khi dùng ít lượt hơn. Cứ thong thả.", "Điểm cao được chia sẻ trực tuyến. Kỷ lục số lượt được lưu trên thiết bị này.",
  ]),
  fa: locale([
    "شبکهٔ حافظه", "دو کارت را برگردانید. خوراکی‌های یکسان را پیدا کنید.", "نوبت کمتر بهتر است. عجله نکنید.", "کارت را لمس کنید یا از پیکان‌ها و اینتر استفاده کنید.",
    "نوبت‌ها", "جفت‌ها", "بهترین تعداد نوبت", "هنوز رکوردی نیست", "آمادهٔ پیدا کردن جفت‌ها هستید؟", "همهٔ جفت‌ها پیدا شدند!", "بازی متوقف است",
    "یک کارت انتخاب کنید.", "کارت دوم را انتخاب کنید.", "خوراکی‌ها متفاوت‌اند. به خاطر بسپارید!", "یک جفت پیدا شد!", "کارت", "پشت‌ورو", "جفت شده",
    "شروع بازی", "توقف بازی", "ادامهٔ بازی", "شروع دوباره", "تصاویر خوراکی", "رکوردها روی این دستگاه ذخیره می‌شوند.",
    "در حال بارگیری تصاویر…", "تصاویر بارگیری نشدند. صفحه را دوباره بارگیری کنید.",
    "سیب", "نان", "پنیر", "توت‌فرنگی", "هندوانه", "لیمو", "بادمجان", "آناناس", "ماهی", "سیب‌زمینی", "تخم‌مرغ", "گیلاس",
    "امتیاز", "امتیاز پایان بازی", "پاداش حافظه", "با یافتن همهٔ جفت‌ها ۱٬۰۰۰ امتیاز و برای نوبت‌های کمتر پاداش بگیرید. عجله نکنید.", "امتیازهای برتر آنلاین به اشتراک گذاشته می‌شوند. رکورد نوبت‌ها روی این دستگاه می‌ماند.",
  ]),
  ar: locale([
    "شبكة الذاكرة", "اقلب بطاقتين. ابحث عن الأطعمة المتطابقة.", "كلما قلّت المحاولات كان أفضل. خذ وقتك.", "المس بطاقة أو استخدم الأسهم ومفتاح الإدخال.",
    "المحاولات", "الأزواج", "أفضل عدد محاولات", "لا يوجد رقم قياسي", "جاهز للبحث عن الأزواج؟", "تم العثور على كل الأزواج!", "اللعبة متوقفة",
    "اختر بطاقة.", "اختر بطاقة ثانية.", "طعامان مختلفان. تذكّرهما!", "تم العثور على زوج!", "بطاقة", "مقلوبة", "متطابقة",
    "بدء اللعبة", "إيقاف اللعبة مؤقتًا", "متابعة اللعبة", "إعادة بدء اللعبة", "رسومات الطعام", "تُحفظ الأرقام القياسية على هذا الجهاز.",
    "جارٍ تحميل الرسومات…", "تعذّر تحميل الرسومات. أعد تحميل الصفحة.",
    "تفاح", "خبز", "جبن", "فراولة", "بطيخ", "ليمون", "باذنجان", "أناناس", "سمك", "بطاطس", "بيض", "كرز",
    "النقاط", "نقاط الإكمال", "مكافأة الذاكرة", "أكمل اللوحة لتحصل على ١٬٠٠٠ نقطة ومكافأة للمحاولات الأقل. خذ وقتك.", "تُشارك أعلى النقاط عبر الإنترنت. يبقى أفضل عدد محاولات على هذا الجهاز.",
  ]),
};

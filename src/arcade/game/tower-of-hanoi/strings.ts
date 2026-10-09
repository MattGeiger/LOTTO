// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
export const HANOI_STRINGS_EN = {
  hanoiTitle: "TOWER OF HANOI", hanoiRuleMove: "MOVE THE TOWER FROM A TO C.",
  hanoiRuleSize: "ONLY A SMALLER DISK CAN REST ON A LARGER ONE.",
  hanoiRuleKeys: "TAP TWO PEGS, OR USE ARROWS AND ENTER.",
  hanoiScoring: "Finish for 1,000 points plus a bonus for fewer moves. Take your time.",
  hanoiMoves: "MOVES", hanoiDisks: "DISKS", hanoiBest: "BEST MOVES", hanoiReady: "READY TO BUILD?", hanoiWon: "TOWER COMPLETE!",
  hanoiChoose: "Choose a peg with a disk.", hanoiSelected: "Choose a destination for disk {disk}.",
  hanoiCancelled: "Selection cancelled.", hanoiEmpty: "That peg is empty. Choose another.",
  hanoiInvalid: "A larger disk cannot go on a smaller one. Choose another peg.",
  hanoiMoved: "Disk {disk}: {from} → {to}.", hanoiUndone: "Move undone. Disk {disk}: {from} → {to}.",
  hanoiLeft: "Left peg A", hanoiMiddle: "Middle peg B", hanoiRight: "Destination peg C",
  hanoiStack: "Disks, bottom to top", hanoiEmptyStack: "Empty", hanoiUndo: "Undo", hanoiUndoHelp: "Undo counts as a move.",
  hanoiBonus: "EFFICIENCY BONUS", hanoiMinimum: "MINIMUM MOVES", hanoiShared: "Top scores are shared online. Best moves stay on this device.",
  cartoonWarningTitle: "CONTENT WARNING", cartoonWarningShort: "Contains cartoon violence",
  cartoonWarningBody: "This game contains cartoon violence, including shooting zombies and explosions. You can choose another game.",
  cartoonWarningContinue: "Continue to game", cartoonWarningBack: "Back to games",
  hanoiContinue: "Continue: {disks} disks",
} as const;
export type HanoiStringKey = keyof typeof HANOI_STRINGS_EN;
const keys = Object.keys(HANOI_STRINGS_EN) as HanoiStringKey[];
function locale(values: readonly string[]): Record<HanoiStringKey, string> {
  if (values.length !== keys.length) throw new Error("Incomplete Hanoi locale");
  return Object.fromEntries(keys.map((key, index) => [key, values[index]!])) as Record<HanoiStringKey, string>;
}
export const HANOI_TRANSLATIONS: Record<string, Record<HanoiStringKey, string>> = {
  en: HANOI_STRINGS_EN,
  zh: locale([
    "汉诺塔", "把塔从A移到C。", "只能把较小的圆盘放在较大的圆盘上。", "点按两个柱子，或使用方向键和回车键。",
    "完成可获得1,000分，移动越少奖励越高。慢慢来。", "移动次数", "圆盘", "最佳移动次数", "准备好了吗？", "塔已完成！",
    "请选择有圆盘的柱子。", "请选择圆盘{disk}的目标柱。", "已取消选择。", "这个柱子是空的，请选择另一个。", "大圆盘不能放在小圆盘上，请选择另一个柱子。",
    "圆盘{disk}：{from} → {to}。", "已撤销。圆盘{disk}：{from} → {to}。", "左侧柱A", "中间柱B", "目标柱C", "圆盘，从下到上", "空", "撤销", "撤销也计为一次移动。",
    "效率奖励", "最少移动次数", "最高分在线共享。最佳移动次数保存在此设备上。", "内容提示", "包含卡通暴力", "本游戏包含卡通暴力，包括射击僵尸和爆炸。您可以选择其他游戏。", "继续进入游戏", "返回游戏列表", "继续：{disks}个圆盘",
  ]),
  es: locale([
    "TORRE DE HANÓI", "MUEVE LA TORRE DE A A C.", "SOLO UN DISCO MENOR PUEDE IR SOBRE UNO MAYOR.", "TOCA DOS POSTES O USA FLECHAS Y ENTER.",
    "Completa para ganar 1.000 puntos y un bono por menos movimientos. Sin prisa.", "MOVIMIENTOS", "DISCOS", "MEJOR MARCA", "¿LISTO PARA CONSTRUIR?", "¡TORRE COMPLETA!",
    "Elige un poste con un disco.", "Elige el destino del disco {disk}.", "Selección cancelada.", "Ese poste está vacío. Elige otro.", "Un disco mayor no puede ir sobre uno menor. Elige otro poste.",
    "Disco {disk}: {from} → {to}.", "Movimiento deshecho. Disco {disk}: {from} → {to}.", "Poste izquierdo A", "Poste central B", "Poste de destino C", "Discos, de abajo arriba", "Vacío", "Deshacer", "Deshacer cuenta como un movimiento.",
    "BONO DE EFICIENCIA", "MÍNIMO DE MOVIMIENTOS", "Las mejores puntuaciones se comparten en línea. La marca de movimientos queda en este dispositivo.", "AVISO DE CONTENIDO", "Contiene violencia de dibujos animados", "Este juego contiene violencia de dibujos animados, incluidos disparos a zombis y explosiones. Puedes elegir otro juego.", "Continuar al juego", "Volver a los juegos", "Continuar: {disks} discos",
  ]),
  ru: locale([
    "ХАНОЙСКАЯ БАШНЯ", "ПЕРЕМЕСТИТЕ БАШНЮ С A НА C.", "МЕНЬШИЙ ДИСК МОЖНО КЛАСТЬ НА БОЛЬШИЙ.", "НАЖМИТЕ ДВА СТЕРЖНЯ ИЛИ ИСПОЛЬЗУЙТЕ СТРЕЛКИ И ENTER.",
    "Завершите: 1 000 очков и бонус за меньшее число ходов. Не спешите.", "ХОДЫ", "ДИСКИ", "ЛУЧШИЕ ХОДЫ", "ГОТОВЫ СТРОИТЬ?", "БАШНЯ ГОТОВА!",
    "Выберите стержень с диском.", "Выберите место для диска {disk}.", "Выбор отменён.", "Стержень пуст. Выберите другой.", "Больший диск нельзя класть на меньший. Выберите другой стержень.",
    "Диск {disk}: {from} → {to}.", "Ход отменён. Диск {disk}: {from} → {to}.", "Левый стержень A", "Средний стержень B", "Целевой стержень C", "Диски снизу вверх", "Пусто", "Отменить ход", "Отмена тоже считается ходом.",
    "БОНУС ЗА ТОЧНОСТЬ", "МИНИМУМ ХОДОВ", "Лучшие очки видны всем онлайн. Рекорд ходов хранится на этом устройстве.", "ПРЕДУПРЕЖДЕНИЕ", "Содержит мультяшное насилие", "В игре есть мультяшное насилие: стрельба по зомби и взрывы. Можно выбрать другую игру.", "Перейти к игре", "Вернуться к играм", "Продолжить · Дисков: {disks}",
  ]),
  uk: locale([
    "ХАНОЙСЬКА ВЕЖА", "ПЕРЕМІСТІТЬ ВЕЖУ З A НА C.", "МЕНШИЙ ДИСК МОЖНА КЛАСТИ НА БІЛЬШИЙ.", "НАТИСНІТЬ ДВА СТРИЖНІ АБО ВИКОРИСТОВУЙТЕ СТРІЛКИ Й ENTER.",
    "Завершіть: 1 000 очок і бонус за меншу кількість ходів. Не поспішайте.", "ХОДИ", "ДИСКИ", "НАЙКРАЩІ ХОДИ", "ГОТОВІ БУДУВАТИ?", "ВЕЖУ ЗАВЕРШЕНО!",
    "Виберіть стрижень із диском.", "Виберіть місце для диска {disk}.", "Вибір скасовано.", "Стрижень порожній. Виберіть інший.", "Більший диск не можна класти на менший. Виберіть інший стрижень.",
    "Диск {disk}: {from} → {to}.", "Хід скасовано. Диск {disk}: {from} → {to}.", "Лівий стрижень A", "Середній стрижень B", "Цільовий стрижень C", "Диски знизу вгору", "Порожньо", "Скасувати хід", "Скасування теж рахується ходом.",
    "БОНУС ЗА ТОЧНІСТЬ", "МІНІМУМ ХОДІВ", "Найкращі очки доступні онлайн. Рекорд ходів зберігається на цьому пристрої.", "ПОПЕРЕДЖЕННЯ", "Містить мультяшне насильство", "У грі є мультяшне насильство: стрілянина по зомбі та вибухи. Можна вибрати іншу гру.", "Перейти до гри", "Повернутися до ігор", "Продовжити · Дисків: {disks}",
  ]),
  vi: locale([
    "THÁP HÀ NỘI", "CHUYỂN THÁP TỪ A SANG C.", "CHỈ ĐẶT ĐĨA NHỎ HƠN LÊN ĐĨA LỚN HƠN.", "CHẠM HAI CỌC HOẶC DÙNG PHÍM MŨI TÊN VÀ ENTER.",
    "Hoàn thành để nhận 1.000 điểm và thưởng khi dùng ít lượt hơn. Cứ thong thả.", "LƯỢT ĐI", "ĐĨA", "ÍT LƯỢT NHẤT", "SẴN SÀNG XẾP THÁP?", "THÁP HOÀN THÀNH!",
    "Chọn cọc có đĩa.", "Chọn cọc đích cho đĩa {disk}.", "Đã hủy lựa chọn.", "Cọc này trống. Hãy chọn cọc khác.", "Không thể đặt đĩa lớn lên đĩa nhỏ. Hãy chọn cọc khác.",
    "Đĩa {disk}: {from} → {to}.", "Đã hoàn tác. Đĩa {disk}: {from} → {to}.", "Cọc trái A", "Cọc giữa B", "Cọc đích C", "Đĩa từ dưới lên trên", "Trống", "Hoàn tác", "Hoàn tác cũng tính là một lượt đi.",
    "THƯỞNG HIỆU QUẢ", "SỐ LƯỢT TỐI THIỂU", "Điểm cao được chia sẻ trực tuyến. Kỷ lục lượt đi được lưu trên thiết bị này.", "LƯU Ý NỘI DUNG", "Có bạo lực hoạt hình", "Trò chơi có bạo lực hoạt hình, gồm bắn thây ma và các vụ nổ. Bạn có thể chọn trò chơi khác.", "Tiếp tục vào trò chơi", "Quay lại danh sách trò chơi", "Tiếp tục: {disks} đĩa",
  ]),
  fa: locale([
    "برج هانوی", "برج را از A به C منتقل کنید.", "فقط دیسک کوچک‌تر را روی دیسک بزرگ‌تر بگذارید.", "دو میله را لمس کنید یا از پیکان‌ها و اینتر استفاده کنید.",
    "با تکمیل برج ۱٬۰۰۰ امتیاز و برای حرکت‌های کمتر پاداش بگیرید. عجله نکنید.", "حرکت‌ها", "دیسک‌ها", "بهترین حرکت‌ها", "آمادهٔ ساختن هستید؟", "برج کامل شد!",
    "میله‌ای را انتخاب کنید که دیسک دارد.", "مقصد دیسک {disk} را انتخاب کنید.", "انتخاب لغو شد.", "این میله خالی است. میلهٔ دیگری انتخاب کنید.", "دیسک بزرگ‌تر روی دیسک کوچک‌تر قرار نمی‌گیرد. میلهٔ دیگری انتخاب کنید.",
    "دیسک {disk}: {from} → {to}.", "حرکت برگردانده شد. دیسک {disk}: {from} → {to}.", "میلهٔ چپ A", "میلهٔ میانی B", "میلهٔ مقصد C", "دیسک‌ها از پایین به بالا", "خالی", "برگرداندن", "برگرداندن هم یک حرکت حساب می‌شود.",
    "پاداش کارایی", "کمترین حرکت‌ها", "امتیازهای برتر آنلاین به اشتراک گذاشته می‌شوند. رکورد حرکت‌ها روی این دستگاه می‌ماند.", "هشدار محتوا", "دارای خشونت کارتونی", "این بازی خشونت کارتونی دارد، از جمله تیراندازی به زامبی‌ها و انفجار. می‌توانید بازی دیگری انتخاب کنید.", "ادامه به بازی", "بازگشت به بازی‌ها", "ادامه: {disks} دیسک",
  ]),
  ar: locale([
    "برج هانوي", "انقل البرج من A إلى C.", "ضع القرص الأصغر فقط فوق القرص الأكبر.", "المس وتدين أو استخدم الأسهم ومفتاح الإدخال.",
    "أكمل البرج لتحصل على ١٬٠٠٠ نقطة ومكافأة للحركات الأقل. خذ وقتك.", "الحركات", "الأقراص", "أفضل عدد حركات", "جاهز للبناء؟", "اكتمل البرج!",
    "اختر وتدًا عليه قرص.", "اختر وجهة القرص {disk}.", "أُلغي الاختيار.", "هذا الوتد فارغ. اختر غيره.", "لا يمكن وضع قرص أكبر فوق قرص أصغر. اختر وتدًا آخر.",
    "القرص {disk}: {from} → {to}.", "تم التراجع. القرص {disk}: {from} → {to}.", "الوتد الأيسر A", "الوتد الأوسط B", "وتد الوجهة C", "الأقراص من الأسفل للأعلى", "فارغ", "تراجع", "التراجع يُحسب حركة أيضًا.",
    "مكافأة الكفاءة", "أقل عدد حركات", "تُشارك أعلى النقاط عبر الإنترنت. يبقى أفضل عدد حركات على هذا الجهاز.", "تنبيه بشأن المحتوى", "يتضمن عنفًا كرتونيًا", "تتضمن هذه اللعبة عنفًا كرتونيًا، مثل إطلاق النار على الزومبي والانفجارات. يمكنك اختيار لعبة أخرى.", "المتابعة إلى اللعبة", "العودة إلى الألعاب", "المتابعة: {disks} أقراص",
  ]),
};

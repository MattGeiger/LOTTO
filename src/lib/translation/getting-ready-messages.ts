// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Pre-localized "getting your language ready" messages for the non-core catalog
// languages. Hardcoded (not AI-translated) so the waiting screen renders
// instantly in the visitor's chosen language while its translation pack is still
// being prepared. Keyed by BCP-47 code. English is the fallback.

const GETTING_READY_FALLBACK = "Please wait — we're getting your language ready.";

const GETTING_READY_MESSAGES: Record<string, string> = {
  sq: "Ju lutemi prisni — po e përgatisim gjuhën tuaj.",
  am: "እባክዎ ይጠብቁ — ቋንቋዎን እያዘጋጀን ነው።",
  hy: "Խնդրում ենք սպասել — պատրաստում ենք ձեր լեզուն։",
  bn: "অনুগ্রহ করে অপেক্ষা করুন — আমরা আপনার ভাষা প্রস্তুত করছি।",
  bs: "Molimo pričekajte — pripremamo vaš jezik.",
  bg: "Моля, изчакайте — подготвяме вашия език.",
  my: "ကျေးဇူးပြု၍ စောင့်ပါ — သင့်ဘာသာစကားကို ပြင်ဆင်နေပါသည်။",
  ca: "Espereu, si us plau — estem preparant la vostra llengua.",
  hr: "Molimo pričekajte — pripremamo vaš jezik.",
  cs: "Počkejte prosím — připravujeme váš jazyk.",
  da: "Vent venligst — vi gør dit sprog klar.",
  nl: "Even geduld — we maken je taal gereed.",
  et: "Palun oodake — valmistame teie keelt ette.",
  fi: "Odota hetki — valmistelemme kieltäsi.",
  fr: "Veuillez patienter — nous préparons votre langue.",
  ka: "გთხოვთ, დაელოდოთ — ვამზადებთ თქვენს ენას.",
  de: "Bitte warten — wir bereiten Ihre Sprache vor.",
  el: "Παρακαλώ περιμένετε — ετοιμάζουμε τη γλώσσα σας.",
  gu: "કૃપા કરીને રાહ જુઓ — અમે તમારી ભાષા તૈયાર કરી રહ્યા છીએ.",
  hi: "कृपया प्रतीक्षा करें — हम आपकी भाषा तैयार कर रहे हैं।",
  hu: "Kérjük, várjon — előkészítjük az Ön nyelvét.",
  is: "Vinsamlegast bíðið — við erum að undirbúa tungumálið þitt.",
  id: "Mohon tunggu — kami sedang menyiapkan bahasa Anda.",
  it: "Attendere prego — stiamo preparando la tua lingua.",
  ja: "お待ちください — あなたの言語を準備しています。",
  kn: "ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ — ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತಿದ್ದೇವೆ.",
  kk: "Күте тұрыңыз — тіліңізді дайындап жатырмыз.",
  ko: "잠시만 기다려 주세요 — 언어를 준비하고 있습니다.",
  lv: "Lūdzu, uzgaidiet — mēs sagatavojam jūsu valodu.",
  lt: "Palaukite — ruošiame jūsų kalbą.",
  mk: "Ве молиме почекајте — го подготвуваме вашиот јазик.",
  ms: "Sila tunggu — kami sedang menyediakan bahasa anda.",
  ml: "ദയവായി കാത്തിരിക്കുക — നിങ്ങളുടെ ഭാഷ തയ്യാറാക്കുന്നു.",
  mr: "कृपया प्रतीक्षा करा — आम्ही तुमची भाषा तयार करत आहोत.",
  mn: "Түр хүлээнэ үү — таны хэлийг бэлдэж байна.",
  no: "Vennligst vent — vi gjør klar språket ditt.",
  pl: "Proszę czekać — przygotowujemy Twój język.",
  pt: "Aguarde, por favor — estamos preparando o seu idioma.",
  pa: "ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ — ਅਸੀਂ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਤਿਆਰ ਕਰ ਰਹੇ ਹਾਂ।",
  ro: "Vă rugăm așteptați — pregătim limba dumneavoastră.",
  sr: "Молимо сачекајте — припремамо ваш језик.",
  sk: "Čakajte prosím — pripravujeme váš jazyk.",
  sl: "Počakajte, prosim — pripravljamo vaš jezik.",
  so: "Fadlan sug — waxaan diyaarinaynaa luqaddaada.",
  sw: "Tafadhali subiri — tunaandaa lugha yako.",
  sv: "Vänta lite — vi förbereder ditt språk.",
  tl: "Mangyaring maghintay — inihahanda namin ang iyong wika.",
  ta: "தயவுசெய்து காத்திருங்கள் — உங்கள் மொழியைத் தயாரிக்கிறோம்.",
  te: "దయచేసి వేచి ఉండండి — మీ భాషను సిద్ధం చేస్తున్నాము.",
  th: "โปรดรอสักครู่ — เรากำลังเตรียมภาษาของคุณ",
  tr: "Lütfen bekleyin — dilinizi hazırlıyoruz.",
  ur: "براہ کرم انتظار کریں — ہم آپ کی زبان تیار کر رہے ہیں۔",
};

export function getGettingReadyMessage(code: string): string {
  return GETTING_READY_MESSAGES[code] ?? GETTING_READY_FALLBACK;
}

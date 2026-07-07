export type ComplaintValidationCode =
  | "ok"
  | "meaningless"
  | "offensive"
  | "repeating";

const VOWELS = /[аеёиоуыэюяәіиөүұaeiou]/i;

const LEETSPEAK_MAP: Record<string, string> = {
  "@": "а",
  "0": "о",
  "1": "и",
  "3": "з",
  "4": "ч",
  "5": "с",
  "6": "б",
  "7": "т",
  "8": "в",
  "9": "д",
  "$": "с",
};

const OFFENSIVE_ROOTS = [
  "хуй",
  "хуе",
  "пизд",
  "еба",
  "ебл",
  "бляд",
  "блят",
  "ебан",
  "ебуч",
  "нахуй",
  "залуп",
  "мудак",
  "мудил",
  "шлюх",
  "сука",
  "ублюд",
  "гандон",
  "пидор",
  "котак",
  "котаг",
  "боқ",
  "бок",
  "көт",
  "кет",
  "шешен",
];

const MEDICAL_ROOTS = [
  "температ",
  "кашл",
  "жөтел",
  "голов",
  "болит",
  "боль",
  "ауыр",
  "ауру",
  "горл",
  "тамақ",
  "тамак",
  "насмор",
  "мурын",
  "мұрын",
  "ухо",
  "құлақ",
  "кулак",
  "глаз",
  "көз",
  "коз",
  "серд",
  "жүрек",
  "журек",
  "давлен",
  "қысым",
  "кысым",
  "одыш",
  "ентіг",
  "ентиг",
  "спин",
  "живот",
  "іш",
  "иш",
  "тошнот",
  "рвот",
  "диаре",
  "понос",
  "зуб",
  "тіс",
  "тис",
  "десн",
  "сып",
  "кожа",
  "кож",
  "зуд",
  "мигрен",
  "головокруж",
  "онемен",
  "судорог",
  "сахар",
  "щитовид",
  "гормон",
  "слабост",
  "әлсіз",
  "алсиз",
  "озноб",
  "жар",
];

function normalizeComplaintText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForOffensiveCheck(value: string) {
  return value
    .toLowerCase()
    .replace(/./g, (char) => LEETSPEAK_MAP[char] ?? char)
    .replace(/[^a-zа-яёәіңғүұқөһі\s]/giu, "");
}

function extractWords(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{M}\p{N}'’.-]+/gu) ?? [];
}

function looksMedical(word: string) {
  return MEDICAL_ROOTS.some((root) => word.includes(root));
}

function hasRepeatedWordSpam(words: string[]) {
  if (words.length < 3) return false;

  let streak = 1;
  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1]) {
      streak += 1;
      if (streak >= 3) return true;
    } else {
      streak = 1;
    }
  }

  return false;
}

function hasOnlyWeakWords(words: string[]) {
  const meaningfulWords = words.filter((word) => /[\p{L}\p{M}]/u.test(word) && word.length >= 2);

  if (meaningfulWords.length >= 2) {
    return meaningfulWords.every((word) => !VOWELS.test(word) && !looksMedical(word));
  }

  if (meaningfulWords.length === 1) {
    const [single] = meaningfulWords;
    if (single.length >= 15 && !looksMedical(single)) return true;
    if (!looksMedical(single) && words.length === 1) return true;
  }

  return meaningfulWords.length === 0;
}

export function validateComplaint(value: string): ComplaintValidationCode {
  const normalized = normalizeComplaintText(value);
  if (normalized.length < 10) return "meaningless";

  if (/([^\s])\1{5,}/u.test(normalized)) return "repeating";
  if (/([.?!,;:\-_=+*])\1{3,}/u.test(normalized)) return "repeating";

  const offensiveCandidate = normalizeForOffensiveCheck(normalized);
  if (OFFENSIVE_ROOTS.some((root) => offensiveCandidate.includes(root))) {
    return "offensive";
  }

  const words = extractWords(normalized);
  if (hasRepeatedWordSpam(words)) return "repeating";

  const noSpaces = !/\s/u.test(normalized);
  if (noSpaces && normalized.length >= 16 && words.length <= 1 && !looksMedical(words[0] || "")) {
    return "meaningless";
  }

  const letters = (normalized.match(/[\p{L}\p{M}]/gu) ?? []).length;
  if (letters / normalized.length < 0.45) return "meaningless";

  if (hasOnlyWeakWords(words)) return "meaningless";

  return "ok";
}

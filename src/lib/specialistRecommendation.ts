export type SpecialistRecommendation = {
  specialty: string;
  reason: string;
};

type RecommendationRule = {
  specialty: string;
  reason: string;
  patterns: RegExp[];
};

const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    specialty: "Педиатр",
    reason: "жалоба похожа на обращение по ребёнку",
    patterns: [/реб[её]нок/u, /ребенк/u, /малыш/u, /младен/u, /дочк/u, /сын/u],
  },
  {
    specialty: "Кардиолог",
    reason: "есть симптомы, связанные с сердцем или давлением",
    patterns: [/боль.*груд/u, /груд.*бол/u, /сердц/u, /давлен/u, /одыш/u, /аритм/u, /сердцеби/u],
  },
  {
    specialty: "Невролог",
    reason: "есть неврологические симптомы",
    patterns: [/головокруж/u, /онемен/u, /мигр/u, /судорог/u, /тремор/u, /спин/u],
  },
  {
    specialty: "Хирург",
    reason: "есть признаки травмы или раны",
    patterns: [/травм/u, /порез/u, /перелом/u, /ран/u, /нарыв/u, /опухол/u],
  },
  {
    specialty: "ЛОР",
    reason: "жалоба относится к уху, горлу или носу",
    patterns: [/горл/u, /ухо/u, /уш/u, /нос/u, /насмор/u, /залож/u],
  },
  {
    specialty: "Дерматолог",
    reason: "жалоба связана с кожей",
    patterns: [/сып/u, /кож/u, /зуд/u, /пятн/u, /экзем/u],
  },
  {
    specialty: "Офтальмолог",
    reason: "жалоба связана со зрением или глазами",
    patterns: [/глаз/u, /зрен/u, /резь.*глаз/u],
  },
  {
    specialty: "Стоматолог",
    reason: "жалоба связана с зубами или дёснами",
    patterns: [/зуб/u, /десн/u, /д[её]сн/u],
  },
  {
    specialty: "Эндокринолог",
    reason: "есть признаки эндокринной жалобы",
    patterns: [/щитовид/u, /сахар/u, /гормон/u, /вес/u],
  },
  {
    specialty: "Терапевт",
    reason: "жалоба похожа на желудочно-кишечную или общую терапевтическую",
    patterns: [/живот/u, /тошнот/u, /изжог/u, /желуд/u, /понос/u, /диаре/u],
  },
  {
    specialty: "Терапевт",
    reason: "жалоба похожа на общее терапевтическое обращение",
    patterns: [/головн/u, /температур/u, /простуд/u, /слабост/u, /каш[её]л/u, /недомог/u, /грип/u],
  },
];

function normalizeReason(reason: string) {
  return reason.toLowerCase().replace(/ё/g, "е").trim();
}

export function recommendSpecialist(reason?: string | null): SpecialistRecommendation {
  const normalized = normalizeReason(reason || "");

  for (const rule of RECOMMENDATION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { specialty: rule.specialty, reason: rule.reason };
    }
  }

  return {
    specialty: "Терапевт",
    reason: "по умолчанию общую жалобу лучше начать с терапевта",
  };
}

export function doctorMatchesRecommendedSpecialty(
  doctorSpecialty?: string | null,
  recommendedSpecialty?: string | null,
) {
  if (!doctorSpecialty || !recommendedSpecialty) return false;
  return doctorSpecialty.toLowerCase() === recommendedSpecialty.toLowerCase();
}

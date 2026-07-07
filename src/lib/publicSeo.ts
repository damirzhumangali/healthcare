export type PublicSeoLocale = "ru" | "kk" | "en";

export type PublicSeoRoute =
  | "/"
  | "/body"
  | "/privacy"
  | "/terms"
  | "/medical-disclaimer";

type SeoEntry = {
  title: string;
  description: string;
};

type PublicSeoMap = Record<PublicSeoRoute, Record<PublicSeoLocale, SeoEntry>>;

export const PRERENDER_ROUTES: PublicSeoRoute[] = [
  "/",
  "/body",
  "/privacy",
  "/terms",
  "/medical-disclaimer",
];

const publicSeoMap: PublicSeoMap = {
  "/": {
    ru: {
      title: "HealthAssist — Умная медицинская станция и AI-платформа | Казахстан",
      description:
        "HealthAssist — автоматическая умная медицинская станция измерений. Проверяйте симптомы с AI, используйте 3D-карту тела и измеряйте температуру и пульс по QR-коду в клиниках Казахстана.",
    },
    kk: {
      title: "HealthAssist — Ақылды медициналық станция және AI-платформасы | Қазақстан",
      description:
        "HealthAssist — автоматты ақылды медициналық өлшеу станциясы. Симптомдарды тексеріңіз, 3D дене картасын қолданыңыз және Қазақстан емханаларында QR-код арқылы температура мен пульсті өлшеңіз.",
    },
    en: {
      title: "HealthAssist — Smart Medical Station and AI Platform | Kazakhstan",
      description:
        "HealthAssist — automated smart medical station. Check symptoms with AI, use a 3D body map, and measure temperature and pulse via QR code in clinics.",
    },
  },
  "/body": {
    ru: {
      title: "3D карта тела и симптомов — HealthAssist",
      description:
        "Интерактивная 3D-карта тела HealthAssist помогает отметить боль, описать симптомы и получить базовую AI-подсказку по самочувствию.",
    },
    kk: {
      title: "3D дене картасы және белгілер — HealthAssist",
      description:
        "HealthAssist интерактивті 3D дене картасы ауырған жерді белгілеуге, белгілерді сипаттауға және бастапқы AI-кеңес алуға көмектеседі.",
    },
    en: {
      title: "3D body map and symptoms — HealthAssist",
      description:
        "The interactive HealthAssist 3D body map helps patients mark pain points, describe symptoms, and get basic AI guidance.",
    },
  },
  "/privacy": {
    ru: {
      title: "Политика конфиденциальности — HealthAssist",
      description:
        "Политика конфиденциальности HealthAssist: как сервис обрабатывает, хранит и защищает персональные и медицинские данные пользователей.",
    },
    kk: {
      title: "Құпиялық саясаты — HealthAssist",
      description:
        "HealthAssist сервисінің құпиялық саясаты: пайдаланушылардың жеке және медициналық деректері қалай өңделеді және қорғалады.",
    },
    en: {
      title: "Privacy Policy — HealthAssist",
      description:
        "HealthAssist privacy policy: how the service processes, stores, and protects personal and medical user data.",
    },
  },
  "/terms": {
    ru: {
      title: "Пользовательское соглашение — HealthAssist",
      description:
        "Пользовательское соглашение HealthAssist: правила использования платформы, права и обязанности пользователей и сервиса.",
    },
    kk: {
      title: "Пайдаланушы келісімі — HealthAssist",
      description:
        "HealthAssist платформасын пайдалану ережелері, пайдаланушы мен сервистің құқықтары мен міндеттері.",
    },
    en: {
      title: "Terms of Use — HealthAssist",
      description:
        "HealthAssist terms of use: platform rules, user responsibilities, and service obligations.",
    },
  },
  "/medical-disclaimer": {
    ru: {
      title: "Отказ от медицинской ответственности — HealthAssist",
      description:
        "Медицинский дисклеймер HealthAssist: сервис не заменяет консультацию врача и не предназначен для экстренной помощи.",
    },
    kk: {
      title: "Медициналық жауапкершіліктен бас тарту — HealthAssist",
      description:
        "HealthAssist сервисі дәрігер кеңесін алмастырмайды және шұғыл медициналық көмекке арналмаған.",
    },
    en: {
      title: "Medical Disclaimer — HealthAssist",
      description:
        "HealthAssist medical disclaimer: the service does not replace a doctor consultation and is not intended for emergency care.",
    },
  },
};

export function getPublicSeo(route: PublicSeoRoute, locale: PublicSeoLocale = "ru") {
  return publicSeoMap[route][locale];
}

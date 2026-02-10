import { type Dictionary, t } from "intlayer";

const sponsorsPageContent = {
  key: "sponsors-page",
  content: {
    title: t({
      en: "Backed by Industry Leaders",
      pt: "Apoiados por Líderes da Indústria",
    }),
    subtitle: t({
      en: "// Partners & Sponsors",
      pt: "// Parceiros & Patrocinadores"
    }),
    description: t({
      en: "Our work is made possible through the generous support of companies and institutions who believe in student-led innovation.",
      pt: "O nosso trabalho só é possível graças ao generoso apoio de empresas e instituições que acreditam na inovação liderada por estudantes.",
    }),
    partners: t({
      en: "Partners",
      pt: "Parceiros",
    }),
    visitWebsite: t({
      en: "Visit website",
      pt: "Visitar website",
    }),
    noSponsors: t({
      en: "Partners coming soon.",
      pt: "Parceiros em breve.",
    }),
    commonSponsors: t({
      en: "Institutional Sponsors",
      pt: "Parceiros Institucionais",
    }),
  },
} satisfies Dictionary;

export default sponsorsPageContent;

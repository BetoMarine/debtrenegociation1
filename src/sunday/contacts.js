/**
 * Public, re-verified contact points for Sunday Pack routing.
 * The app never calls, emails, or WhatsApps anyone on the helper’s behalf.
 * Sources are listed in comments; do not invent replacements if a page moves.
 */

export const ENRICH = {
  booking: "https://enrichhk.app.neoncrm.com/forms/fhd-registration",
  resources: "https://enrichhk.org/resources-domestic-workers",
  whatsappEnTl: "+852 5981 3754",
  whatsappEnTlHref: "https://wa.me/85259813754",
  whatsappId: "+852 5648 0990",
  whatsappIdHref: "https://wa.me/85256480990",
  // Enrich HK contact / resources pages, 2026-09
};

export const HELP = {
  site: "https://helpfordomesticworkers.org/",
  contact: "https://helpfordomesticworkers.org/contact/",
  resources: "https://helpfordomesticworkers.org/get-help/useful-numbers-and-links/",
  phone: "+852 2523 4020",
  phoneHref: "tel:+85225234020",
  whatsapp: "+852 5936 3780",
  whatsappHref: "https://wa.me/85259363780",
  // HELP for Domestic Workers contact page, 2026-09
};

export const LABOUR_FDH = {
  phone: "2157 9537",
  phoneHref: "tel:+85221579537",
  portal: "https://www.fdh.labour.gov.hk/en/contact_us.html",
  // Labour Department FDH dedicated hotline (handled by 1823)
};

export const CARITAS = {
  phone: "18288",
  phoneHref: "tel:18288",
  // Caritas Family Crisis Support Centre 24-hour line
};

export const TWGH_FDCC = {
  label: "TWGH FDCC",
  phone: "2548 0803",
  phoneHref: "tel:+85225480803",
  site: "https://fdcc.tungwahcsd.org/about-us/contact-us/",
  // Tung Wah Group of Hospitals Healthy Budgeting Family Debt Counselling Centre
};

export const POLICE = {
  phone: "999",
  phoneHref: "tel:999",
};

export const CONSULATE_PH = {
  label: "Philippine Consulate General, Hong Kong",
  phone: "2823 8500",
  phoneHref: "tel:+85228238500",
  emergency: "9155 4023",
  emergencyHref: "tel:+85291554023",
  site: "https://hongkongpcg.dfa.gov.ph/",
  directory: "https://hongkongpcg.dfa.gov.ph/directory",
  // HELP resources page + PCG directory
};

export const CONSULATE_ID = {
  label: "Indonesian Consulate General, Hong Kong",
  phone: "+852 3651 0200",
  phoneHref: "tel:+85236510200",
  site: "https://kemlu.go.id/hongkong",
  // HELP resources page (phone); KJRI Hong Kong site
};

export const ALTERNATES = [CARITAS, TWGH_FDCC];

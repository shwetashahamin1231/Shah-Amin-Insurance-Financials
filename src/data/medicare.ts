/**
 * ════════════════════════════════════════════════════════════════════
 *  MEDICARE 101 — yearly figures and guide content
 * ════════════════════════════════════════════════════════════════════
 *  Used by the Medicare 101 page (src/pages/medicare-101.astro) and the
 *  Medicare Plans service page.
 *
 *  HOW TO EDIT
 *  • Every fall, CMS announces the next year's amounts. Update FIGURES:
 *    change `year`, then each number. Write money as plain numbers —
 *    202.9 (not "$202.90"), 1736 (not "1,736"). The page formats them.
 *  • Check that each `source` link still opens the current official page.
 *  • PART_D_NEXT_YEAR shows next year's drug-plan limits. Update it when
 *    new limits are published, or set it to null to hide that line.
 *  • The wording on the page (lists, tables, answers) is further down.
 *    Keep it plain and educational: no "best" or "cheapest", no promises.
 *  • Enrollment dates (Oct 15 – Dec 7 etc.) are set by federal rules and
 *    rarely change; if they do, edit ENROLLMENT_PERIODS.
 *  The cost cards, tables and penalty estimator all read these values,
 *  so each number only needs changing once.
 * ════════════════════════════════════════════════════════════════════
 */
import type { IconName } from '../lib/icons';

/** $1,736 · $202.90 (cents only when the amount has them). */
const usd = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

/* ───────────── Official sources ───────────── */

export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  cmsFactSheet: { label: 'CMS — 2026 Medicare Parts A & B premiums and deductibles', url: 'https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles' },
  partDCosts: { label: 'Medicare.gov — Costs for Medicare drug coverage', url: 'https://www.medicare.gov/health-drug-plans/part-d/basics/costs' },
  medicareCosts: { label: 'Medicare.gov — Medicare costs', url: 'https://www.medicare.gov/basics/costs/medicare-costs' },
  medigapCompare: { label: 'Medicare.gov — Compare Medigap plan benefits', url: 'https://www.medicare.gov/health-drug-plans/medigap/basics/compare-plan-benefits' },
  njShipMedigap: { label: 'NJ SHIP — Medigap Plan Benefits chart (2026)', url: 'https://www.nj.gov/humanservices/doas/documents/SHIP_Medigap_Benefits%20Star%20Chart%202026%20Nov19%2025.pdf' },
  penalties: { label: 'Medicare.gov — Avoid late enrollment penalties', url: 'https://www.medicare.gov/basics/costs/medicare-costs/avoid-penalties' },
  coverageStart: { label: 'Medicare.gov — When does Medicare coverage start?', url: 'https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start' },
  insulin: { label: 'Medicare.gov — Insulin', url: 'https://www.medicare.gov/coverage/insulin' },
  medigapWhen: { label: 'Medicare.gov — When can I buy a Medigap policy?', url: 'https://www.medicare.gov/health-drug-plans/medigap/ready-to-buy/when' },
  whoPaysFirst: { label: 'Medicare.gov — Who pays first?', url: 'https://www.medicare.gov/health-drug-plans/coordination/who-pays-first' },
} as const satisfies Record<string, Source>;

/* ───────────── Yearly figures ───────────── */

export const FIGURES = {
  year: 2026,
  partA: {
    /** Most people pay no Part A premium (about 10 years of Medicare-taxed work, theirs or a spouse's). */
    premiumMostPeople: 0,
    /** 30–39 quarters of Medicare-covered work. */
    premiumReduced: 311,
    /** Fewer than 30 quarters. */
    premiumFull: 565,
    /** Inpatient hospital deductible, per benefit period. */
    deductible: 1736,
    /** Per day, hospital days 61–90. */
    coinsuranceDays61to90: 434,
    /** Per day, days 91–150 (60 lifetime reserve days). */
    lifetimeReserveDay: 868,
    /** Per day, skilled nursing facility days 21–100. */
    snfDays21to100: 217,
    source: SOURCES.cmsFactSheet,
  },
  partB: {
    /** Standard monthly premium. */
    premium: 202.9,
    deductible: 283,
    coinsurancePercent: 20,
    /** Income-related surcharges (IRMAA) start above these yearly incomes. */
    irmaaIndividualAbove: 109000,
    irmaaJointAbove: 218000,
    source: SOURCES.cmsFactSheet,
  },
  partD: {
    maxDeductible: 615,
    outOfPocketCap: 2100,
    /** National base beneficiary premium — used to work out the Part D late penalty. */
    basePremium: 38.99,
    /** Covered insulin, per month's supply (set by law, not yearly). */
    insulinMonthlyCap: 35,
    source: SOURCES.partDCosts,
  },
  medigap: {
    planKLimit: 8000,
    planLLimit: 4000,
    /** High-deductible Plan F / Plan G: you pay this much first. */
    highDeductible: 2950,
    source: SOURCES.medigapCompare,
  },
} as const;

/** Next year's Part D limits (for plans starting in January). Set to null to hide. */
export const PART_D_NEXT_YEAR: { year: number; maxDeductible: number; outOfPocketCap: number; source: Source } | null = {
  year: 2027,
  maxDeductible: 700,
  outOfPocketCap: 2400,
  source: SOURCES.partDCosts,
};

const Y = FIGURES.year;
const A = FIGURES.partA;
const B = FIGURES.partB;
const D = FIGURES.partD;
const G = FIGURES.medigap;
const NEXT = PART_D_NEXT_YEAR;

/* ───────────── Who can get Medicare ───────────── */

export const ELIGIBILITY: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'Age 65 or older',
    text: 'Most people qualify at 65. If you or your spouse worked and paid Medicare taxes for about 10 years, Part A is usually premium-free.',
    icon: 'calendar-check',
  },
  {
    title: 'Under 65 with a disability',
    text: 'After 24 months of Social Security disability benefits (or certain Railroad Retirement disability benefits), you are enrolled automatically.',
    icon: 'user-circle',
  },
  {
    title: 'ALS (Lou Gehrig’s disease)',
    text: 'Medicare begins as soon as your disability benefits start — there is no 24-month wait.',
    icon: 'hand-heart',
  },
  {
    title: 'End-Stage Renal Disease',
    text: 'People of any age with permanent kidney failure who need regular dialysis or a kidney transplant may qualify.',
    icon: 'heartbeat',
  },
];

/* ───────────── The four parts ───────────── */

export interface PartCost {
  label: string;
  value: string;
  note?: string;
}
export interface MedicarePart {
  id: 'a' | 'b' | 'c' | 'd';
  letter: 'A' | 'B' | 'C' | 'D';
  name: string;
  icon: IconName;
  summary: string;
  covers: string[];
  costs: PartCost[];
  note: string;
  source: Source;
}

export const PARTS: MedicarePart[] = [
  {
    id: 'a',
    letter: 'A',
    name: 'Hospital insurance',
    icon: 'heartbeat',
    summary: 'Helps pay for your care when you are admitted to a hospital, and for some care afterwards.',
    covers: [
      'Inpatient care in a hospital',
      'Skilled nursing facility care after a qualifying inpatient hospital stay (not long-term custodial care)',
      'Hospice care',
      'Some home health care',
    ],
    costs: [
      { label: 'Monthly premium', value: '$0 for most people', note: `${usd(A.premiumReduced)} or ${usd(A.premiumFull)} a month if you or your spouse paid Medicare taxes for less than about 10 years` },
      { label: 'Hospital deductible', value: `${usd(A.deductible)} per benefit period` },
      { label: 'Hospital days 61–90', value: `${usd(A.coinsuranceDays61to90)} a day` },
      { label: 'Days 91–150 (lifetime reserve days)', value: `${usd(A.lifetimeReserveDay)} a day` },
      { label: 'Skilled nursing days 21–100', value: `${usd(A.snfDays21to100)} a day` },
    ],
    note: 'Hospital days 1–60 cost $0 after the deductible. A benefit period starts the day you are admitted and ends after 60 days in a row without inpatient hospital or skilled nursing care — so the deductible can apply more than once in a year. You have 60 lifetime reserve days in total.',
    source: SOURCES.cmsFactSheet,
  },
  {
    id: 'b',
    letter: 'B',
    name: 'Medical insurance',
    icon: 'stethoscope',
    summary: 'Helps pay for doctors, outpatient care, preventive services and medical equipment.',
    covers: [
      'Doctors’ visits, including specialists',
      'Outpatient care, lab tests and many outpatient procedures',
      'Preventive services, such as screenings and flu shots',
      'Durable medical equipment, such as walkers, wheelchairs and oxygen',
      'Ambulance services, outpatient mental health care and some home health care',
    ],
    costs: [
      { label: 'Standard monthly premium', value: usd(B.premium), note: `Higher if your income is above ${usd(B.irmaaIndividualAbove)} (individual) or ${usd(B.irmaaJointAbove)} (joint)` },
      { label: 'Yearly deductible', value: usd(B.deductible) },
      { label: 'After the deductible', value: `Usually ${B.coinsurancePercent}% of the Medicare-approved amount` },
    ],
    note: 'Original Medicare has no yearly limit on what you pay out of pocket. That is why many people add a Medicare Supplement policy or choose a Medicare Advantage plan.',
    source: SOURCES.cmsFactSheet,
  },
  {
    id: 'c',
    letter: 'C',
    name: 'Medicare Advantage',
    icon: 'shield-check',
    summary: 'An all-in-one way to get your Medicare benefits through a private plan approved by Medicare.',
    covers: [
      'The hospital and medical services Original Medicare covers',
      'Usually prescription drug coverage',
      'Often extras such as dental, vision, hearing or fitness benefits — these vary by plan',
      'A yearly limit on your out-of-pocket costs for covered services',
    ],
    costs: [
      { label: 'Monthly premium', value: 'Your Part B premium, plus the plan’s premium', note: 'Some plans have a $0 plan premium' },
      { label: 'When you get care', value: 'Copays or coinsurance set by the plan' },
      { label: 'Yearly out-of-pocket limit', value: 'Every plan has one; the amount varies by plan' },
    ],
    note: 'Most plans use networks of doctors and hospitals (such as HMOs and PPOs) and may require referrals or approval before some services. Plans, costs and benefits vary by area and change every year.',
    source: SOURCES.medicareCosts,
  },
  {
    id: 'd',
    letter: 'D',
    name: 'Prescription drug coverage',
    icon: 'certificate',
    summary: 'Helps pay for prescription drugs — as a standalone plan or as part of a Medicare Advantage plan.',
    covers: [
      'Prescription drugs on the plan’s list of covered drugs (its “formulary”)',
      'A standalone plan to pair with Original Medicare, or coverage built into most Medicare Advantage plans',
      `Covered insulin for no more than ${usd(D.insulinMonthlyCap)} for a month’s supply`,
    ],
    costs: [
      { label: 'Monthly premium', value: 'Varies by plan', note: 'Higher-income households pay an extra amount' },
      {
        label: 'Yearly deductible',
        value: `No more than ${usd(D.maxDeductible)} in ${Y}`,
        note: NEXT ? `No more than ${usd(NEXT.maxDeductible)} for plans in ${NEXT.year}` : undefined,
      },
      {
        label: 'Yearly out-of-pocket cap',
        value: `${usd(D.outOfPocketCap)} in ${Y}`,
        note: `After that, $0 for covered drugs for the rest of the year${NEXT ? ` · ${usd(NEXT.outOfPocketCap)} in ${NEXT.year}` : ''}`,
      },
    ],
    note: 'If you go 63 days or more in a row without Part D or other creditable drug coverage after your Initial Enrollment Period, you may owe a late penalty for as long as you have drug coverage. Extra Help can lower drug costs for people with limited income and resources.',
    source: SOURCES.partDCosts,
  },
];

/* ───────────── Original Medicare vs Medicare Advantage ───────────── */

export const COMPARE_ROWS: { topic: string; original: string; advantage: string }[] = [
  {
    topic: 'How it works',
    original: 'Medicare pays its share of covered services. A Medigap policy can pay much of the rest, and a separate Part D plan covers drugs.',
    advantage: 'A private plan approved by Medicare provides your hospital and medical coverage — and usually drug coverage — in one plan.',
  },
  {
    topic: 'Doctors and hospitals',
    original: 'Any doctor or hospital in the U.S. that accepts Medicare.',
    advantage: 'Usually a network. Going outside it may cost more or may not be covered, except for emergencies and urgent care.',
  },
  {
    topic: 'Referrals to specialists',
    original: 'Generally not needed.',
    advantage: 'Often needed, especially in HMO plans.',
  },
  {
    topic: 'Approval before care',
    original: 'Rarely required.',
    advantage: 'Plans may require approval (prior authorization) for certain services.',
  },
  {
    topic: 'Monthly premiums',
    original: 'Part B premium, plus your Medigap and Part D premiums.',
    advantage: 'Part B premium, plus the plan’s premium — some plans have a $0 plan premium.',
  },
  {
    topic: 'Costs when you get care',
    original: 'Depends on your Medigap plan; many plans leave little to pay. Without one, you usually pay 20% with no cap.',
    advantage: 'Copays and coinsurance as you use services, set by each plan.',
  },
  {
    topic: 'Yearly out-of-pocket limit',
    original: 'None with Original Medicare alone. A Medigap policy pays much or all of your share, depending on the plan.',
    advantage: 'Yes — every plan has one, and the amount varies by plan.',
  },
  {
    topic: 'Dental, vision and hearing',
    original: 'Mostly not covered; you can buy separate coverage.',
    advantage: 'Often included, with benefits that vary by plan.',
  },
  {
    topic: 'Travel',
    original: 'Coverage anywhere in the U.S. Some Medigap plans help with emergency care abroad.',
    advantage: 'Non-emergency care is generally limited to the plan’s network and service area; emergency care is covered anywhere in the U.S.',
  },
  {
    topic: 'Changing your mind later',
    original: 'You can switch Part D plans each year. Changing Medigap policies after your open enrollment period may require health questions.',
    advantage: 'You can change plans each year. You can return to Original Medicare, but buying a Medigap policy then may require health questions.',
  },
];

/* ───────────── Medigap (Medicare Supplement) plans ───────────── */

export const MEDIGAP_PLANS = ['A', 'B', 'C', 'D', 'F', 'G', 'K', 'L', 'M', 'N'] as const;
export type MedigapPlan = (typeof MEDIGAP_PLANS)[number];
/** Plans sold only to people who were eligible for Medicare before January 1, 2020. */
export const MEDIGAP_PRE2020: MedigapPlan[] = ['C', 'F'];

/** 100 = pays 100%; 80 / 75 / 50 = pays that percentage; 0 = not covered; 'N' = 100% except Plan N copays. */
export type MedigapCoverage = 100 | 80 | 75 | 50 | 0 | 'N';

const all = (v: MedigapCoverage, except: Partial<Record<MedigapPlan, MedigapCoverage>> = {}) =>
  Object.fromEntries(MEDIGAP_PLANS.map((p) => [p, except[p] ?? v])) as Record<MedigapPlan, MedigapCoverage>;

export const MEDIGAP_BENEFITS: { benefit: string; detail?: string; coverage: Record<MedigapPlan, MedigapCoverage> }[] = [
  { benefit: 'Part A coinsurance and hospital costs', detail: 'Up to an extra 365 days after Medicare benefits are used up', coverage: all(100) },
  { benefit: 'Part B coinsurance or copayment', coverage: all(100, { K: 50, L: 75, N: 'N' }) },
  { benefit: 'Blood (first 3 pints)', coverage: all(100, { K: 50, L: 75 }) },
  { benefit: 'Part A hospice care coinsurance or copayment', coverage: all(100, { K: 50, L: 75 }) },
  { benefit: 'Skilled nursing facility coinsurance', coverage: all(100, { A: 0, B: 0, K: 50, L: 75 }) },
  { benefit: 'Part A deductible', detail: `${usd(A.deductible)} per benefit period in ${Y}`, coverage: all(100, { A: 0, K: 50, L: 75, M: 50 }) },
  { benefit: 'Part B deductible', detail: `${usd(B.deductible)} in ${Y}`, coverage: all(0, { C: 100, F: 100 }) },
  { benefit: 'Part B excess charges', detail: 'Extra amounts some doctors may charge above Medicare’s approved amount', coverage: all(0, { F: 100, G: 100 }) },
  { benefit: 'Foreign travel emergency', detail: 'Up to plan limits', coverage: all(0, { C: 80, D: 80, F: 80, G: 80, M: 80, N: 80 }) },
];

/** The extra "out-of-pocket limit" row (only Plans K and L have one). */
export const MEDIGAP_OOP: Partial<Record<MedigapPlan, string>> = {
  K: usd(G.planKLimit),
  L: usd(G.planLLimit),
};

export const MEDIGAP_NOTES: string[] = [
  `Plans C and F (marked *) can only be bought by people who were eligible for Medicare before January 1, 2020. If that includes you, you may still be able to buy them.`,
  `† Plan N pays 100% of Part B coinsurance, except for a copayment of up to $20 for some office visits and up to $50 for emergency room visits that don’t lead to an inpatient admission.`,
  `Plans K and L: once you reach the yearly out-of-pocket limit (${usd(G.planKLimit)} for K and ${usd(G.planLLimit)} for L in ${Y}) and pay the Part B deductible, the plan pays 100% of covered services for the rest of the year.`,
  `Plans F and G may also be offered with a high deductible: you pay the first ${usd(G.highDeductible)} of covered costs in ${Y} before the policy pays.`,
  'Foreign travel emergency: 80% of the cost of emergency care that begins during the first 60 days of a trip outside the U.S., after a $250 yearly deductible, up to a $50,000 lifetime limit.',
  'Medigap policies don’t include drug coverage — pair one with a Part D plan. They also can’t be used with a Medicare Advantage plan.',
];

/** New Jersey-specific rule from the state SHIP chart. */
export const MEDIGAP_NJ_NOTE =
  'In New Jersey, people under 65 who have Medicare because of a disability, with Part A starting on or after January 1, 2020, can buy only Medigap Plan D until they turn 65.';

/* ───────────── Enrollment periods ───────────── */

export interface EnrollmentPeriod {
  id: string;
  name: string;
  abbr?: string;
  /** When it happens, in words. */
  when: string;
  /** Fixed yearly dates [month, day]. Leave out for periods that depend on your own dates. */
  yearly?: { start: readonly [number, number]; end: readonly [number, number] };
  /** What you can do. */
  what: string;
  /** When changes take effect. */
  effective: string;
}

export const ENROLLMENT_PERIODS: EnrollmentPeriod[] = [
  {
    id: 'iep',
    name: 'Initial Enrollment Period',
    abbr: 'IEP',
    when: 'Seven months around your 65th birthday: the 3 months before your birthday month, that month, and the 3 months after.',
    what: 'Sign up for Part A and Part B, and join a Medicare Advantage or Part D plan.',
    effective: 'Depends on the month you sign up — use the calculator above to see your dates.',
  },
  {
    id: 'medigap-oep',
    name: 'Medigap Open Enrollment Period',
    when: 'Six months, starting the first month you are 65 or older and have Part B. It happens once and does not repeat.',
    what: 'Buy any Medigap policy sold in your state, at the same price as people in good health — insurers cannot turn you down or charge more because of your health.',
    effective: 'Set when you apply — we help you line it up with your Part B start date.',
  },
  {
    id: 'aep',
    name: 'Annual Enrollment Period',
    abbr: 'AEP',
    when: 'October 15 – December 7, every year.',
    yearly: { start: [10, 15], end: [12, 7] },
    what: 'Join, switch or drop a Medicare Advantage or Part D plan, or move between Medicare Advantage and Original Medicare.',
    effective: 'January 1 of the following year.',
  },
  {
    id: 'ma-oep',
    name: 'Medicare Advantage Open Enrollment',
    when: 'January 1 – March 31, every year.',
    yearly: { start: [1, 1], end: [3, 31] },
    what: 'If you are in a Medicare Advantage plan, make one change: switch to another Medicare Advantage plan, or return to Original Medicare (and join a Part D plan).',
    effective: 'The first day of the month after the plan receives your request.',
  },
  {
    id: 'gep',
    name: 'General Enrollment Period',
    abbr: 'GEP',
    when: 'January 1 – March 31, every year.',
    yearly: { start: [1, 1], end: [3, 31] },
    what: 'Sign up for Part A and/or Part B if you missed your Initial Enrollment Period and do not qualify for a Special Enrollment Period. Late penalties may apply.',
    effective: 'The first day of the month after you sign up.',
  },
  {
    id: 'sep',
    name: 'Special Enrollment Periods',
    abbr: 'SEP',
    when: 'After certain life events — for example, when job-based coverage ends, when you move, or if you qualify for Extra Help.',
    what: 'Sign up for or change coverage outside the usual windows. After a job or employer group coverage ends (whichever comes first), you have 8 months to sign up for Part B without a penalty.',
    effective: 'Depends on the situation.',
  },
];

/* ───────────── Common mistakes ───────────── */

export const MISTAKES: { title: string; text: string }[] = [
  {
    title: 'Assuming Medicare starts on its own',
    text: 'You are enrolled automatically only if you already get Social Security (or Railroad Retirement) benefits at least four months before you turn 65. Otherwise, you need to sign up.',
  },
  {
    title: 'Delaying Part B without the right coverage',
    text: 'Only coverage from current employment (yours or your spouse’s) lets you delay Part B safely. Retiree coverage and COBRA do not count — waiting can mean a lifelong penalty and a gap in coverage.',
  },
  {
    title: 'Skipping drug coverage because you take few medicines',
    text: 'Going 63 days or more without Part D or other creditable drug coverage can lead to a penalty that lasts as long as you have drug coverage.',
  },
  {
    title: 'Missing your Medigap window',
    text: 'Your strongest right to buy any Medigap policy without health questions lasts six months. After that, you may be turned down or charged more because of your health.',
  },
  {
    title: 'Choosing a plan by premium alone',
    text: 'Check your doctors, hospitals, prescriptions and pharmacy — and look at the total yearly cost, not just the monthly premium.',
  },
  {
    title: 'Not reviewing your plan each fall',
    text: 'Plans can change premiums, drug lists and networks every January. Your Annual Notice of Change, mailed each fall, explains what is different.',
  },
  {
    title: 'Forgetting about your Health Savings Account',
    text: 'Stop HSA contributions about six months before you sign up for Medicare or apply for Social Security, because Part A coverage can start up to six months back.',
  },
  {
    title: 'Expecting Medicare to cover long-term care',
    text: 'Medicare does not pay for ongoing custodial care. It may cover skilled nursing care for a limited time after a qualifying hospital stay — and time spent “under observation” does not count toward that stay.',
  },
];

/* ───────────── Common situations (accordion) ───────────── */

export const SITUATIONS: { id: string; title: string; html: string }[] = [
  {
    id: 'still-working',
    title: 'I’m still working at 65',
    html: `<p>If you (or your spouse) have group health coverage through current employment at a company with <strong>20 or more employees</strong>, that plan usually pays first, and you can generally delay Part B without a penalty. Many people still take premium-free Part A.</p>
<p>If the employer has <strong>fewer than 20 employees</strong>, Medicare usually pays first — so you will generally want Part A and Part B when you are first eligible. Ask your benefits office how its plan works with Medicare, and remember to stop Health Savings Account contributions before Medicare starts.</p>`,
  },
  {
    id: 'retiring',
    title: 'I’m retiring and losing my employer coverage',
    html: `<p>You have an <strong>8-month Special Enrollment Period</strong> to sign up for Part B, starting when the job or the coverage ends, whichever comes first. Don’t wait for COBRA to run out — COBRA does not extend this window.</p>
<p>Your six-month Medigap Open Enrollment Period begins when your Part B starts, and you’ll want Part D or other creditable drug coverage in place so you don’t go 63 days or more without it.</p>`,
  },
  {
    id: 'disability',
    title: 'I’m under 65 and have a disability',
    html: `<p>You are enrolled in Part A and Part B automatically after receiving Social Security disability benefits for 24 months — or as soon as benefits begin if you have ALS.</p>
<p>Medigap choices can be limited before 65. In New Jersey, if your Part A started on or after January 1, 2020, Plan D is the only Medigap plan available to you until you turn 65. At 65, you get a new chance to enroll, including a Medigap Open Enrollment Period.</p>`,
  },
  {
    id: 'retiree-coverage',
    title: 'I have retiree coverage from a former employer or union',
    html: `<p>Retiree coverage usually works alongside Medicare and often requires you to have both Part A and Part B. Because it is not coverage from current employment, delaying Part B can lead to a penalty.</p>
<p>Check with the plan before you change anything — if you drop retiree coverage, you may not be able to get it back.</p>`,
  },
  {
    id: 'moving',
    title: 'I’m moving',
    html: `<p>Moving out of your plan’s service area — or to an area with new plan options — can open a Special Enrollment Period to change your Medicare Advantage or Part D plan.</p>
<p>A Medigap policy can generally stay with you anywhere in the U.S., although your premium may change. Let us know before you move so we can plan the timing.</p>`,
  },
  {
    id: 'medicaid',
    title: 'I have both Medicare and Medicaid',
    html: `<p>If you qualify for both, you may have special plan options, help with costs and additional chances to change plans during the year. You also qualify for Extra Help with drug costs automatically.</p>`,
  },
  {
    id: 'limited-income',
    title: 'My income is limited',
    html: `<p><strong>Medicare Savings Programs</strong> can help pay your Part B premium, and sometimes more. <strong>Extra Help</strong> lowers prescription drug costs.</p>
<p>In New Jersey, state programs such as <strong>PAAD</strong> and <strong>Senior Gold</strong> may also help with prescriptions. NJ SHIP (1-800-792-8820) can help you check what you may qualify for.</p>`,
  },
];

/* ───────────── How we help ───────────── */

export const HOW_WE_HELP: { title: string; text: string; icon: IconName }[] = [
  { title: 'Explain it all, plainly', text: 'Parts A, B, C and D, your enrollment dates and your costs — at your pace, with family welcome.', icon: 'quotes' },
  { title: 'Compare plans side by side', text: 'We check your doctors, prescriptions and budget against plans from the companies we represent.', icon: 'zoom' },
  { title: 'Enroll correctly and on time', text: 'We help you avoid gaps in coverage and late penalties, from sign-up questions to plan applications.', icon: 'calendar-check' },
  { title: 'Review your plan every fall', text: 'During Annual Enrollment, we will check whether your plan still fits for the year ahead.', icon: 'arrows-clockwise' },
];

/* ───────────── Official resources ───────────── */

export interface Resource {
  name: string;
  text: string;
  links: { label: string; href: string }[];
  phones: { label: string; number: string; tel: string }[];
}

export const RESOURCES: Resource[] = [
  {
    name: 'Medicare.gov',
    text: 'The official U.S. government site for Medicare: compare plans, check costs and read the yearly “Medicare & You” handbook.',
    links: [
      { label: 'Medicare.gov', href: 'https://www.medicare.gov/' },
      { label: 'Medicare Plan Finder', href: 'https://www.medicare.gov/plan-compare/' },
    ],
    phones: [],
  },
  {
    name: '1-800-MEDICARE',
    text: 'Medicare’s own helpline for questions about coverage, claims and plan options.',
    links: [],
    phones: [
      { label: 'Phone', number: '1-800-633-4227', tel: '+18006334227' },
      { label: 'TTY', number: '1-877-486-2048', tel: '+18774862048' },
    ],
  },
  {
    name: 'Social Security',
    text: 'Sign up for Part A and Part B, apply for Extra Help with drug costs, or ask about disability benefits.',
    links: [{ label: 'Sign up for Medicare at SSA.gov', href: 'https://www.ssa.gov/medicare/sign-up' }],
    phones: [
      { label: 'Phone', number: '1-800-772-1213', tel: '+18007721213' },
      { label: 'TTY', number: '1-800-325-0778', tel: '+18003250778' },
    ],
  },
  {
    name: 'New Jersey SHIP',
    text: 'The State Health Insurance Assistance Program offers free Medicare counseling to New Jersey residents, in person, by phone or virtually.',
    links: [{ label: 'NJ SHIP website', href: 'https://www.nj.gov/humanservices/doas/services/q-z/ship/' }],
    phones: [{ label: 'Phone', number: '1-800-792-8820', tel: '+18007928820' }],
  },
  {
    name: 'NJ PAAD & Senior Gold',
    text: 'New Jersey programs that can help eligible residents pay for prescriptions.',
    links: [{ label: 'Senior Gold at nj.gov', href: 'https://www.nj.gov/humanservices/doas/services/q-z/senior-gold/' }],
    phones: [{ label: 'Phone', number: '1-800-792-9745', tel: '+18007929745' }],
  },
];

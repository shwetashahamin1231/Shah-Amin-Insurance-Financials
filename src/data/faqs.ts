/**
 * ════════════════════════════════════════════════════════════════════
 *  FAQ — the questions and answers on the FAQ page (/faq/)
 * ════════════════════════════════════════════════════════════════════
 *  HOW TO EDIT
 *  • Questions are grouped into categories (FAQ_CATEGORIES below).
 *  • Each question has three parts:
 *      id  a short unique name with dashes, e.g. 'faq-hours'. It makes a
 *          direct link that opens the answer: /faq/#faq-hours
 *      q   the question
 *      a   the answer. Plain sentences are fine. Simple HTML is allowed:
 *          <a href="/medicare-101/">a link</a> and <strong>bold</strong>.
 *          Start internal links with "/" — the site adds the rest.
 *  • To add a question, copy a whole { id, q, a } block into the right
 *    category and change the words. To add a category, copy a category.
 *  • Keep answers educational: no prices, promises, "best" or "cheapest".
 *  Phone numbers and hours are filled in from src/config/site.ts.
 * ════════════════════════════════════════════════════════════════════
 */
import { ADVISORS, HOURS, SITE, licensedStatesText } from '../config/site';

export interface Faq {
  id: string;
  q: string;
  /** Answer text (simple HTML allowed). */
  a: string;
}
export interface FaqCategory {
  id: string;
  title: string;
  intro: string;
  items: Faq[];
}

const G = ADVISORS.gautam;
const S = ADVISORS.shweta;
const callBoth = `call ${G.firstName} at <a href="tel:${G.phoneHref}">${G.phone}</a> or ${S.firstName} at <a href="tel:${S.phoneHref}">${S.phone}</a>`;

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    intro: 'Who we are, how to begin and what to expect when we meet.',
    items: [
      {
        id: 'faq-who-we-are',
        q: 'Who are Shah & Amin Financial Services?',
        a: `We are a family-owned insurance and financial services practice that has been helping families since ${SITE.foundedYear}. Founder ${G.name} and ${S.name} help with life insurance, annuities, IRAs, 401(k) rollovers, health insurance, Medicare plans, long-term care, disability income and travel insurance. We are licensed in ${licensedStatesText()}.`,
      },
      {
        id: 'faq-get-started',
        q: 'How do I get started?',
        a: `<a href="/book/">Book an appointment online</a>, or ${callBoth}. Tell us a little about what is on your mind, and we will find a time to talk.`,
      },
      {
        id: 'faq-what-to-bring',
        q: 'What should I bring to our first meeting?',
        a: 'Bring any policies or plan documents you already have, your Medicare card if you have one, a list of your doctors and prescriptions (for health and Medicare questions), and any questions you have jotted down. Don’t worry if you can’t find everything — we can start with a conversation.',
      },
      {
        id: 'faq-family',
        q: 'Can a family member join our conversation?',
        a: 'Of course. Many people bring a spouse, a son or daughter, or a trusted friend. Decisions are easier when the people you rely on hear the same explanations you do.',
      },
      {
        id: 'faq-obligation',
        q: 'Do I have to buy something after we meet?',
        a: 'No. Our job is to help you understand your options clearly. You decide if and when to move forward.',
      },
    ],
  },
  {
    id: 'life-insurance',
    title: 'Life insurance',
    intro: 'Choosing coverage that protects the people you love.',
    items: [
      {
        id: 'faq-term-vs-whole',
        q: 'What is the difference between term and whole life insurance?',
        a: 'Term life insurance covers you for a set number of years and usually costs less to start. Whole life is a type of permanent insurance that lasts your lifetime, has level premiums and builds cash value. Many families use term for needs that end — like a mortgage — and permanent coverage for lifelong goals. <a href="/services/life-insurance/">Read more about life insurance</a>.',
      },
      {
        id: 'faq-health-issues',
        q: 'Can I get life insurance if I have health problems?',
        a: 'Often, yes. Depending on your health, there may be policies with simplified health questions, or policies whose full benefit phases in over the first few years. Your options depend on your age, your health and the amount of coverage you want.',
      },
      {
        id: 'faq-too-old',
        q: 'Am I too old to buy life insurance?',
        a: 'Not necessarily. Many insurers offer coverage well into retirement, including smaller final expense policies designed to cover funeral costs and final bills. Premiums are higher at older ages, so we look at what fits your budget and goals.',
      },
      {
        id: 'faq-beneficiary',
        q: 'Who should I name as my beneficiary?',
        a: 'Most people name a spouse, children or a trust, and add a backup (contingent) beneficiary. Review your choices after major life events. If you are leaving money to young children, it is wise to ask an attorney about a trust or guardian arrangement.',
      },
      {
        id: 'faq-stop-paying',
        q: 'What happens if I stop paying my premiums?',
        a: 'Term coverage typically ends after the policy’s grace period. Permanent policies may offer other options, such as using cash value to keep coverage going or reducing the death benefit. Please call us before you stop paying — there may be choices you haven’t considered.',
      },
    ],
  },
  {
    id: 'retirement',
    title: 'Annuities, IRAs & retirement',
    intro: 'Growing, protecting and drawing on your retirement savings.',
    items: [
      {
        id: 'faq-annuity-vs-investment',
        q: 'Is an annuity the same as an investment account?',
        a: 'No. An annuity is a contract with an insurance company. Fixed and fixed indexed annuities are designed to protect your principal from market losses, credit interest over time and can offer lifetime income options. They also have surrender periods and limits, so they are meant for long-term money. <a href="/services/annuities/">Read more about annuities</a>.',
      },
      {
        id: 'faq-rollover-ira',
        q: 'Should I roll my old 401(k) into an IRA?',
        a: 'Sometimes it makes sense, and sometimes it doesn’t. An IRA can offer more choices and simplify your accounts, but some workplace plans have features worth keeping. We compare both with you before you decide, and use a direct rollover to avoid tax withholding. <a href="/services/retirement-planning/">Read more about rollovers</a>.',
      },
      {
        id: 'faq-traditional-roth',
        q: 'What is the difference between a Traditional IRA and a Roth IRA?',
        a: 'It comes down to when you pay tax. Traditional IRA contributions may be tax-deductible now, and withdrawals are taxed later. Roth IRA contributions are made with money you have already paid tax on, and qualified withdrawals in retirement are tax-free. Income limits and other rules apply.',
      },
      {
        id: 'faq-ira-penalty',
        q: 'When can I take money out of my IRA without a penalty?',
        a: 'Generally from age 59½. Earlier withdrawals from a Traditional IRA may face a 10% additional federal tax unless an exception applies. Roth IRA contributions can usually be withdrawn at any time, while earnings have their own rules. A tax professional can confirm how the rules apply to you.',
      },
      {
        id: 'faq-income-plan',
        q: 'Can you help me plan my income in retirement?',
        a: 'Yes. We map out where your monthly income will come from — Social Security, pensions, savings and annuities — and look at timing, taxes and protection against market downturns. Then we review the plan with you as life changes.',
      },
    ],
  },
  {
    id: 'health-medicare',
    title: 'Health insurance & Medicare',
    intro: 'Coverage before and after 65, explained clearly.',
    items: [
      {
        id: 'faq-medicare-when',
        q: 'When should I sign up for Medicare?',
        a: 'Most people should look at Medicare during their seven-month Initial Enrollment Period: the three months before the month they turn 65, that month, and the three months after. If you are still working with employer coverage, your timing may be different. <a href="/medicare-101/#enrollment">Find your dates in our Medicare 101 guide</a>.',
      },
      {
        id: 'faq-advantage-vs-supplement',
        q: 'What is the difference between Medicare Advantage and a Medicare Supplement?',
        a: 'Medicare Advantage plans are all-in-one plans from private insurers that usually include drug coverage and use provider networks, with copays as you go. A Medicare Supplement (Medigap) works alongside Original Medicare to help pay your share of costs, and lets you see any provider that accepts Medicare; you add a separate Part D drug plan. <a href="/medicare-101/#compare">Compare them side by side</a>.',
      },
      {
        id: 'faq-change-plan',
        q: 'Can I change my Medicare plan?',
        a: 'Yes. During the Annual Enrollment Period, October 15 to December 7, you can change Medicare Advantage and Part D plans for the next year. If you are in a Medicare Advantage plan, you can also make one change between January 1 and March 31. Certain life events open Special Enrollment Periods.',
      },
      {
        id: 'faq-retire-before-65',
        q: 'I am retiring before 65. How do I get health insurance?',
        a: 'Options include continuing your employer coverage through COBRA, joining a spouse’s plan, or buying an individual plan through your state’s marketplace (in New Jersey, that is Get Covered New Jersey). We compare costs and networks with you and plan your move to Medicare at 65. <a href="/services/health-insurance/">Read more about health insurance</a>.',
      },
      {
        id: 'faq-doctor-network',
        q: 'Will my doctor accept my plan?',
        a: 'We check before you enroll: we look up your doctors, hospitals and pharmacy in each plan’s network and confirm how your prescriptions are covered. Because networks can change, it is still wise to confirm with your doctor’s office, and to check again each year.',
      },
      {
        id: 'faq-every-plan',
        q: 'Do you offer every Medicare plan in my area?',
        a: 'No. We represent a number of insurance companies, but not every plan available in your area. For information on all of your options, contact Medicare.gov, 1-800-MEDICARE (TTY 1-877-486-2048), or your local State Health Insurance Assistance Program (SHIP).',
      },
      {
        id: 'faq-travel-abroad',
        q: 'Am I covered when I travel outside the U.S.?',
        a: 'Often not fully. Original Medicare generally does not pay for care outside the U.S., and many health plans offer limited coverage abroad. Travel medical insurance can help with emergency care and evacuation, and trip cancellation coverage protects the prepaid cost of your trip. <a href="/services/travel-insurance/">Read more about travel insurance</a>.',
      },
    ],
  },
  {
    id: 'care-disability',
    title: 'Long-term care & disability',
    intro: 'Protecting your independence and your income.',
    items: [
      {
        id: 'faq-medicare-nursing-home',
        q: 'Does Medicare pay for nursing home care?',
        a: 'Medicare may cover skilled nursing care for a limited time after a qualifying hospital stay, but it does not pay for long-term custodial care — help with everyday activities like bathing and dressing. That is the gap long-term care planning is designed to fill. <a href="/services/long-term-care/">Read more about long-term care</a>.',
      },
      {
        id: 'faq-hybrid-ltc',
        q: 'What is a hybrid long-term care policy?',
        a: 'A hybrid policy combines life insurance (or an annuity) with long-term care benefits. If you need care, the policy helps pay for it; if you never do, your beneficiaries receive a death benefit.',
      },
      {
        id: 'faq-ltc-age',
        q: 'At what age should I start thinking about long-term care?',
        a: 'Many people start planning in their 50s or early 60s, while they are healthy enough to qualify for coverage. The earlier you look, the more options you are likely to have.',
      },
      {
        id: 'faq-disability-savings',
        q: 'Why would I need disability insurance if I have savings?',
        a: 'Savings can cover a short setback, but a longer illness or injury can drain them quickly. Disability income insurance replaces part of your paycheck, so your savings can stay put for retirement and emergencies. <a href="/services/disability-income-insurance/">Read more about disability income insurance</a>.',
      },
      {
        id: 'faq-nj-tdi',
        q: 'Doesn’t New Jersey already provide disability benefits?',
        a: 'New Jersey’s Temporary Disability Insurance program pays short-term benefits to many workers for disabilities that are not work-related. Those benefits are limited in amount and length, so private coverage can help protect you for longer.',
      },
    ],
  },
  {
    id: 'appointments-events',
    title: 'Appointments & events',
    intro: 'When and how to meet us — and our seminars and gatherings.',
    items: [
      {
        id: 'faq-hours',
        q: 'What are your hours?',
        a: `${HOURS.summary}. ${HOURS.holidayNote}.`,
      },
      {
        id: 'faq-phone-video',
        q: 'Can we meet by phone or video instead of in person?',
        a: 'Yes. Appointments are available in person, by phone or by video call — whichever is most comfortable for you.',
      },
      {
        id: 'faq-book',
        q: 'How do I book an appointment?',
        a: `Use our <a href="/book/">online booking page</a> to choose a day and time, or ${callBoth}.`,
      },
      {
        id: 'faq-events',
        q: 'What kinds of events do you hold — and is there a cost?',
        a: 'We host free seminars and client gatherings during the year, from educational presentations to member appreciation events. There is no cost to attend. <a href="/events/">See upcoming events</a>.',
      },
      {
        id: 'faq-rsvp',
        q: 'Do I need to RSVP for an event?',
        a: 'Yes, please — it helps us plan seating and food. You can RSVP on each event’s page or by calling us.',
      },
    ],
  },
];

/** Every question in one list (used for search-engine structured data). */
export const ALL_FAQS: Faq[] = FAQ_CATEGORIES.flatMap((c) => c.items);

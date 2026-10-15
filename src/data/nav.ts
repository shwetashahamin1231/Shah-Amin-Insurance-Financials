/**
 * Site navigation — the header menu, mobile menu and footer links all read
 * from here. Paths are written without the base path; components wrap them
 * with url().
 */
import { SERVICES } from './services';

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}
export interface NavItem extends NavLink {
  children?: NavLink[];
}

export const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'About',
    href: '/about/',
    children: [
      { label: 'Our Team', href: '/about/', description: 'Meet Gautam Shah and Shweta Shah Amin' },
      { label: 'Reviews', href: '/reviews/', description: 'What our clients say' },
    ],
  },
  {
    label: 'Services',
    href: '/services/',
    children: [
      ...SERVICES.map((s) => ({ label: s.shortName ?? s.name, href: `/services/${s.slug}/` })),
      { label: 'Medicare 101', href: '/medicare-101/', description: 'Our plain-English guide' },
    ],
  },
  { label: 'Medicare 101', href: '/medicare-101/' },
  {
    label: 'Events',
    href: '/events/',
    children: [
      { label: 'Upcoming & past events', href: '/events/', description: 'Seminars, member events and workshops' },
      { label: 'Gallery', href: '/gallery/', description: 'Photos from our events' },
    ],
  },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Contact', href: '/contact/' },
];

export const BOOK_HREF = '/book/';

/** Footer columns. */
export const FOOTER_NAV: { title: string; links: NavLink[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About & Our Team', href: '/about/' },
      { label: 'Events', href: '/events/' },
      { label: 'Gallery', href: '/gallery/' },
      { label: 'Reviews', href: '/reviews/' },
      { label: 'FAQ', href: '/faq/' },
      { label: 'Contact', href: '/contact/' },
    ],
  },
  {
    title: 'Services',
    links: [
      ...SERVICES.map((s) => ({ label: s.shortName ?? s.name, href: `/services/${s.slug}/` })),
      { label: 'Medicare 101', href: '/medicare-101/' },
    ],
  },
];

export const LEGAL_NAV: NavLink[] = [
  { label: 'Privacy Policy', href: '/privacy/' },
  { label: 'Disclaimers & Licenses', href: '/disclaimers/' },
];

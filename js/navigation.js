/** Header behaviour: mobile menu, active-section highlighting, back-to-top. */

import { icon } from './icons.js';
import { $, $$, esc } from './utils.js';

const MOBILE_QUERY = window.matchMedia('(max-width: 960px)');
let sectionObserver = null;

function setMenu(open) {
  const toggle = $('#nav-toggle');
  document.body.classList.toggle('nav-open', open);
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
}

function isMenuOpen() {
  return document.body.classList.contains('nav-open');
}

export function initNavigation() {
  const header = $('#site-header');
  const toggle = $('#nav-toggle');
  const nav = $('#site-nav');
  const backToTop = $('#back-to-top');

  toggle?.addEventListener('click', () => setMenu(!isMenuOpen()));

  // Close the mobile menu after choosing a link, on Escape, or on outside click.
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMenuOpen()) {
      setMenu(false);
      toggle?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (isMenuOpen() && !event.target.closest('#site-nav, #nav-toggle')) setMenu(false);
  });
  MOBILE_QUERY.addEventListener('change', (event) => {
    if (!event.matches) setMenu(false);
  });

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    if (backToTop) backToTop.hidden = y < 700;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0 });
    $('#main')?.focus({ preventScroll: true });
  });
}

/** Rebuilds nav links from the visible sections, in display order. */
export function renderNav(sections, resumeHref, resumeName) {
  const list = $('#nav-list');
  if (!list) return;
  list.innerHTML = sections
    .map((section) => `<li><a class="nav-link" href="#${esc(section.id)}">${esc(section.label)}</a></li>`)
    .join('') + (resumeHref
    ? `<li class="nav-mobile-only"><a class="btn btn-primary" href="${esc(resumeHref)}" download="${esc(resumeName)}">${icon('download')}<span>Download Resume</span></a></li>`
    : '');
  observeSections(sections.map((section) => section.id));
}

function observeSections(ids) {
  sectionObserver?.disconnect();
  const links = new Map($$('#nav-list .nav-link').map((link) => [link.getAttribute('href').slice(1), link]));
  const setActive = (id) => {
    links.forEach((link, key) => {
      const active = key === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };
  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
  const home = document.getElementById('home');
  if (home) sectionObserver.observe(home);
}

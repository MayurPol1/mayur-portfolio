/**
 * Entry point. Loads portfolio data, renders every section, and re-renders
 * whenever Edit Mode changes the data.
 */

import { getState, loadPortfolio, subscribe } from './data.js';
import { initAdmin, isEditMode, renderAdminBar } from './admin.js';
import { renderAchievements } from './achievements.js';
import { initCertifications, renderCertifications } from './certifications.js';
import { initContactForm, renderContactInfo } from './contact.js';
import { renderEducation } from './education.js';
import { renderExperience } from './experience.js';
import { icon } from './icons.js';
import { initNavigation, renderNav } from './navigation.js';
import { renderAbout, renderHero, resumeHref, socialLinks } from './profile.js';
import { initProjects, renderProjects } from './projects.js';
import { renderSkills } from './skills.js';
import { initTheme } from './theme.js';
import { $, $$, esc, prefersReducedMotion } from './utils.js';

const ADD_LABELS = {
  experience: 'Add experience',
  projects: 'Add project',
  skills: 'Add skill category',
  education: 'Add education',
  certifications: 'Add certification',
  achievements: 'Add achievement',
};

let firstRender = true;
let revealObserver = null;

function sectionHasContent(id, state) {
  const visible = (items) => items.some((item) => item.visible !== false);
  switch (id) {
    case 'about': return state.profile.about.summary.length > 0;
    case 'experience': return visible(state.experience);
    case 'projects': return state.projects.some((p) => p.status !== 'draft');
    case 'skills': return state.skills.some((cat) => cat.visible !== false && cat.items.length > 0);
    case 'education': return visible(state.education);
    case 'certifications': return visible(state.certifications);
    case 'achievements': return visible(state.achievements);
    default: return true;
  }
}

function renderSectionHead(sectionEl, section, number, ctx, { publicVisible, hasContent }) {
  const head = $('[data-section-head]', sectionEl);
  if (!head) return;
  let status = '';
  if (ctx.editMode && !section.visible) status = `<span class="badge badge-draft">${icon('eye-off')}Hidden section</span>`;
  else if (ctx.editMode && !hasContent) status = `<span class="badge">${icon('eye-off')}Empty — hidden from visitors</span>`;
  head.innerHTML = `
    <p class="section-eyebrow"><span class="section-index">${String(number).padStart(2, '0')}</span>${esc(section.label)}</p>
    <h2 class="section-title" id="${esc(section.id)}-title">${esc(section.title)}</h2>
    ${section.subtitle ? `<p class="section-subtitle">${esc(section.subtitle)}</p>` : ''}
    ${ctx.editMode ? `
    <div class="section-admin">
      ${status}
      ${ADD_LABELS[section.id] ? `<button type="button" class="admin-add" data-admin="add" data-collection="${section.id}">${icon('plus')}${ADD_LABELS[section.id]}</button>` : ''}
      <button type="button" class="admin-add" data-admin="sections">${icon('sliders')}Section settings</button>
    </div>` : ''}`;
  sectionEl.setAttribute('aria-labelledby', `${section.id}-title`);
  sectionEl.classList.toggle('is-hidden-section', ctx.editMode && !publicVisible);
}

/** Orders sections, hides empty/hidden ones from visitors, and alternates backgrounds. */
function applySections(state, ctx) {
  const main = $('#main');
  const navSections = [];
  let number = 0;
  let alt = false;
  state.sections.forEach((section) => {
    const el = document.getElementById(section.id);
    if (!el) return;
    main.appendChild(el);
    const hasContent = sectionHasContent(section.id, state);
    const publicVisible = section.visible && hasContent;
    el.hidden = !publicVisible && !ctx.editMode;
    // Always re-render the head so edit controls never linger in a section that is now hidden.
    if (!el.hidden) {
      number += 1;
      el.classList.toggle('section-alt', alt);
      alt = !alt;
    }
    if (publicVisible) navSections.push(section);
    renderSectionHead(el, section, number, ctx, { publicVisible, hasContent });
  });
  return navSections;
}

function renderChrome(state) {
  const p = state.profile;
  const resume = resumeHref(p);
  const fileName = p.resumeFileName || 'Resume.pdf';
  $$('[data-profile="name"]').forEach((el) => { el.textContent = p.name; });
  $$('[data-profile="title"]').forEach((el) => { el.textContent = p.title; });
  $$('.header-resume').forEach((link) => {
    link.hidden = !resume;
    if (resume) {
      link.href = resume;
      link.download = fileName;
    }
  });
  $('#footer-year').textContent = String(new Date().getFullYear());
  $('#footer-links').innerHTML = socialLinks(p);
  return { resume, fileName };
}

function setupReveal(instant) {
  const elements = $$('.reveal:not(.is-visible)');
  if (instant || prefersReducedMotion() || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  elements.forEach((el) => revealObserver.observe(el));
}

function renderAll() {
  const state = getState();
  const ctx = { editMode: isEditMode() };
  document.body.classList.toggle('edit-mode', ctx.editMode);

  const navSections = applySections(state, ctx);
  renderHero(state, ctx);
  renderAbout(state, ctx);
  renderExperience(state, ctx);
  renderProjects(state, ctx);
  renderSkills(state, ctx);
  renderEducation(state, ctx);
  renderCertifications(state, ctx);
  renderAchievements(state, ctx);
  renderContactInfo(state);
  const { resume, fileName } = renderChrome(state);
  renderNav(navSections, resume, fileName);
  renderAdminBar();

  setupReveal(!firstRender);
  firstRender = false;
}

function showLoadError(error) {
  const fromDisk = window.location.protocol === 'file:';
  const message = fromDisk
    ? 'This page was opened directly from disk, and browsers block loading <code>data/portfolio.json</code> from <code>file://</code> pages. Start a local web server in the project folder (for example <code>python -m http.server 8080</code>) and open <code>http://localhost:8080</code>, or deploy the site to Netlify.'
    : `${esc(error.message)} Please refresh the page.`;
  $('#hero-root').insertAdjacentHTML('beforeend', `<div class="load-error" role="alert"><h2>The portfolio content couldn't be loaded</h2><p>${message}</p></div>`);
  $$('#main > section').forEach((section) => {
    if (section.id !== 'home' && section.id !== 'contact') section.hidden = true;
  });
}

async function boot() {
  initTheme();
  initNavigation();
  initContactForm();

  try {
    await loadPortfolio();
  } catch (error) {
    showLoadError(error);
    return;
  }

  document.documentElement.classList.add('js-reveal');
  initProjects();
  initCertifications();
  initAdmin({ onToggle: renderAll });
  subscribe(renderAll);
  renderAll();

  // Content is rendered after load, so honour a #section link once it exists.
  // Jump instantly (CSS smooth scrolling can stall during load), then re-align once web
  // fonts have settled the layout — unless the visitor has scrolled in the meantime.
  if (window.location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      const landedAt = window.scrollY;
      document.fonts?.ready.then(() => {
        if (Math.abs(window.scrollY - landedAt) < 2) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
  }
}

boot();

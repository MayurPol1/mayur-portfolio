/** Hero and About sections, plus profile-derived values shared by other modules. */

import { icon } from './icons.js';
import { chips } from './ui.js';
import { $, asArray, dataUrlToObjectUrl, esc, experienceYears, fillTokens, isDataUrl, safeUrl } from './utils.js';

/** Values available as {tokens} inside content strings. */
export function getTokens(state) {
  const companies = new Set(
    state.experience
      .filter((item) => item.visible !== false && item.company)
      .map((item) => item.company.trim().toLowerCase()),
  ).size;
  return {
    years: experienceYears(state.profile, state.experience),
    companies: String(companies),
    projects: String(state.projects.filter((p) => p.status !== 'draft').length),
  };
}

function yearsPhrase(years) {
  return /\+$|^\d+(\.\d+)?$/.test(years) ? `${years} years` : years;
}

/** Download URL for the resume; embedded (uploaded) PDFs become blob: URLs. */
export function resumeHref(profile) {
  const url = safeUrl(profile.resume);
  return isDataUrl(url) ? dataUrlToObjectUrl(url) : url;
}

export function socialLinks(profile, className = 'social-link') {
  return [
    profile.linkedin && { href: profile.linkedin, label: 'LinkedIn profile', icon: 'linkedin', external: true },
    profile.github && { href: profile.github, label: 'GitHub profile', icon: 'github', external: true },
    profile.email && { href: `mailto:${profile.email}`, label: `Email ${profile.email}`, icon: 'mail' },
  ]
    .filter(Boolean)
    .map((link) => `<a class="${className}" href="${esc(safeUrl(link.href))}" aria-label="${esc(link.label)}" title="${esc(link.label)}"${link.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(link.icon)}</a>`)
    .join('');
}

const SHORT_NAMES = {
  'ASP.NET Core MVC': 'ASP.NET Core',
  'ASP.NET Core Web API': 'ASP.NET Core',
  'Entity Framework Core': 'EF Core',
};

function codeCard(profile) {
  const stack = [...new Set(asArray(profile.heroSkills).map((s) => SHORT_NAMES[s] || s))]
    .filter((s) => s.length <= 14)
    .slice(0, 3);
  const str = (value) => `<span class="tok-str">"${esc(value)}"</span>`;
  const kw = (value) => `<span class="tok-kw">${value}</span>`;
  const type = (value) => `<span class="tok-type">${value}</span>`;
  const prop = (value) => `<span class="tok-prop">${value}</span>`;
  const lines = [
    `${kw('public sealed class')} ${type('Developer')}`,
    '{',
    `  ${kw('public')} ${type('string')} ${prop('Name')} => ${str(profile.name)};`,
    `  ${kw('public')} ${type('string')} ${prop('Role')} => ${str(profile.title)};`,
    `  ${kw('public')} ${type('string')}[] ${prop('Stack')} =>`,
    `    [${stack.map(str).join(', ')}];`,
    `  ${kw('public')} ${type('bool')} ${prop('OpenToWork')} => <span class="tok-bool">${profile.availability ? 'true' : 'false'}</span>;`,
    '}',
  ];
  return `
    <div class="code-card" aria-hidden="true">
      <div class="code-card-head"><span class="code-dots"><span></span><span></span><span></span></span><span class="code-file">Developer.cs</span></div>
      <pre class="code-body">${lines.join('\n')}</pre>
    </div>`;
}

export function renderHero(state, ctx) {
  const root = $('#hero-root');
  const p = state.profile;
  const tokens = getTokens(state);
  const roleParts = String(p.tagline || p.title || '').split('|').map((part) => part.trim()).filter(Boolean);
  const resume = resumeHref(p);
  const photo = safeUrl(p.photo);
  const stats = asArray(p.stats)
    .map((stat) => ({ value: fillTokens(stat.value, tokens), label: stat.label }))
    .filter((stat) => stat.value && stat.label && !/[{}]/.test(stat.value) && stat.value !== '0');

  root.innerHTML = `
    <div class="hero-grid">
      <div class="hero-copy">
        ${p.availability ? `<p class="hero-badge"><span class="pulse-dot" aria-hidden="true"></span>${esc(p.availability)}</p>` : ''}
        <h1 id="hero-title" class="hero-title"><span class="hero-greeting">Hi, I'm</span>${esc(p.name)}</h1>
        ${roleParts.length ? `<p class="hero-role">${roleParts.map((part) => `<span>${esc(part)}</span>`).join('<span class="sep" aria-hidden="true">/</span>')}</p>` : ''}
        ${p.headline ? `<p class="hero-headline">${esc(fillTokens(p.headline, tokens))}</p>` : ''}
        ${p.intro ? `<p class="hero-intro">${esc(fillTokens(p.intro, tokens))}</p>` : ''}
        ${p.heroSkills.length ? `<div><p class="hero-skills-label">Core stack</p>${chips(p.heroSkills, { className: 'chip-accent' })}</div>` : ''}
        <div class="hero-actions">
          <a class="btn btn-primary" href="#projects">${icon('folder')}<span>View Projects</span></a>
          ${resume ? `<a class="btn btn-outline" href="${esc(resume)}" download="${esc(p.resumeFileName || 'Resume.pdf')}" data-resume-link>${icon('download')}<span>Download Resume</span></a>` : ''}
          <a class="btn btn-ghost" href="#contact">${icon('mail')}<span>Contact Me</span></a>
          ${ctx.editMode ? `<button type="button" class="admin-add" data-admin="profile">${icon('edit')}Edit profile</button>` : ''}
        </div>
        <div class="hero-social">
          ${socialLinks(p)}
          ${p.location ? `<span class="social-divider" aria-hidden="true"></span><span class="social-text">${esc(p.location)}</span>` : ''}
        </div>
      </div>
      ${photo ? `
      <div class="hero-visual">
        <div class="profile-frame">
          <img class="profile-photo" src="${esc(photo)}" alt="${esc(p.photoAlt || `Portrait of ${p.name}`)}" width="480" height="560" fetchpriority="high" decoding="async">
        </div>
        ${codeCard(p)}
      </div>` : ''}
    </div>
    ${stats.length ? `
    <dl class="hero-stats reveal" style="--stat-cols:${Math.min(stats.length, 4)}">
      ${stats.map((stat) => `<div class="stat"><dt class="stat-label">${esc(stat.label)}</dt><dd class="stat-value">${esc(stat.value)}</dd></div>`).join('')}
    </dl>` : ''}`;
}

export function renderAbout(state, ctx) {
  const root = $('#about-root');
  const p = state.profile;
  const tokens = getTokens(state);
  const about = p.about || {};
  const current = state.experience.find((item) => item.current && item.visible !== false);
  const education = state.education.find((item) => item.visible !== false);
  const resume = resumeHref(p);

  const facts = [
    p.location && { icon: 'map-pin', label: 'Location', value: p.location },
    tokens.years && { icon: 'clock', label: 'Experience', value: `${yearsPhrase(tokens.years)} professional experience` },
    current && { icon: 'briefcase', label: 'Current role', value: `${current.designation} · ${current.company}` },
    p.title && { icon: 'code', label: 'Specialisation', value: p.title },
    education && { icon: 'graduation', label: 'Education', value: education.degree },
    p.email && { icon: 'mail', label: 'Email', value: p.email, href: `mailto:${p.email}` },
  ].filter(Boolean);

  const listBlock = (title, items, iconName) => (asArray(items).length ? `
    <div class="about-block">
      <h3>${esc(title)}</h3>
      <ul class="check-list">${items.map((item) => `<li>${icon(iconName)}<span>${esc(item)}</span></li>`).join('')}</ul>
    </div>` : '');

  root.innerHTML = `
    <div class="about-grid">
      <div class="about-text reveal">
        ${asArray(about.summary).map((para) => `<p>${esc(fillTokens(para, tokens))}</p>`).join('')}
        <div class="about-columns">
          ${listBlock('Areas of expertise', about.expertise, 'check')}
          ${listBlock('Career interests', about.interests, 'target')}
        </div>
        ${ctx.editMode ? `<div class="section-admin"><button type="button" class="admin-add" data-admin="profile">${icon('edit')}Edit about content</button></div>` : ''}
      </div>
      <aside class="about-card card reveal" aria-label="Quick facts">
        <h3>Quick facts</h3>
        <dl class="facts">
          ${facts.map((fact) => `
            <div class="fact">
              <span class="fact-icon" aria-hidden="true">${icon(fact.icon)}</span>
              <div><dt>${esc(fact.label)}</dt><dd>${fact.href ? `<a class="text-link" href="${esc(fact.href)}">${esc(fact.value)}</a>` : esc(fact.value)}</dd></div>
            </div>`).join('')}
        </dl>
        ${resume ? `<a class="btn btn-primary" href="${esc(resume)}" download="${esc(p.resumeFileName || 'Resume.pdf')}" data-resume-link>${icon('download')}<span>Download Resume</span></a>` : ''}
      </aside>
    </div>`;
}

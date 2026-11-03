// Runs before first paint (classic, blocking script in <head>):
// 1. Applies the saved theme so the page never flashes the wrong one (dark is the default).
// 2. Explains the blank page when index.html is opened from disk, where ES modules can't load.
(function () {
  try {
    var theme = localStorage.getItem('mp-portfolio:theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    /* Storage unavailable (private mode / blocked): keep the default dark theme. */
  }

  if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var note = document.createElement('div');
      note.className = 'load-error';
      note.setAttribute('role', 'alert');
      note.innerHTML = '<h2>Open this site through a web server</h2>' +
        '<p>Browsers block JavaScript modules and <code>data/portfolio.json</code> on <code>file://</code> pages. ' +
        'In the project folder run <code>python -m http.server 8080</code> and open <code>http://localhost:8080</code>, ' +
        'or deploy to Netlify. See README.md.</p>';
      var hero = document.getElementById('hero-root');
      if (hero) hero.appendChild(note);
    });
  }
})();

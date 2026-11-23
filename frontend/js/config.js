// When the page is served by the Express backend (http://localhost:5000) the API is same-origin.
// If you open the HTML with another dev server (e.g. VS Code Live Server on :5500), it calls the backend on :5000.
(function () {
  const sameOrigin = location.port === '5000' || (location.protocol !== 'file:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  const origin = sameOrigin ? location.origin : 'http://localhost:5000';
  window.HMS_CONFIG = { ORIGIN: origin, API_URL: origin + '/api' };
  // Path prefix from any page to the frontend root ("" for public pages, "../" for dashboards)
  window.ROOT = /\/(admin|doctor|patient)\/[^/]*$/.test(location.pathname) ? '../' : '';
})();

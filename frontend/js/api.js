(function () {
  const cfg = window.HMS_CONFIG;
  const tokenKey = 'hms_token', userKey = 'hms_user';

  window.Auth = {
    token() { return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey); },
    user() { try { return JSON.parse(localStorage.getItem(userKey) || sessionStorage.getItem(userKey) || 'null'); } catch (e) { return null; } },
    save(token, user, remember) {
      this.clear();
      const s = remember ? localStorage : sessionStorage;
      s.setItem(tokenKey, token); s.setItem(userKey, JSON.stringify(user));
    },
    updateUser(u) { const s = localStorage.getItem(tokenKey) ? localStorage : sessionStorage; s.setItem(userKey, JSON.stringify(u)); },
    clear() { [tokenKey, userKey].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); },
    home(role) { return window.ROOT + role + '/dashboard.html'; },
    logout() { this.clear(); location.href = window.ROOT + 'login.html'; },
    // Verifies the session with the server and that the role matches this section of the site.
    async require(role) {
      if (!this.token()) { location.replace(window.ROOT + 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search)); return null; }
      try {
        const u = (await API.get('/auth/me')).data;
        if (role && u.role !== role) { location.replace(this.home(u.role)); return null; }
        this.updateUser(u);
        return u;
      } catch (e) {
        if (e.status === 401) return null; // request() already redirects
        UI.toast(e.message, 'error');
        return null;
      }
    }
  };

  async function request(method, path, body) {
    const headers = {};
    const t = Auth.token();
    if (t) headers.Authorization = 'Bearer ' + t;
    const opts = { method, headers };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }

    let res;
    try { res = await fetch(cfg.API_URL + path, opts); }
    catch (e) { throw new Error('Cannot reach the server. Make sure the backend is running (npm start in the backend folder).'); }

    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (res.status === 401 && t && !path.startsWith('/auth/login')) {
      Auth.clear();
      location.href = window.ROOT + 'login.html?expired=1';
      throw Object.assign(new Error('Session expired.'), { status: 401 });
    }
    if (!res.ok) throw Object.assign(new Error((json && json.message) || 'Request failed (' + res.status + ')'), { status: res.status, errors: json && json.errors });
    return json;
  }

  const qs = (o) => {
    const p = new URLSearchParams();
    Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
    const s = p.toString();
    return s ? '?' + s : '';
  };

  window.API = {
    qs,
    get: (p, params) => request('GET', p + qs(params)),
    post: (p, b) => request('POST', p, b),
    put: (p, b) => request('PUT', p, b),
    del: (p) => request('DELETE', p)
  };
})();

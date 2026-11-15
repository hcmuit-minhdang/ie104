'use strict';
class Router {
  constructor() { this.routes = []; }
  add(method, pattern, handler, opts) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handler, opts: opts || {} });
  }
  get(p, h, o) { this.add('GET', p, h, o); }
  post(p, h, o) { this.add('POST', p, h, o); }
  put(p, h, o) { this.add('PUT', p, h, o); }
  patch(p, h, o) { this.add('PATCH', p, h, o); }
  delete(p, h, o) { this.add('DELETE', p, h, o); }
  match(method, pathname) {
    const methods = [];
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      if (r.method !== method) { methods.push(r.method); continue; }
      const params = {};
      for (let i = 0; i < r.keys.length; i++) {
        try { params[r.keys[i]] = decodeURIComponent(m[i + 1]); } catch (e) { return { badRequest: true }; }
      }
      return { route: r, params };
    }
    return methods.length ? { methods } : null;
  }
}
module.exports = { Router };

import { createApp } from 'vue';
import App from './App.vue';
import '../src/styles/catalog-virtual.css';

export function mountOneUpApp(selector = '#app') {
  const mountEl = document.querySelector(selector);
  if (!mountEl) return null;
  const app = createApp(App);
  app.mount(mountEl);
  window.__ONEUP_VUE_APP__ = app;
  return app;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountOneUpApp('#app'));
  } else {
    mountOneUpApp('#app');
  }
}

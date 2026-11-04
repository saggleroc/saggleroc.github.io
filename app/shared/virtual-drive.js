(function () {
  "use strict";

  const STORAGE_KEY = "fleethacker.virtual-drive.v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function persist(files) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }

  window.VirtualDrive = {
    write(name, content, type = "text/plain") {
      const files = load();
      files[name] = { name, content, type, savedAt: new Date().toISOString() };
      persist(files);
      return files[name];
    },

    read(name) {
      return load()[name] || null;
    },

    list() {
      return Object.values(load()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },

    remove(name) {
      const files = load();
      delete files[name];
      persist(files);
    },

    clear() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
})();

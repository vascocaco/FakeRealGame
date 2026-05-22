(() => {
  'use strict';

  const ORDER = ['extra-hint', '50-50', 'guilleai'];
  let activeTypes = [];
  let spentByType = {};

  function clampHelperCount(helperCount) {
    const value = Number(helperCount);
    if (!Number.isInteger(value)) {
      return 0;
    }
    return Math.max(0, Math.min(ORDER.length, value));
  }

  function init(helperCount) {
    reset();
    const count = clampHelperCount(helperCount);
    activeTypes = ORDER.slice(0, count);
    activeTypes.forEach((typeKey) => {
      spentByType[typeKey] = false;
    });
    return [...activeTypes];
  }

  function canActivate(typeKey) {
    return activeTypes.includes(typeKey) && !spentByType[typeKey];
  }

  function markSpent(typeKey) {
    if (!activeTypes.includes(typeKey)) {
      return;
    }
    spentByType[typeKey] = true;
  }

  function isSpent(typeKey) {
    return Boolean(spentByType[typeKey]);
  }

  function reset() {
    activeTypes = [];
    spentByType = {};
  }

  function getActiveTypes() {
    return [...activeTypes];
  }

  window.Helpers = {
    init,
    canActivate,
    markSpent,
    isSpent,
    reset,
    getActiveTypes
  };
})();

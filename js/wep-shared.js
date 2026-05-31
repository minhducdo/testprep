// Purchase state helpers — shared between index.html and exam.html

function getPurchasedBundles() {
  try { return JSON.parse(localStorage.getItem('wep_bundles') || '[]'); }
  catch { return []; }
}

function markBundlePurchased(bId) {
  const b = getPurchasedBundles();
  if (!b.includes(bId)) { b.push(bId); localStorage.setItem('wep_bundles', JSON.stringify(b)); }
}

function syncBundlesFromServer(bundleIds) {
  const local = getPurchasedBundles();
  let changed = false;
  bundleIds.forEach(bId => {
    if (!local.includes(bId)) { local.push(bId); changed = true; }
  });
  if (changed) localStorage.setItem('wep_bundles', JSON.stringify(local));
}

function isTestUnlocked(testId) {
  const [level, numStr] = testId.split('-');
  const num = parseInt(numStr, 10);
  const pack = num <= 10 ? 1 : 2;
  return getPurchasedBundles().includes(`${level}-pack${pack}`);
}

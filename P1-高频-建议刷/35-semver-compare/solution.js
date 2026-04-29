function compareVersions(v1, v2) {
  if (typeof v1 !== 'string' || typeof v2 !== 'string') {
    throw new TypeError('Arguments must be strings');
  }
  if (!v1 || !v2) {
    throw new Error('Version strings must not be empty');
  }

  const parseVersion = (version) => {
    const idx = version.indexOf('-');
    if (idx === -1) return { core: version, prerelease: null };
    return { core: version.slice(0, idx), prerelease: version.slice(idx + 1) };
  };

  const parseSegments = (core) => core.split('.').map(Number);

  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  const segments1 = parseSegments(parsed1.core);
  const segments2 = parseSegments(parsed2.core);

  const len = Math.max(segments1.length, segments2.length);
  for (let i = 0; i < len; i++) {
    const a = segments1[i] || 0;
    const b = segments2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  const pre1 = parsed1.prerelease;
  const pre2 = parsed2.prerelease;

  if (!pre1 && !pre2) return 0;
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;

  const preSegments1 = pre1.split('.');
  const preSegments2 = pre2.split('.');
  const preLen = Math.max(preSegments1.length, preSegments2.length);

  for (let i = 0; i < preLen; i++) {
    const s1 = preSegments1[i];
    const s2 = preSegments2[i];

    if (s1 === undefined) return -1;
    if (s2 === undefined) return 1;

    const n1 = Number(s1);
    const n2 = Number(s2);

    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
      continue;
    }

    if (s1 > s2) return 1;
    if (s1 < s2) return -1;
  }

  return 0;
}

module.exports = { compareVersions };

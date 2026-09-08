(function () {
  'use strict';

  const AUTH_SESSION_KEY = 'webmap_offre_soin_auth_v1';
  const AUTH_FAIL_KEY = 'webmap_offre_soin_fail_v1';
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60 * 1000;

  // Les mots de passe ne sont pas stockés en clair : comparaison par SHA-256 salé.
  const PROFILES = {
    director: {
      label: 'Directeur',
      salt: '09755be724ceadd2d139c585',
      hash: 'c7f4b74bd19483532cb19d3105e564c5f7fb1d87292a5645a8c6013a174f54dc'
    },
    supervisors: {
      label: 'Superviseurs',
      salt: 'a624eb36b6b2ec4add0e392f',
      hash: 'e26461348d97dfb11cc61a65c5f76701bf4a54ad6206becc4fb7a7f3f4d51d5d'
    },
    technician: {
      label: 'Technicien',
      salt: '2e5ffb0c70dab4828c779bfd',
      hash: '9910c8f5f9a80e630e5e9f1fe698700ee2a3df686e1c1652653dff9c90dffe6f'
    },
    users: {
      label: 'Utilisateurs',
      salt: 'b0cae73e84a6781b052266db',
      hash: 'a32b6a80fe285d0dd7e73fbbbb4b2c12cceacdb9cb1bd8a1f713137674d4007c'
    }
  };

  // SHA-256 pur JavaScript, compatible également avec une ouverture locale en file://.
  function sha256(ascii) {
    function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = sha256.h = sha256.h || [];
    const k = sha256.k = sha256.k || [];
    let primeCounter = k[lengthProperty];
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) throw new Error('SHA-256 ne supporte que les chaînes ASCII dans ce module.');
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        let w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  const gate = document.getElementById('authGate');
  const form = document.getElementById('authForm');
  const profileEl = document.getElementById('authProfile');
  const passwordEl = document.getElementById('authPassword');
  const messageEl = document.getElementById('authMessage');
  const submitEl = document.getElementById('authSubmit');
  const currentProfileEl = document.getElementById('currentProfile');
  const logoutBtn = document.getElementById('logoutBtn');
  const togglePasswordBtn = document.getElementById('togglePassword');
  let lockTimer = null;

  function readFailState() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_FAIL_KEY) || '{"count":0,"lockedUntil":0}'); }
    catch (_) { return { count: 0, lockedUntil: 0 }; }
  }

  function writeFailState(state) {
    sessionStorage.setItem(AUTH_FAIL_KEY, JSON.stringify(state));
  }

  function resetFailures() {
    sessionStorage.removeItem(AUTH_FAIL_KEY);
    if (lockTimer) clearInterval(lockTimer);
    lockTimer = null;
    submitEl.disabled = false;
  }

  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = 'auth-message' + (type ? ' ' + type : '');
  }

  function updateLockState() {
    const state = readFailState();
    const remaining = state.lockedUntil - Date.now();
    if (remaining > 0) {
      submitEl.disabled = true;
      setMessage('Trop de tentatives. Réessayez dans ' + Math.ceil(remaining / 1000) + ' s.', 'error');
      if (!lockTimer) {
        lockTimer = setInterval(updateLockState, 500);
      }
      return true;
    }
    if (state.lockedUntil) {
      resetFailures();
      setMessage('Vous pouvez vous reconnecter.', 'info');
    }
    return false;
  }

  function unlock(profileId) {
    const profile = PROFILES[profileId];
    if (!profile) return;
    document.body.classList.remove('auth-locked');
    gate.classList.add('authenticated');
    currentProfileEl.textContent = profile.label;
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ profile: profileId, startedAt: Date.now() }));
    } catch (_) {}
    resetFailures();
    passwordEl.value = '';
    setMessage('', '');
    setTimeout(function () {
      if (window.map && typeof window.map.updateSize === 'function') window.map.updateSize();
    }, 80);
  }

  function lock() {
    document.body.classList.add('auth-locked');
    gate.classList.remove('authenticated');
    currentProfileEl.textContent = '—';
    passwordEl.value = '';
    try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch (_) {}
    setTimeout(function () { passwordEl.focus(); }, 50);
  }

  function restoreSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null');
      if (session && PROFILES[session.profile]) {
        unlock(session.profile);
        return true;
      }
    } catch (_) {}
    lock();
    return false;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (updateLockState()) return;
    const profileId = profileEl.value;
    const profile = PROFILES[profileId];
    const password = passwordEl.value;
    if (!profile || !password) {
      setMessage('Sélectionnez un profil et saisissez le mot de passe.', 'error');
      return;
    }
    const candidateHash = sha256(profile.salt + ':' + password);
    if (candidateHash === profile.hash) {
      unlock(profileId);
      return;
    }
    const state = readFailState();
    state.count = (state.count || 0) + 1;
    if (state.count >= MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCK_MS;
      writeFailState(state);
      updateLockState();
    } else {
      writeFailState(state);
      const left = MAX_ATTEMPTS - state.count;
      setMessage('Mot de passe incorrect. ' + left + ' tentative' + (left > 1 ? 's' : '') + ' restante' + (left > 1 ? 's' : '') + '.', 'error');
      passwordEl.select();
    }
  });

  logoutBtn.addEventListener('click', function () {
    lock();
    setMessage('Session fermée. Identifiez-vous pour continuer.', 'info');
  });

  togglePasswordBtn.addEventListener('click', function () {
    const visible = passwordEl.type === 'text';
    passwordEl.type = visible ? 'password' : 'text';
    togglePasswordBtn.innerHTML = visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    togglePasswordBtn.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    passwordEl.focus();
  });

  profileEl.addEventListener('change', function () {
    setMessage('', '');
    passwordEl.focus();
  });

  updateLockState();
  restoreSession();
})();

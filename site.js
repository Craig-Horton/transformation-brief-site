(function () {
  // Same shape the server checks, so a bad address is caught here with a clear message.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Where the sign-up came from: the page, an external referrer host and any UTM tags.
  // Read from the current page only, nothing is stored on the visitor's device.
  function attribution() {
    var out = { path: location.pathname.slice(0, 200) };
    try {
      if (document.referrer) {
        var ref = new URL(document.referrer);
        if (ref.host !== location.host) out.referrer = ref.host.slice(0, 200);
      }
    } catch (_) {}
    try {
      var query = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
        var value = query.get(key);
        if (value) out[key] = value.slice(0, 100);
      });
    } catch (_) {}
    return out;
  }

  function track(source) {
    try {
      if (typeof window.va === 'function') {
        window.va('event', { name: 'Subscribe', data: { source: source } });
      }
    } catch (_) {}
  }

  var forms = document.querySelectorAll('form.subscribe-form');
  Array.prototype.forEach.call(forms, function (form) {
    var status = document.getElementById(form.getAttribute('data-status'));
    var button = form.querySelector('button[type="submit"]');
    var emailIn = form.querySelector('input[name="email"]');
    if (!status || !button || !emailIn) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = (emailIn.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        status.textContent = 'That email looks off, give it another try.';
        emailIn.focus();
        return;
      }
      var source = form.dataset.source || 'web';
      var payload = attribution();
      payload.email = email;
      payload.source = source;

      button.disabled = true;
      status.textContent = 'Saving...';
      try {
        var resp = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          status.textContent = 'You are on the list. The next Friday Brief lands in your inbox.';
          form.reset();
          track(source);
        } else if (resp.status === 400) {
          status.textContent = 'That email looks off, give it another try.';
        } else if (resp.status === 429) {
          status.textContent = 'Give it a minute and try again.';
        } else {
          status.textContent = 'Could not save right now. Give it a minute and try again.';
        }
      } catch (_) {
        status.textContent = 'Could not reach the server. Give it a minute and try again.';
      } finally {
        button.disabled = false;
      }
    });
  });
})();

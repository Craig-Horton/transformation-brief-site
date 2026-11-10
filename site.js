(function () {
  var forms = document.querySelectorAll('form.subscribe-form');
  Array.prototype.forEach.call(forms, function (form) {
    var status = document.getElementById(form.getAttribute('data-status'));
    var button = form.querySelector('button[type="submit"]');
    var emailIn = form.querySelector('input[name="email"]');
    if (!status || !button || !emailIn) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = (emailIn.value || '').trim();
      if (!email || email.indexOf('@') < 1) {
        status.textContent = 'That email looks off, give it another try.';
        return;
      }
      button.disabled = true;
      status.textContent = 'Saving...';
      try {
        var resp = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, source: form.dataset.source || 'web' })
        });
        if (resp.ok) {
          status.textContent = 'You are on the list. The next Friday Brief lands in your inbox.';
          form.reset();
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

const copyStatus = document.getElementById('copy-status');
let statusTimeout;

function showCopyStatus(message) {
  window.clearTimeout(statusTimeout);
  copyStatus.textContent = message;
  copyStatus.classList.add('visible');
  statusTimeout = window.setTimeout(() => copyStatus.classList.remove('visible'), 3500);
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const content = target.textContent.trim();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      showCopyStatus(button.dataset.copy === 'agent-prompt' ? 'Copied! Your robot friend has a mission.' : 'Copied! Let the little movie adventure begin.');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      target.scrollIntoView({ block: 'center' });
      showCopyStatus('Text selected. Press ⌘C on Mac or Ctrl+C to copy.');
    }
  });
}

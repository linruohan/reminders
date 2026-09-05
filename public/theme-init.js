(function () {
  try {
    if (localStorage.getItem('reminders-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();

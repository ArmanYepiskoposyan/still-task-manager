// Apply the saved theme before the application and its stylesheet load.
// Keep the key and allowed values aligned with src/app/useTheme.ts.
;(() => {
  let preference = 'system'
  try {
    preference = localStorage.getItem('still.theme') || 'system'
  } catch {
    /* System preference works without storage. */
  }
  document.documentElement.dataset.theme =
    preference === 'light' || preference === 'dark'
      ? preference
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
})()

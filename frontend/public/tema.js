try {
  const savedTheme = localStorage.getItem('time00-theme');
  const theme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.colorMode = theme;
} catch {
  // O React aplica o tema do sistema quando o armazenamento está indisponível.
}

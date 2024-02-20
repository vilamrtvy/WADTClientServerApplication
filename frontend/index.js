import App from './components/App';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  await app.init();
});

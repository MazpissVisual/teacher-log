import { render } from 'preact';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/plus-jakarta-sans';
import './styles.css';
import './app.css';
import { App } from './App';
import { initAuth } from './auth';
import { initPWA } from './pwa';

initAuth();
initPWA();

render(<App />, document.getElementById('app')!);

import { render } from 'preact';
import '@fontsource-variable/host-grotesk';
import '@fontsource-variable/instrument-sans';
import './styles.css';
import { App } from './App';
import { initAuth } from './auth';
import { initPWA } from './pwa';

initAuth();
initPWA();

render(<App />, document.getElementById('app')!);

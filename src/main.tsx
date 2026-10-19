import { render } from 'preact';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/lora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { App } from './App';
import { initAuth } from './auth';
import { initPWA } from './pwa';
import { startReminders } from './notify';

initAuth();
initPWA();
startReminders();

render(<App />, document.getElementById('app')!);

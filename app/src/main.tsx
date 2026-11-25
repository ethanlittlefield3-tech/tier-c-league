import { render } from 'preact';
import { App } from './app.tsx';
import './theme.css';

render(<App />, document.getElementById('app') as HTMLElement);

import { PlayerBadge } from '../art/PlayerBadge.tsx';
import type { Me } from '../data/identity.ts';
import { initialOf } from '../join/name.ts';
import './home.css';

/**
 * A stand-in for the app itself, shown once a player is in their league. The
 * Today screen replaces this next.
 */
export function Home(props: { me: Me }) {
  return (
    <main class="screen home">
      <div class="screen-body">
        <PlayerBadge class="home-badge" initial={initialOf(props.me.displayName)} />
        <h1>You're in, {props.me.displayName}.</h1>
        <p class="lead">
          <strong>{props.me.leagueName}</strong>
        </p>
        <p class="fine-print">The Today screen is the next thing being built.</p>
      </div>
    </main>
  );
}

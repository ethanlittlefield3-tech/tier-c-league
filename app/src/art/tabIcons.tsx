// The five tab icons, drawn for this app. They share one line weight and
// corner style, so they read as a set at 26 pixels.

export type Tab = 'today' | 'feed' | 'league' | 'garage' | 'telemetry';

const line = {
  class: 'tab-icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
} as const;

/** Game Day (Today and Match together): a ball on its way, with speed lines. */
function TodayIcon() {
  return (
    <svg {...line}>
      <circle cx="14.5" cy="12" r="7" />
      <path d="M14.5 9.2l2.6 1.9-1 3.1h-3.2l-1-3.1Z" />
      <path d="M14.5 5v4.2M21.3 10.4l-4.2.7M18.6 17.6l-2.5-3.4M10.4 17.6l2.5-3.4M7.7 10.4l4.2.7" />
      <path d="M2.5 9.5h2.5M1.5 12.5h3M2.5 15.5h2.5" />
    </svg>
  );
}

/** Feed: a speech bubble with two lines of talk. */
function FeedIcon() {
  return (
    <svg {...line}>
      <path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5h-6.5L7 20.5V17H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5Z" />
      <path d="M8 9.2h8M8 12.4h5" />
    </svg>
  );
}

/** League: a trophy. */
function LeagueIcon() {
  return (
    <svg {...line}>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z" />
      <path d="M7.5 6H5a2.5 2.5 0 0 0 2.6 4.4M16.5 6H19a2.5 2.5 0 0 1-2.6 4.4" />
      <path d="M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5Z" />
    </svg>
  );
}

/** Garage: a car, side on. */
function GarageIcon() {
  return (
    <svg {...line}>
      <path d="M3 15.5V13l2.3-4.3A2 2 0 0 1 7.1 7.6h7.7a2 2 0 0 1 1.6.8l2.9 3.8 1.2.6a1 1 0 0 1 .5.9v1.8a1 1 0 0 1-1 1h-1" />
      <path d="M5 16.5H4a1 1 0 0 1-1-1M10.2 16.5h3.6" />
      <circle cx="7.6" cy="16.5" r="2.1" />
      <circle cx="16.4" cy="16.5" r="2.1" />
      <path d="M6.6 11.8h11" />
    </svg>
  );
}

/** Telemetry: a boost gauge, its needle well up. */
function TelemetryIcon() {
  return (
    <svg {...line}>
      <path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0" />
      <path d="M12 14l4.2-4.6" />
      <circle cx="12" cy="14.5" r="1.4" />
      <path d="M7 9.7l.9.9M12 6.8v1.3M17 9.7l-.9.9" />
    </svg>
  );
}

export const TAB_ICONS: Record<Tab, () => preact.JSX.Element> = {
  today: TodayIcon,
  feed: FeedIcon,
  league: LeagueIcon,
  garage: GarageIcon,
  telemetry: TelemetryIcon,
};

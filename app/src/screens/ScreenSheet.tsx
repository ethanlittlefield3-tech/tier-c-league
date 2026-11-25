import { useEffect, useRef, useState } from 'preact/hooks';
import { screenPoints } from '@tcl/engine';
import { SCREEN_MAX, formatScreen, formatScreenShort, pointsChip, scaleRowOf, screenScale } from '../today/model.ts';
import './sheet.css';

/** The slider covers 0 to 10 hours. The buttons go on to 24. */
const SLIDER_MAX = 600;

/**
 * The screen-time sheet: it opens over Today when the screen-time card is
 * tapped. The number changes here first, and is saved only with "Save screen
 * time". The commish's mockup set the look.
 */
export function ScreenSheet(props: {
  /** "Wed Nov 25". */
  dateLabel: string;
  minutes: number | null;
  par: number;
  editable: boolean;
  onSave: (minutes: number | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(props.minutes ?? 0);
  const title = useRef<HTMLHeadingElement>(null);
  const points = screenPoints(draft, props.par);
  const row = scaleRowOf(draft);
  const where = /Android/.test(navigator.userAgent) ? 'Digital Wellbeing' : 'iPhone Screen Time';

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const step = (delta: number) => setDraft((before) => Math.min(SCREEN_MAX, Math.max(0, before + delta)));

  return (
    <div class="sheet-layer">
      <div class="sheet-backdrop" onClick={props.onClose} />
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 id="sheet-title" ref={title} tabIndex={-1}>
          Unproductive screen time
        </h2>
        <p class="sheet-lead">
          {props.dateLabel}. Add up Social, Entertainment and Games in {where}.
        </p>

        <p class="sheet-value" aria-live="polite">
          <span>{formatScreenShort(draft)}</span>
          <span class="sheet-chip" data-sign={points > 0 ? 'up' : points < 0 ? 'down' : 'zero'}>
            {pointsChip(points)}
          </span>
        </p>

        <input
          class="sheet-slider"
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={15}
          value={Math.min(SLIDER_MAX, draft)}
          aria-label="Screen time"
          aria-valuetext={formatScreen(draft)}
          disabled={!props.editable}
          onInput={(event) => setDraft(Number(event.currentTarget.value))}
        />

        <div class="sheet-steps">
          <button type="button" aria-label="1 hour less" disabled={!props.editable || draft === 0} onClick={() => step(-60)}>
            {'−'}1 h
          </button>
          <button type="button" aria-label="15 minutes less" disabled={!props.editable || draft === 0} onClick={() => step(-15)}>
            {'−'}15 m
          </button>
          <button type="button" aria-label="15 minutes more" disabled={!props.editable || draft >= SCREEN_MAX} onClick={() => step(15)}>
            +15 m
          </button>
          <button type="button" aria-label="1 hour more" disabled={!props.editable || draft >= SCREEN_MAX} onClick={() => step(60)}>
            +1 h
          </button>
        </div>

        <ul class="sheet-scale" aria-label={`Points at par ${props.par}`}>
          {screenScale(props.par).map((line, index) => (
            <li aria-current={index === row ? 'true' : undefined}>
              <span>{line.label}</span>
              <span>{line.points}</span>
            </li>
          ))}
        </ul>

        {props.editable ? (
          <>
            <button type="button" class="sheet-save" onClick={() => props.onSave(draft)}>
              Save screen time
            </button>
            {props.minutes !== null && (
              <button type="button" class="sheet-other" onClick={() => props.onSave(null)}>
                Clear it
              </button>
            )}
          </>
        ) : (
          <p class="sheet-lead">This day is locked, so its screen time is final.</p>
        )}
        <button type="button" class="sheet-other" onClick={props.onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

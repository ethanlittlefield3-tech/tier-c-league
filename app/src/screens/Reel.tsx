import { useEffect, useRef, useState } from 'preact/hooks';
import { drawReel, type ReelCard } from '../reel/card.ts';
import './reel.css';

/**
 * A week's highlight reel (SCOPE.md, "Highlight reel"): the card as a
 * picture, and Share, which hands it to the phone's share sheet for the
 * group chat. Where a picture can't be shared, the same card goes as words,
 * or the picture is saved.
 */
export function Reel(props: { card: ReelCard; onClose: () => void }) {
  const [picture, setPicture] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const title = `Week ${props.card.week} highlights`;

  useEffect(() => {
    let live = true;
    let url: string | null = null;
    drawReel(props.card).then(
      (blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setPicture({ blob, url });
      },
      () => live && setNote('The card could not be drawn on this phone.'),
    );
    close.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const share = async () => {
    if (!picture) return;
    const file = new File([picture.blob], `tier-c-week-${props.card.week}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else if (navigator.share) {
        await navigator.share({ title, text: props.card.text });
      } else {
        const link = document.createElement('a');
        link.href = picture.url;
        link.download = file.name;
        link.click();
        setNote('Saved the picture. Send it to the group chat from your photos.');
      }
    } catch (failure) {
      // Closing the share sheet is not a failure.
      if ((failure as { name?: string }).name !== 'AbortError') setNote('Sharing did not work here. Try saving the picture instead.');
    }
  };

  return (
    <div class="reel" role="dialog" aria-modal="true" aria-labelledby="reel-title">
      <div class="reel-sheet">
        <h2 id="reel-title">{title}</h2>
        <div class="reel-card">
          {picture ? <img src={picture.url} alt={props.card.text} width={1080} height={1350} /> : <div class="waiting-ring" aria-label="Drawing the card" />}
        </div>
        {note && (
          <p class="fine-print" role="status">
            {note}
          </p>
        )}
        <button type="button" class="btn" disabled={!picture} onClick={() => void share()}>
          Share
        </button>
        <button ref={close} type="button" class="btn btn-second reel-close" onClick={props.onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

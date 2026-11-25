// Small pieces the screens share: a heading that takes the focus, a Back
// button, and a text field with its label, help and error.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/** A screen's heading takes the focus when it appears, so a screen reader says where you are. */
export function Heading(props: { children: ComponentChildren }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <h1 ref={heading} tabIndex={-1}>
      {props.children}
    </h1>
  );
}

export function Back(props: { onBack: () => void }) {
  return (
    <button class="back" type="button" onClick={props.onBack}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10 3 5 8l5 5" />
      </svg>
      Back
    </button>
  );
}

/** One text field with its label, a line of help, and room for what went wrong. */
export function Field(props: {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  help?: string;
  error?: string | null;
  code?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  /** Keep the label for screen readers only, when a heading right above already says it. */
  hideLabel?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (props.autoFocus) input.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div class="field">
      <label for={props.id} class={props.hideLabel ? 'sr-only' : undefined}>
        {props.label}
      </label>
      <input
        ref={input}
        id={props.id}
        class={props.code ? 'field-code' : undefined}
        type="text"
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        autocomplete="off"
        autocorrect="off"
        autocapitalize={props.code ? 'characters' : 'words'}
        spellcheck={false}
        enterkeyhint="go"
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={`${props.id}-notes`}
      />
      <div id={`${props.id}-notes`}>
        {props.error ? (
          <p class="field-error" role="alert">
            {props.error}
          </p>
        ) : (
          props.help && <p class="field-help">{props.help}</p>
        )}
      </div>
    </div>
  );
}

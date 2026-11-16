import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { HtmlPresentation } from './content';

interface PresentationSessionState {
  presentationId: string;
  index: number;
  syncAvailable: boolean;
}

function isSlideIndex(index: number, total: number): boolean {
  return Number.isSafeInteger(index) && index >= 0 && index < total;
}

function storedSlideIndex(value: string | null, total: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  return isSlideIndex(index, total) ? index : null;
}

function readSession(presentationId: string, key: string, total: number, initialIndex?: number): PresentationSessionState {
  try {
    return {
      presentationId,
      index: initialIndex ?? storedSlideIndex(window.localStorage.getItem(key), total) ?? 0,
      syncAvailable: true,
    };
  } catch {
    return { presentationId, index: initialIndex ?? 0, syncAvailable: false };
  }
}

/** The selected slide is shared only by same-origin windows in this browser. */
export function usePresentationSession(presentation: HtmlPresentation, initialIndex?: number) {
  const { id, slides } = presentation;
  const total = slides.length;
  const key = `eneo:presentation:${encodeURIComponent(id)}:slide`;
  const requestedIndex = initialIndex !== undefined && isSlideIndex(initialIndex, total) ? initialIndex : undefined;
  const [state, setState] = useState(() => readSession(id, key, total, requestedIndex));

  const select = useCallback((index: number) => {
    if (!isSlideIndex(index, total)) return;
    let syncAvailable = true;
    try {
      window.localStorage.setItem(key, String(index));
    } catch {
      syncAvailable = false;
    }
    setState({ presentationId: id, index, syncAvailable });
  }, [id, key, total]);

  useEffect(() => {
    if (requestedIndex !== undefined) select(requestedIndex);
    else setState(readSession(id, key, total));

    function receiveSlide(event: StorageEvent) {
      if (event.key !== key || event.newValue === null) return;
      try {
        if (event.storageArea !== window.localStorage) return;
      } catch {
        setState(current => ({ ...current, syncAvailable: false }));
        return;
      }
      const index = storedSlideIndex(event.newValue, total);
      if (index !== null) setState({ presentationId: id, index, syncAvailable: true });
    }

    window.addEventListener('storage', receiveSlide);
    return () => window.removeEventListener('storage', receiveSlide);
  }, [id, key, total, requestedIndex, select]);

  return {
    index: state.presentationId === id && isSlideIndex(state.index, total) ? state.index : 0,
    select,
    syncAvailable: state.syncAvailable,
  };
}

export function useSlideKeyboard({ index, total, onSelect }: {
  index: number;
  total: number;
  onSelect: (index: number) => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && (
        event.target.isContentEditable || event.target.closest('input, textarea, select, [role="textbox"]')
      )) return;

      const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null;
      if (next !== null && isSlideIndex(next, total)) {
        event.preventDefault();
        onSelect(next);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, total, onSelect]);
}

export function usePresentationFullscreen(): {
  ref: RefObject<HTMLDivElement | null>;
  fullscreen: boolean;
  supported: boolean;
  error: string;
  toggle: () => Promise<void>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const frame = ref.current;
    setSupported(Boolean(document.fullscreenEnabled && frame?.requestFullscreen && document.exitFullscreen));
    const update = () => setFullscreen(document.fullscreenElement === frame);
    const reportError = () => setError('Helskärm kunde inte öppnas. Fortsätt här eller försök igen med knappen Helskärm.');
    update();
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('fullscreenerror', reportError);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('fullscreenerror', reportError);
      if (document.fullscreenElement === frame) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  const toggle = useCallback(async () => {
    setError('');
    const frame = ref.current;
    if (!frame || !document.fullscreenEnabled || !frame.requestFullscreen) {
      setError('Webbläsaren stöder inte helskärm här. Presentationen går fortfarande att visa och bläddra i.');
      return;
    }
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch {
      setError('Helskärm kunde inte öppnas. Fortsätt här eller försök igen med knappen Helskärm.');
    }
  }, []);

  return { ref, fullscreen, supported, error, toggle };
}

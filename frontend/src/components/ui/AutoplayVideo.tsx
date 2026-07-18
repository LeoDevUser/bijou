import { useCallback, useEffect, useState } from 'react';
import { optimizedVideoUrl, videoPosterUrl } from '../../utils/cloudinary';

type Props = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> & { src: string };

/**
 * A muted looping inline video that reliably autoplays on iOS WebKit
 * (Safari and every iOS browser, including Chrome).
 *
 * React only sets `muted` as a JS property, but WebKit's autoplay policy
 * checks the DOM attribute — the ref sets it and starts playback explicitly.
 *
 * When playback is refused outright (iOS Low Power Mode, Data Saver), the
 * component renders the poster as a plain <img> instead — WebKit stamps a
 * non-removable play glyph on paused videos, but it can't do that to an
 * image. The first tap anywhere counts as a user gesture, so it remounts
 * the video and plays. Both states render one element with the same props,
 * so swapping never disturbs layout.
 */
export default function AutoplayVideo({ src, ...rest }: Props) {
  const [blocked, setBlocked] = useState(false);
  const poster = videoPosterUrl(src);

  const attach = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute('muted', '');
    let unmounted = false;
    const tryPlay = () => {
      el.play().catch((e: unknown) => {
        // NotAllowedError = autoplay policy refusal; AbortError etc. are not.
        if (!unmounted && e instanceof DOMException && e.name === 'NotAllowedError') {
          setBlocked(true);
        }
      });
    };
    el.addEventListener('loadeddata', tryPlay, { once: true });
    tryPlay();
    return () => {
      unmounted = true;
      el.removeEventListener('loadeddata', tryPlay);
    };
  }, []);

  // While blocked, any tap or click is a user gesture: remount the video —
  // React flushes discrete events synchronously, so the ref's play() call
  // still runs inside the gesture's activation window.
  useEffect(() => {
    if (!blocked || !poster) return;
    const onGesture = () => setBlocked(false);
    window.addEventListener('touchend', onGesture, { passive: true });
    window.addEventListener('click', onGesture);
    return () => {
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('click', onGesture);
    };
  }, [blocked, poster]);

  if (blocked && poster) {
    return (
      <img
        src={poster}
        alt=""
        className={rest.className}
        onClick={rest.onClick as unknown as React.MouseEventHandler<HTMLImageElement>}
      />
    );
  }

  return (
    <video
      ref={attach}
      src={optimizedVideoUrl(src)}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      {...rest}
    />
  );
}

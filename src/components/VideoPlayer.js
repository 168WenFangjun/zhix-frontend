import { useRef, useEffect, useCallback } from 'react';
import { Engine, MSE_CAPABLE, probeStream } from './VideoEngine';

/**
 * useVideoPlayer
 *
 * 封装视频 MSE 分片播放的全部逻辑。
 *
 * @param {string}   src                 视频 URL
 * @param {string}   id                  卡片唯一 ID
 * @param {Function} onVisibilityChange  (id, isVisible) => void
 * @param {Function} onReady             视频首帧就绪回调
 * @returns {{ videoRef, boxRef }}
 */
export function useVideoPlayer({ src, id, onVisibilityChange, onReady }) {
  const videoRef = useRef(null);
  const boxRef   = useRef(null);
  const engRef   = useRef(null);
  const modeRef  = useRef(null); // null=probing, true=MSE, false=native

  // ── Probe + bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;

    let dead = false;

    const bootstrap = async () => {
      const useMSE = MSE_CAPABLE && await probeStream(src);
      if (dead) return;
      modeRef.current = useMSE;

      if (useMSE) {
        const eng = new Engine(video, src);
        engRef.current = eng;

        const onErr  = () => { if (dead) return; eng.destroy(); engRef.current = null; modeRef.current = false; video.src = src; video.play().catch(() => {}); };
        const onTime = () => eng.onTime();
        const onSeek = () => eng.onSeek();

        video.addEventListener('error',      onErr,  { once: true });
        video.addEventListener('timeupdate', onTime);
        video.addEventListener('seeking',    onSeek);

        await eng.start();
        if (dead) return;
        onReady?.();
        video.play().catch(() => {});
      } else {
        video.src = src;
        video.addEventListener('canplay', () => { if (!dead) onReady?.(); }, { once: true });
        video.play().catch(() => {});
      }
    };

    bootstrap().catch(e => { if (!dead) console.warn('[VideoPlayer] bootstrap', e); });

    return () => {
      dead = true;
      if (engRef.current) { engRef.current.destroy(); engRef.current = null; }
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ── Intersection Observer ──────────────────────────────────────────────────
  const handleVisibility = useCallback(
    ([entry]) => onVisibilityChange?.(id, entry.isIntersecting && entry.intersectionRatio > 0.5),
    [id, onVisibilityChange]
  );

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleVisibility, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleVisibility]);

  return { videoRef, boxRef };
}

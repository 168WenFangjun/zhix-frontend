import { useRef, useEffect } from 'react';
import { AudioEngine, AUDIO_MSE_CAPABLE } from './AudioEngine';

// ── Global singleton：同一时刻只允许一路音频播放 ──────────────────────────────
let _active = null; // { audioEl }

export function stopGlobalAudio() {
  if (!_active) return;
  _active.audioEl.pause();
  _active = null;
}

/**
 * useAudioPlayer
 * @returns {{ audioRef, syncPromiseRef }}
 *   syncPromiseRef.current — 最新的 Promise<HTMLAudioElement>，resolve 时音频已 canplay
 */
export function useAudioPlayer({ audioSrc, isActive }) {
  const audioRef        = useRef(null);
  const engRef          = useRef(null);
  // 稳定 ref，始终指向最新的 ready Promise
  const syncPromiseRef  = useRef(null);
  const resolveRef      = useRef(null);

  const _newPromise = () => {
    syncPromiseRef.current = new Promise(res => { resolveRef.current = res; });
  };

  // ── Bootstrap AudioEngine ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    _newPromise();

    if (AUDIO_MSE_CAPABLE) {
      const eng = new AudioEngine(audio, audioSrc);
      engRef.current = eng;
      const onTime = () => eng.onTime();
      audio.addEventListener('timeupdate', onTime);
      eng.start()
        .then(() => resolveRef.current?.(audio))
        .catch(() => {});
      return () => {
        audio.removeEventListener('timeupdate', onTime);
        eng.destroy();
        engRef.current = null;
        if (_active?.audioEl === audio) _active = null;
      };
    } else {
      audio.src = audioSrc;
      const onCanPlay = () => resolveRef.current?.(audio);
      audio.addEventListener('canplay', onCanPlay, { once: true });
      return () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (_active?.audioEl === audio) _active = null;
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  // ── isActive 控制播放 / 暂停（不负责 sync，sync 由 VideoAudioPlayer 处理）──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (!isActive) {
      if (_active?.audioEl === audio) {
        audio.pause();
        _active = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, audioSrc]);

  return { audioRef, syncPromiseRef };
}

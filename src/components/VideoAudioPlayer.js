import React, { useRef, useEffect } from 'react';
import { useVideoPlayer } from './VideoPlayer';
import { useAudioPlayer, stopGlobalAudio } from './AudioPlayer';
import { AUDIO_MSE_CAPABLE } from './AudioEngine';

// ── A/V Sync 常量 ─────────────────────────────────────────────────────────────
const DRIFT_HARD_S = 0.15;
const DRIFT_SOFT_S = 0.05;
const SYNC_TICK_MS = 250;

// ── A/V Sync 控制器 ───────────────────────────────────────────────────────────
class AVSync {
  constructor(video, audio) {
    this.v = video;
    this.a = audio;
    this._timer   = null;
    this._waiting = false;
    this._alive   = false;
  }

  start() {
    this._alive = true;
    this._timer = setInterval(() => this._tick(), SYNC_TICK_MS);
    this.v.addEventListener('seeked',  this._onSeeked);
    this.a.addEventListener('waiting', this._onAudioWaiting);
    this.v.addEventListener('waiting', this._onVideoWaiting);
  }

  stop() {
    this._alive = false;
    clearInterval(this._timer);
    this._timer = null;
    this.v.removeEventListener('seeked',  this._onSeeked);
    this.a.removeEventListener('waiting', this._onAudioWaiting);
    this.v.removeEventListener('waiting', this._onVideoWaiting);
  }

  _tick() {
    const { v, a } = this;
    if (!v || !a || v.paused || a.paused || this._waiting) return;
    const drift = v.currentTime - a.currentTime;
    if (Math.abs(drift) > DRIFT_HARD_S) {
      try { a.currentTime = v.currentTime; } catch {}
    } else if (Math.abs(drift) > DRIFT_SOFT_S) {
      try { a.playbackRate = drift > 0 ? 1.03 : 0.97; } catch {}
    } else {
      if (a.playbackRate !== 1.0) try { a.playbackRate = 1.0; } catch {}
    }
  }

  _onSeeked = () => {
    try { this.a.currentTime = this.v.currentTime; } catch {}
  };

  _onAudioWaiting = () => {
    if (this._waiting || !this._alive) return;
    this._waiting = true;
    this.v.pause();
    this.a.addEventListener('canplay', () => {
      if (!this._alive) { this._waiting = false; return; }
      this._waiting = false;
      try { this.a.currentTime = this.v.currentTime; } catch {}
      Promise.all([this.v.play(), this.a.play()]).catch(() => {});
    }, { once: true });
  };

  _onVideoWaiting = () => {
    if (this._waiting || !this._alive) return;
    this._waiting = true;
    this.a.pause();
    this.v.addEventListener('canplay', () => {
      if (!this._alive) { this._waiting = false; return; }
      this._waiting = false;
      try { this.a.currentTime = this.v.currentTime; } catch {}
      Promise.all([this.v.play(), this.a.play()]).catch(() => {});
    }, { once: true });
  };
}

// ── 组件 ──────────────────────────────────────────────────────────────────────
const VideoAudioPlayer = ({ src, audioSrc, id, activeAudioId, onVisibilityChange }) => {
  const syncRef  = useRef(null);
  const isActive = activeAudioId === id;

  const { videoRef, boxRef } = useVideoPlayer({ src, id, onVisibilityChange });
  const { audioRef, syncPromiseRef } = useAudioPlayer({ audioSrc, isActive });

  // ── A/V Sync 启动 / 停止 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !audioSrc) {
      if (syncRef.current) { syncRef.current.stop(); syncRef.current = null; }
      return;
    }

    let cancelled = false;

    // 读 syncPromiseRef.current（最新 Promise，不受闭包旧值影响）
    syncPromiseRef.current.then(audioEl => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || !audioEl) return;

      stopGlobalAudio();
      try { audioEl.currentTime = video.currentTime; } catch {}

      const sync = new AVSync(video, audioEl);
      syncRef.current = sync;
      sync.start();
      audioEl.play().catch(() => {});
    }).catch(() => {});

    const audio = audioRef.current;
    return () => {
      cancelled = true;
      if (syncRef.current) { syncRef.current.stop(); syncRef.current = null; }
      if (audio) audio.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, audioSrc]);

  return (
    <div ref={boxRef} style={{ width: '100%', overflowAnchor: 'none' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      <audio
        ref={audioRef}
        loop
        preload={AUDIO_MSE_CAPABLE ? 'none' : 'auto'}
        {...(!AUDIO_MSE_CAPABLE && audioSrc && { src: audioSrc })}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex="-1"
      />
    </div>
  );
};

export default VideoAudioPlayer;

import { PREFETCH, BUF_AHEAD_S, BUF_BEHIND_S, fetchChunk, getContentLength } from './VideoEngine';

// ── Audio constants ───────────────────────────────────────────────────────────
export const AUDIO_CHUNK = 512 * 1024;

// Throttle interval for onTime() calls (ms) — avoids CPU waste on timeupdate
const PUMP_THROTTLE_MS = 250;

// Max retries for getContentLength HEAD request
const HEAD_RETRY = 3;
const HEAD_RETRY_BASE_MS = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const AUDIO_MIME_CANDIDATES = [
  'audio/mp4; codecs="mp4a.40.2"',
  'audio/mpeg',
  'audio/mp4',
];

const IS_FIREFOX = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

export const AUDIO_MIME = typeof MediaSource !== 'undefined'
  ? AUDIO_MIME_CANDIDATES.find(m => MediaSource.isTypeSupported(m)) || null
  : null;

export const AUDIO_MSE_CAPABLE = !IS_FIREFOX && AUDIO_MIME !== null;

// ── Audio MSE Engine ──────────────────────────────────────────────────────────
export class AudioEngine {
  constructor(audio, src) {
    this.audio      = audio;
    this.src        = src;
    this.ms         = new MediaSource();
    this.sb         = null;
    this.total      = 0;
    this.next       = 0;
    this.inflight   = 0;
    this.queue      = [];
    this.eos        = false;
    this.dead       = false;
    this._resolved  = false;
    this._lastPump  = 0;
    this.ac         = new AbortController();
    this._url       = URL.createObjectURL(this.ms);
    this.ready      = new Promise(r => { this._resolveReady = r; });
  }

  start() {
    if (!AUDIO_MIME) {
      // No MSE support — fall back to direct src assignment
      this.audio.src = this.src;
      this._resolveReady();
      return this.ready;
    }
    this.audio.src = this._url;
    this.ms.addEventListener('sourceopen', () => this._open(), { once: true });
    return this.ready;
  }

  async _open() {
    if (this.dead) return;
    if (this.ms.readyState !== 'open') return;

    try {
      this.sb = this.ms.addSourceBuffer(AUDIO_MIME);
    } catch (e) {
      console.warn('[AudioMSE] addSourceBuffer failed', e);
      this._resolveReady();
      return;
    }

    this.sb.mode = 'sequence';
    this.sb.addEventListener('updateend', () => this._onUpdateEnd());

    // HEAD with retry — if all retries fail, total stays 0 and we stream blindly
    this.total = await this._getContentLengthWithRetry();
    this._pump();
  }

  async _getContentLengthWithRetry() {
    for (let i = 0; i <= HEAD_RETRY; i++) {
      try {
        const len = await getContentLength(this.src, this.ac.signal);
        if (len > 0) return len;
      } catch (e) {
        if (this.ac.signal.aborted) return 0;
      }
      if (i < HEAD_RETRY) await sleep(HEAD_RETRY_BASE_MS * 2 ** i);
    }
    return 0;
  }

  // Returns seconds of audio buffered ahead of currentTime
  _aheadSeconds() {
    const a = this.audio, ct = a.currentTime;
    for (let i = 0; i < a.buffered.length; i++) {
      if (a.buffered.start(i) <= ct + 0.1 && a.buffered.end(i) > ct)
        return a.buffered.end(i) - ct;
    }
    return 0;
  }

  // Only "all fetched" when total is known and we've consumed it
  _allFetched() { return this.total > 0 && this.next >= this.total; }

  _pump() {
    if (this.dead || this.eos) return;
    if (this._allFetched()) return;
    if (this._aheadSeconds() >= BUF_AHEAD_S) return;
    while (this.inflight < PREFETCH && !this._allFetched()) this._fetchNext();
  }

  async _fetchNext() {
    // Capture the byte range before incrementing so a failed fetch can be retried
    const start = this.next;
    const end   = this.total
      ? Math.min(start + AUDIO_CHUNK - 1, this.total - 1)
      : start + AUDIO_CHUNK - 1;

    // Advance next only after we know the range — reset on failure
    this.next = end + 1;
    this.inflight++;

    try {
      const buf = await fetchChunk(this.src, start, end, this.ac.signal);
      if (!this.dead) { this.queue.push(buf); this._drain(); }
    } catch (e) {
      if (!this.dead) {
        console.warn('[AudioMSE] fetch error, rewinding next to retry', start, e);
        // Rewind so the range is retried on next pump cycle
        this.next = start;
      }
    } finally {
      this.inflight--;
      if (!this.dead) this._pump();
    }
  }

  _drain() {
    if (!this.sb || this.sb.updating || !this.queue.length) return;
    try {
      this.sb.appendBuffer(this.queue.shift());
    } catch (e) {
      console.warn('[AudioMSE] appendBuffer error', e);
    }
  }

  _onUpdateEnd() {
    // Resolve ready promise on first successful append
    if (!this._resolved) {
      this._resolved = true;
      this._resolveReady();
    }

    this._drain();
    this._pump();

    // Signal end-of-stream to the browser so duration is correct
    if (this._allFetched() && !this.queue.length && !this.eos) {
      this.eos = true;
      try {
        if (this.ms.readyState === 'open') this.ms.endOfStream();
      } catch (e) {
        console.warn('[AudioMSE] endOfStream error', e);
      }
      this.audio.addEventListener('ended', () => this._restart(), { once: true });
    }

    this._evict();
  }

  _restart() {
    if (this.dead) return;
    this.inflight  = 0;
    this.queue     = [];
    this.eos       = false;
    this._resolved = false;
    this.next      = 0;
    this.audio.currentTime = 0;
    // Pump first, then play — ensures buffer is being filled before playback
    this._pump();
    this.audio.play().catch(() => {});
  }

  _evict() {
    const a = this.audio;
    if (!this.sb || this.sb.updating || !a.buffered.length) return;
    const cutoff = a.currentTime - BUF_BEHIND_S;
    if (cutoff > 0) {
      try { this.sb.remove(0, cutoff); } catch (e) {
        console.warn('[AudioMSE] evict error', e);
      }
    }
  }

  // Throttled — safe to call on every timeupdate event
  onTime() {
    const now = Date.now();
    if (now - this._lastPump < PUMP_THROTTLE_MS) return;
    this._lastPump = now;
    this._pump();
  }

  // Seek support: if seeked position is not buffered, reset fetch position
  onSeek() {
    if (!this.total) return;
    const a = this.audio, ct = a.currentTime;
    for (let i = 0; i < a.buffered.length; i++) {
      if (a.buffered.start(i) <= ct && a.buffered.end(i) > ct) return;
    }
    const dur = a.duration;
    const ratio = (dur && isFinite(dur)) ? ct / dur : 0;
    const bytePos = Math.floor(ratio * this.total);
    this.next     = Math.floor(bytePos / AUDIO_CHUNK) * AUDIO_CHUNK;
    this.inflight = 0;
    this.queue    = [];
    this.eos      = false;
    this._pump();
  }

  destroy() {
    this.dead = true;
    this.sb   = null;
    this.ac.abort();
    try { if (this.ms.readyState === 'open') this.ms.endOfStream(); } catch {}
    URL.revokeObjectURL(this._url);
    // Clear audio src to release the blob URL reference and stop playback
    try {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    } catch {}
  }
}

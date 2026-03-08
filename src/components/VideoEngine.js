// ── URL 白名单校验（安全：防 SSRF / 内网探测）────────────────────────────────
const ALLOWED_HOSTS = [
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
];

export function validateUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    // 拒绝私有 IP / loopback / link-local
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(hostname))
      return false;
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch { return false; }
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const FIRST_CHUNK   = 2  * 1024 * 1024;
export const CHUNK         = 20 * 1024 * 1024;
export const PREFETCH      = 2;
export const BUF_AHEAD_S   = 30;
export const BUF_BEHIND_S  = 10;
export const MAX_RETRY     = 4;
export const RETRY_BASE_MS = 300;
const        MAX_QUEUE     = 8;   // 防内存无限增长

const MIME_CANDIDATES = [
  'video/mp4; codecs="avc1.64001E"',
  'video/mp4; codecs="avc1.4D401E"',
  'video/mp4; codecs="avc1.42E01E"',
  'video/mp4',
];
export const MIME = typeof MediaSource !== 'undefined'
  ? MIME_CANDIDATES.find(m => MediaSource.isTypeSupported(m)) || 'video/mp4'
  : 'video/mp4';

const IS_FIREFOX = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

export const MSE_CAPABLE =
  !IS_FIREFOX &&
  typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(MIME);

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function probeStream(url, signal) {
  if (!validateUrl(url)) return false;
  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-65535' },
      signal: signal ?? AbortSignal.timeout(12000),
    });
    if (res.status !== 206) return false;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let off = 0;
    while (off + 8 <= bytes.length) {
      const size =
        (bytes[off] << 24) | (bytes[off+1] << 16) |
        (bytes[off+2] << 8) |  bytes[off+3];
      const type = String.fromCharCode(
        bytes[off+4], bytes[off+5], bytes[off+6], bytes[off+7]);
      if (type === 'moof' || type === 'mvex') return true;
      if (size < 8) break;
      off += size;
    }
    return false;
  } catch { return false; }
}

export async function fetchChunk(url, start, end, signal) {
  if (!validateUrl(url)) throw new Error('URL not allowed');
  for (let i = 0; i <= MAX_RETRY; i++) {
    try {
      const res = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal,
      });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch (e) {
      if (signal?.aborted || i === MAX_RETRY) throw e;
      await sleep(RETRY_BASE_MS * 2 ** i);
    }
  }
}

export async function getContentLength(url, signal) {
  if (!validateUrl(url)) return 0;
  try {
    const res = await fetch(url, { method: 'HEAD', signal });
    return parseInt(res.headers.get('content-length') || '0', 10);
  } catch { return 0; }
}

// ── MSE Engine ────────────────────────────────────────────────────────────────
export class Engine {
  constructor(video, src) {
    if (!validateUrl(src)) throw new Error('[MSE] URL not allowed: ' + src);
    this.video    = video;
    this.src      = src;
    this.ms       = new MediaSource();
    this.sb       = null;
    this.total    = 0;
    this.next     = 0;
    this.inflight = 0;
    this.queue    = [];
    this.eos      = false;
    this.dead     = false;
    this.firstBuf = false;
    this._pumping = false;   // 防止 _pump 重入
    this.ac       = new AbortController();
    this._url     = URL.createObjectURL(this.ms);
    this.ready    = new Promise(r => { this._resolveReady = r; });
  }

  start() {
    this.video.src = this._url;
    this.ms.addEventListener('sourceopen', () => this._open(), { once: true });
    this._ticker = setInterval(() => this._pump(), 1000);
    return this.ready;
  }

  async _open() {
    if (this.dead) return;
    try {
      this.sb = this.ms.addSourceBuffer(MIME);
    } catch (e) {
      console.warn('[MSE] addSourceBuffer failed', e);
      this._resolveReady();
      return;
    }
    this.sb.mode = 'sequence';
    this.sb.addEventListener('updateend', () => this._onUpdateEnd());
    this.total = await getContentLength(this.src, this.ac.signal);
    await this._fetchInit();
  }

  async _fetchInit() {
    if (this.dead) return;
    try {
      const probe = await fetchChunk(this.src, 0, 65535, this.ac.signal);
      const bytes = new Uint8Array(probe);
      let off = 0, initEnd = 0;
      while (off + 8 <= bytes.length) {
        const size = (bytes[off]<<24)|(bytes[off+1]<<16)|(bytes[off+2]<<8)|bytes[off+3];
        const typ  = String.fromCharCode(bytes[off+4],bytes[off+5],bytes[off+6],bytes[off+7]);
        if (typ === 'moof') break;
        if (size < 8) break;
        initEnd = off + size;
        off += size;
      }
      // initEnd===0 说明第一个 box 就是 moof（纯 moof 流），用全部探测数据作为 init
      const initSlice = initEnd > 0 ? probe.slice(0, initEnd) : probe;
      this.next = initEnd > 0 ? initEnd : probe.byteLength;
      this.queue.push(initSlice);
      this._drain();
    } catch (e) {
      if (!this.dead) console.warn('[MSE] init fetch error', e);
    }
  }

  _aheadSeconds() {
    const v = this.video, ct = v.currentTime;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= ct + 1 && v.buffered.end(i) > ct)
        return v.buffered.end(i) - ct;
    }
    return 0;
  }

  _allFetched() { return this.total > 0 && this.next >= this.total; }

  // 防重入：同一 tick 只允许一次 _pump 执行路径
  _pump() {
    if (this.dead || this.eos || this._pumping) return;
    if (this._allFetched()) return;
    if (this._aheadSeconds() >= BUF_AHEAD_S) return;
    if (this.queue.length >= MAX_QUEUE) return;   // 背压：队列满则暂停拉取
    this._pumping = true;
    try {
      while (this.inflight < PREFETCH && !this._allFetched() &&
             this.queue.length < MAX_QUEUE) {
        this._fetchNext();
      }
    } finally {
      this._pumping = false;
    }
  }

  async _fetchNext() {
    const start = this.next;
    const size  = this.firstBuf ? CHUNK : FIRST_CHUNK;
    const end   = this.total
      ? Math.min(start + size - 1, this.total - 1)
      : start + size - 1;
    this.next = end + 1;
    this.inflight++;
    try {
      const buf = await fetchChunk(this.src, start, end, this.ac.signal);
      if (!this.dead) { this.queue.push(buf); this._drain(); }
    } catch (e) {
      if (!this.dead) {
        console.warn('[MSE] fetch error, rewinding to retry', start, e);
        this.next = start;   // 回退，下次 pump 重试
      }
    } finally {
      this.inflight--;
      if (!this.dead) this._pump();
    }
  }

  _drain() {
    if (!this.sb || this.sb.updating || !this.queue.length) return;
    try { this.sb.appendBuffer(this.queue.shift()); } catch (e) {
      console.warn('[MSE] appendBuffer', e);
    }
  }

  _onUpdateEnd() {
    if (!this.firstBuf) {
      this.firstBuf = true;
      this._resolveReady();
    }
    this._drain();
    this._pump();

    if (this._allFetched() && !this.queue.length && !this.eos) {
      this.eos = true;
      // 通知浏览器流结束，使 duration 正确
      try {
        if (this.ms.readyState === 'open') this.ms.endOfStream();
      } catch (e) { console.warn('[MSE] endOfStream', e); }
      this.video.addEventListener('ended', () => this._restart(), { once: true });
    }

    this._evict();
  }

  _restart() {
    if (this.dead) return;
    // MSE 已 ended，需重建
    if (this.ms.readyState !== 'open') {
      this._rebuildMSE();
      return;
    }
    this.inflight = 0;
    this.queue    = [];
    this.eos      = false;
    this.firstBuf = false;
    this.next     = 0;
    this.video.currentTime = 0;
    this._fetchInit();
    this.video.play().catch(() => {});
  }

  _rebuildMSE() {
    // 销毁旧 MSE，重新挂载
    try { URL.revokeObjectURL(this._url); } catch {}
    this.ms   = new MediaSource();
    this.sb   = null;
    this._url = URL.createObjectURL(this.ms);
    this.inflight = 0;
    this.queue    = [];
    this.eos      = false;
    this.firstBuf = false;
    this.next     = 0;
    this.video.src = this._url;
    this.ms.addEventListener('sourceopen', () => this._open(), { once: true });
    this.video.play().catch(() => {});
  }

  _evict() {
    const v = this.video;
    if (!this.sb || this.sb.updating || !v.buffered.length) return;
    const cutoff = v.currentTime - BUF_BEHIND_S;
    if (cutoff > 0) try { this.sb.remove(0, cutoff); } catch {}
  }

  onTime() { this._pump(); }

  onSeek() {
    if (!this.total) return;
    const v = this.video, ct = v.currentTime;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= ct && v.buffered.end(i) > ct) return;
    }
    const dur = v.duration;
    const ratio   = (dur && isFinite(dur)) ? ct / dur : 0;
    const bytePos = Math.floor(ratio * this.total);
    // 对齐到 CHUNK 边界（与 _fetchNext 使用的 CHUNK 一致，避免 SourceBuffer 解析错误）
    this.next     = Math.floor(bytePos / CHUNK) * CHUNK;
    this.inflight = 0;
    this.queue    = [];
    this.eos      = false;
    this.firstBuf = true;   // seek 后跳过 init 阶段，直接用 CHUNK 大小
    this._pump();
  }

  destroy() {
    this.dead = true;
    this.sb   = null;
    clearInterval(this._ticker);
    this.ac.abort();
    try { if (this.ms.readyState === 'open') this.ms.endOfStream(); } catch {}
    URL.revokeObjectURL(this._url);
    try {
      this.video.pause();
      this.video.src = '';
      this.video.load();
    } catch {}
  }
}

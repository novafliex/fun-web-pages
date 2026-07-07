/* Poker carousel + music player
   Minimal changes from original:
   + Added prevSong() method
   + Wired player-prev-btn, player-next-btn
   + Wired player-progress range input
   + Synced player-mini-cover image
   + Split time display to player-current-time / player-duration
   + Added is-playing class to .melody-player-panel / #poker-player
   + Added is-playing class to .melody-page for scoped visual state
   Original music logic (songs array, playSong, move, togglePlay) untouched.
*/

const pokerCarousel = {
  songs: [
    {
      img: "img/5.png",
      songId: "445154140",
      name: "最后一页",
      artist: "洛尘鞅",
      fallbackSrc:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      img: "img/2.png",
      songId: "2663253631",
      name: "恶作剧",
      artist: "王蓝茵",
      fallbackSrc:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      img: "img/3.png",
      songId: "542697117",
      name: "借我",
      artist: "谢春花",
      fallbackSrc:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      img: "img/4.png",
      songId: "1988658147",
      name: "情歌",
      artist: "张悬",
      fallbackSrc:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
    {
      img: "img/1.png",
      songId: "1859897482",
      name: "孤独患者",
      artist: "陈奕迅",
      fallbackSrc:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    },
  ],

  cards: [],
  currentSongIdx: 0,
  isPlaying: false,
  hasEverPlayed: false,
  audio: null,
  isTryingFallback: false,
  _npTimer: null,

  els: {},

  init() {
    this.audio = document.getElementById("poker-audio");
    this.cards = [...document.querySelectorAll(".melody-page .poker-card")];

    this.els = {
      player: document.getElementById("poker-player"),
      songName: document.getElementById("player-title"),
      artistName: document.getElementById("player-artist"),
      playBtn: document.getElementById("player-play-btn"),
      prevBtn: document.getElementById("player-prev-btn"),
      nextBtn: document.getElementById("player-next-btn"),
      miniCover: document.getElementById("player-mini-cover"),
      currentTime: document.getElementById("player-current-time"),
      durationEl: document.getElementById("player-duration"),
      progress: document.getElementById("player-progress"),
      nowPlaying: document.getElementById("poker-now-playing"),
      melodyPage: document.querySelector(".melody-page"),
      cardStage: document.querySelector(".melody-card-stage"),
    };

    /* Put the now-playing prompt above the poker-card stage instead of
       leaving it as a detached bottom-center toast. */
    if (this.els.nowPlaying && this.els.cardStage) {
      this.els.cardStage.appendChild(this.els.nowPlaying);
      this.els.nowPlaying.classList.add("poker-now-playing--card-top");
    }

    if (!this.audio || !this.els.player || !this.cards.length) {
      console.warn("Music player init: required DOM nodes missing.");
      return;
    }

    /* Pre-load images */
    this.songs.forEach((song) => {
      const img = new Image();
      img.src = song.img;
    });

    /* Assign fan positions and song index from HTML attributes */
    this.cards.forEach((card) => {
      const fanIdx = parseInt(card.dataset.fan, 10);
      const songIdx = parseInt(card.dataset.songIndex, 10);
      card._fanIndex = isNaN(fanIdx) ? 0 : fanIdx;
      card._songIndex = isNaN(songIdx) ? 0 : songIdx;
    });

    /* Show first song (index 0) in player UI without playing */
    this.currentSongIdx = 0;
    this.updatePlayerUI(0, false);
    this.updateActiveCard();

    this.bindEvents();
    this.initVisibilityListener();
  },

  bindEvents() {
    /* Prev / Next / Play buttons */
    if (this.els.playBtn) {
      this.els.playBtn.addEventListener("click", () => this.togglePlay());
    }
    if (this.els.prevBtn) {
      this.els.prevBtn.addEventListener("click", () => this.prevSong());
    }
    if (this.els.nextBtn) {
      this.els.nextBtn.addEventListener("click", () => this.nextSong());
    }

    /* Card clicks */
    this.cards.forEach((card) => {
      card.addEventListener("click", () => this.playSong(card._songIndex));
    });

    /* Progress slider drag */
    if (this.els.progress) {
      this.els.progress.addEventListener("input", () => {
        const val = parseFloat(this.els.progress.value);
        const max = parseFloat(this.els.progress.max);
        if (isFinite(val)) this.audio.currentTime = val;
        if (isFinite(val) && isFinite(max) && max > 0) {
          const pct = (val / max) * 100;
          this.els.progress.style.setProperty("--progress", pct + "%");
        }
      });
    }

    /* Audio events */
    this.audio.addEventListener("loadedmetadata", () => {
      this.updateProgress();
      if (this.els.progress) {
        const dur = this.audio.duration;
        this.els.progress.max = isFinite(dur) ? dur : 0;
      }
    });

    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("ended", () => this.nextSong());

    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      this._setPlayingState(true);
    });

    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      this._setPlayingState(false);
      this.hideNowPlaying();
    });

    this.audio.addEventListener("error", () => {
      const song = this.songs[this.currentSongIdx];
      const label = song ? song.name : "当前歌曲";

      if (song && song.fallbackSrc && !this.isTryingFallback) {
        this.isTryingFallback = true;
        this.audio.src = song.fallbackSrc;
        this.audio.load();
        if (this.els.artistName) this.els.artistName.textContent = "备用音源";
        this.audio.play().catch((err) => {
          console.warn("Fallback playback failed:", err.message);
        });
        return;
      }

      this.isPlaying = false;
      this._setPlayingState(false);
      if (this.els.songName)
        this.els.songName.textContent = `${label} 暂时无法播放`;
      if (this.els.artistName)
        this.els.artistName.textContent = "请更换可播放的 songId";
      console.warn("Audio load failed. Source may be blocked or unavailable.");
    });
  },

  initVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.isPlaying) {
        this.audio.pause();
      }
    });
  },

  /* ── Playback control ───────────────────────── */

  playSong(songIndex) {
    if (songIndex < 0 || songIndex >= this.songs.length) return;
    const song = this.songs[songIndex];
    this.currentSongIdx = songIndex;
    this.hasEverPlayed = true;
    this.isTryingFallback = false;

    this.audio.src = `https://music.163.com/song/media/outer/url?id=${song.songId}.mp3`;
    this.audio.load();

    this.updatePlayerUI(songIndex, true);
    this.updateActiveCard();
    this.showNowPlaying(song.name);

    const p = this.audio.play();
    if (p) {
      p.catch((err) => {
        this.isPlaying = false;
        this._setPlayingState(false);
        if (this.els.artistName)
          this.els.artistName.textContent = "点击播放按钮继续";
        console.warn("Playback blocked:", err.message);
      });
    }
  },

  prevSong() {
    const prev =
      (this.currentSongIdx - 1 + this.songs.length) % this.songs.length;
    this.playSong(prev);
  },

  nextSong() {
    const next = (this.currentSongIdx + 1) % this.songs.length;
    this.playSong(next);
  },

  togglePlay() {
    if (!this.audio.src || this.audio.src === window.location.href) {
      this.playSong(this.currentSongIdx);
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
      return;
    }

    this.hasEverPlayed = true;
    this.audio
      .play()
      .then(() => {
        this.showNowPlaying(this.songs[this.currentSongIdx].name);
      })
      .catch((err) => {
        if (this.els.artistName)
          this.els.artistName.textContent = "浏览器阻止了播放";
        console.warn("Playback failed:", err.message);
      });
  },

  /* ── State helpers ──────────────────────────── */

  _setPlayingState(playing) {
    const panel = this.els.player;
    if (!panel) return;

    if (playing) {
      panel.classList.add("is-playing");
      panel.classList.remove("poker-player--paused");
    } else {
      panel.classList.remove("is-playing");
      panel.classList.add("poker-player--paused");
    }

    /* Also flag .melody-page for scoped visual state */
    if (this.els.melodyPage) {
      this.els.melodyPage.classList.toggle("is-playing", playing);
    }

    this.updateActiveCard();
  },

  updateActiveCard() {
    this.cards.forEach((card) => {
      card.classList.toggle(
        "is-active",
        card._songIndex === this.currentSongIdx,
      );
    });
  },

  updatePlayerUI(songIndex, _showPlayer) {
    const song = this.songs[songIndex];
    if (!song) return;

    if (this.els.songName) this.els.songName.textContent = song.name;
    if (this.els.artistName) this.els.artistName.textContent = song.artist;
    if (this.els.miniCover) {
      this.els.miniCover.src = song.img;
      this.els.miniCover.alt = song.name;
    }

    /* Reset time display */
    if (this.els.currentTime) this.els.currentTime.textContent = "0:00";
    if (this.els.durationEl) this.els.durationEl.textContent = "0:00";
    if (this.els.progress) {
      this.els.progress.value = 0;
      this.els.progress.max = 0;
    }
  },

  updateProgress() {
    const current = isFinite(this.audio.currentTime)
      ? this.audio.currentTime
      : 0;
    const duration = isFinite(this.audio.duration) ? this.audio.duration : 0;

    if (this.els.currentTime)
      this.els.currentTime.textContent = this.formatTime(current);
    if (this.els.durationEl)
      this.els.durationEl.textContent = this.formatTime(duration);

    if (this.els.progress && !isNaN(duration) && duration > 0) {
      this.els.progress.max = duration;
      this.els.progress.value = current;
      /* Update CSS fill visual */
      const pct = (current / duration) * 100;
      this.els.progress.style.setProperty("--progress", pct + "%");
    }
  },

  formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  },

  /* ── Now-playing toast ──────────────────────── */

  showNowPlaying(name) {
    const el = this.els.nowPlaying;
    if (!el) return;
    el.textContent = `♪ ${name}`;
    el.classList.add("poker-now-playing--show");
    clearTimeout(this._npTimer);
    this._npTimer = setTimeout(() => this.hideNowPlaying(), 3000);
  },

  hideNowPlaying() {
    const el = this.els.nowPlaying;
    if (!el) return;
    el.classList.remove("poker-now-playing--show");
    clearTimeout(this._npTimer);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  pokerCarousel.init();
});

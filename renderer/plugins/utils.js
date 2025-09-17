import { format, formatDistanceToNow } from "date-fns";
import $ from "jquery";
import _, { isEmpty, isNil, trim } from "lodash";
import _md5 from "md5";
// Require tw locale
import { zhTW } from "date-fns/locale";
const emoji = require("node-emoji");

import DOMPurify from "dompurify";
import { marked } from "marked";
marked.setOptions({
  breaks: true,
  sanitizer: DOMPurify.sanitize,
});

import highlightWords from "highlight-words";

export default {
  /**
   * 檢查物件是否為空
   */
  isEmpty,

  /**
   * 檢查是否為 Nil (null 或 undefined)
   */
  isNil,

  /**
   * 去除字串前後空白
   */
  trim,

  /**
   * 格式化時間 (範例)
   * @param {Date|String|Number} time
   */
  formatTime(time) {
    const d = new Date(time);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  },

  /**
   * 格式化日期 (範例)
   * @param {Date|String|Number} date
   */
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  },
  $,
  emojify(msg) {
    return emoji.emojify(msg);
  },
  /**
   * lodash ...
   */
  _,
  empty: _.isEmpty, // '0' is not empty
  equal: _.isEqual,
  escape: _.escape,
  debounce: _.debounce, // _.debounce(func, wait, options)
  uniqBy: _.uniqBy,
  orderBy: _.orderBy,
  remove: _.remove,
  trim: _.trim,
  md5: _md5,
  /**
   * marked
   */
  marked,
  convertMarkd(text, inline = false) {
    if (inline) {
      return DOMPurify?.sanitize(marked.parseInline(text?.trimEnd()));
    }
    return DOMPurify?.sanitize(marked.parse(text?.trimEnd()));
  },
  convertInlineMarkd(text) {
    return DOMPurify?.sanitize(marked.parseInline(text?.trimEnd()));
  },
  /**
   * usage in Vue
   * this.$utils.animated('.my-element', { name: 'bounce', duration: 'faster', delay: '' }).then((message) => {
   *  // Do something after the animation
   * })
   */
  animated(selector, opts, prefix = "animate__") {
    if (_.isEmpty(selector)) {
      console.warn("⚠ 選擇代碼為空值：", selector);
      return false;
    }
    return new Promise((resolve, reject) => {
      if (_.isEmpty(selector)) {
        reject(`selector is empty.`);
      } else if (process.client) {
  
        const animateAttentionSeekers = [
          "bounce",
          "flash",
          "pulse",
          "rubberBand",
          "shakeX",
          "shakeY",
          "headShake",
          "swing",
          "tada",
          "wobble",
          "jello",
          "heartBeat",
        ];

        const patternLen = animateAttentionSeekers.length;
        const seekerIdx = parseInt(Math.random() * 1000) % patternLen;
        opts = Object.assign(
          {
            name: animateAttentionSeekers[seekerIdx],
            speed: "faster", // 'slower', 'slow', '', 'fast', 'faster' (3s, 2s, 1s, 800ms, 500ms)
            repeat: "", // repeat-[1-3], infinite
            delay: "", // delay, delay-[2s-5s]
          },
          opts
        );
        const node = $(selector);
        if (node.length > 0) {
          node.removeClass("hide");
          const classes = `${prefix}animated ${prefix}${opts.name} ${prefix}${opts.speed} ${prefix}${opts.repeat} ${prefix}${opts.delay}`;
          node.addClass(classes);
          // node[0].addEventListener('animationend', handleAnimationEnd, {once: true}
          node.one("animationend", function (e) {
            // When the animation ends, we clean the classes and resolve the Promise
            node.removeClass(classes);
            // clear ld animation also
            $(selector || "*")
              .removeClass("ld")
              .attr("class", function (i, c) {
                return c ? c.replace(/(^|\s+)ld-\S+/g, "") : "";
              });
            resolve(`${opts.name} animation ended.`);
          });
        } else {
          reject(`${selector} not found, can't apply animation effect.`);
        }
      } else {
        reject(
          `Only apply animation on client side, this animated call will be ignored.`
        );
      }
    });
  },
  openNewWindow(url, e) {
    if (window) {
      const win = window.open(url, "_blank");
      win.focus();
    }
  },
  statusCheck(statusCode) {
    return statusCode > 0;
  },
  rand(range) {
    return Math.floor(Math.random() * Math.floor(range || 100));
  },
  trimTags(x) {
    return _.trim(x?.replace(/(<([^>]+)>)/gi, ""));
  },
  uuid() {
    let d = Date.now();
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    ) {
      d += performance.now(); // use high-precision timer if available
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }
    );
  },
  now() {
    // https://date-fns.org/v2.28.0/docs/format
    // e.g. 2022-01-22 16:06:23
    return format(new Date(), "yyyy-LL-dd HH:mm:ss", { locale: zhTW });
  },
  twNow() {
    const now = new Date();
    now.setFullYear(now.getFullYear() - 1911);
    return format(now, "yyy-LL-dd HH:mm:ss", { locale: zhTW });
  },
  toADDate(ts, fmt = "yyyy-LL-dd HH:mm:ss") {
    return format(ts, fmt, { locale: zhTW });
  },
  tsToAdDateStr(phpTs, full = false) {
    // PHP time() generate ts by seconds, however js is milliseconds
    const formatted = format(phpTs * 1000, "yyyy-LL-dd HH:mm:ss", {
      locale: zhTW,
    });
    const parts = formatted.split(" ");
    return full ? formatted : parts[0];
  },
  twDateStr(dateObj) {
    if (typeof dateObj !== "object") {
      console.warn("twDateStr", dateObj, "is not an object");
      return "";
    }
    dateObj.setFullYear(dateObj.getFullYear() - 1911);
    return format(dateObj, "yyyLLdd", { locale: zhTW });
  },
  twToAdDateObj(twDateStr) {
    if (isEmpty(twDateStr)) {
      return null;
    }
    const Y = twDateStr.substring(0, 3) - 0 + 1911;
    const M = twDateStr.substring(3, 5) - 0 - 1;
    const D = twDateStr.substring(5, 7) - 0;
    return new Date(Y, M, D);
  },
  formatDistanceToNow(d = +new Date()) {
    return formatDistanceToNow(d, {
      addSuffix: true,
      includeSeconds: true,
      locale: zhTW,
    });
  },
  isIPv4(str) {
    if (_.isEmpty(str)) {
      return false;
    }
    const regex = new RegExp(
      `^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`,
      "g"
    );
    return Boolean(str.match(regex));
  },
  ipv4Int(addr) {
    if (this.isIPv4(addr)) {
      var parts = addr.split(".").map(function (str) {
        return parseInt(str);
      });
      return (
        (parts[0] ? parts[0] << 24 : 0) +
        (parts[1] ? parts[1] << 16 : 0) +
        (parts[2] ? parts[2] << 8 : 0) +
        parts[3]
      );
    }
    return false;
  },
  msToHuman(remain_ms) {
    const seconds = (remain_ms / 1000).toFixed(1);
    const minutes = (remain_ms / (1000 * 60)).toFixed(1);
    const hours = (remain_ms / (1000 * 60 * 60)).toFixed(1);
    const days = (remain_ms / (1000 * 60 * 60 * 24)).toFixed(1);
    if (seconds < 60) {
      return seconds + " 秒";
    } else if (minutes < 60) {
      return minutes + " 分鐘";
    } else if (hours < 24) {
      return hours + " 小時";
    } else {
      return days + " 天";
    }
  },
  twDateStr(dateObj) {
    if (typeof dateObj !== "object") {
      console.warn("twDateStr", dateObj, "is not an object");
      return ``;
    }
    return `${dateObj.getFullYear() - 1911}${(
      "0" +
      (dateObj.getMonth() + 1)
    ).slice(-2)}${("0" + dateObj.getDate()).slice(-2)}`;
  },
  length(chinese) {
    return chinese.replace(/[^\x00-\xFF]/g, "xx").length;
  },
  replaceFilepath(str) {
    const regex =
      /(([c-z]:\\|\\\\)[^<>:"\/|?*\n\r\t]+(\\(.+\.[a-z]{1,4})?))/gim;
    const subst = `<span class="open-os-explorer" title="滑鼠左鍵開啟路徑">$1</span>`;
    return str?.replace(regex, subst);
  },
  highlight(str, regex, css, title = "") {
    const chunks = highlightWords({
      text: str,
      query: regex,
    });
    if (chunks) {
      return chunks
        .map(({ text, match, key }) => {
          return match
            ? `<span class="${this.escape(css)}" title="${this.escape(
                title
              )}" key="${key}">${text}</span>`
            : text;
        })
        .join("");
    }
    return str;
  },
  highlightBlue(str) {
    return this.highlight(
      str,
      /(\{{2}b.+?b\}{2})/gim,
      "text-bold-blue"
    ).replace(/(\{{2}b|b\}{2})/gim, "");
  },
  highlightRed(str) {
    return this.highlight(str, /(\{{2}r.+?r\}{2})/, "text-bold-red").replace(
      /(\{{2}r|r\}{2})/gim,
      ""
    );
  },
  highlightGreen(str) {
    return this.highlight(str, /(\{{2}g.+?g\}{2})/, "text-bold-green").replace(
      /(\{{2}g|g\}{2})/gim,
      ""
    );
  },
  highlightOrange(str) {
    return this.highlight(str, /(\{{2}o.+?o\}{2})/, "text-bold-orange").replace(
      /(\{{2}o|o\}{2})/gim,
      ""
    );
  },
  highlightTimestamp(str, css = "text-bold-blue") {
    return this.highlight(
      str,
      /([0-2]?[0-9]：[0-5]?[0-9]|\s[0-2]?[0-9]:[0-5]?[0-9]\s|\([0-1]?[0-9]\/[0-3]?[0-9].*?\)|[0-1]?[0-9][／月][0-3]?[0-9]日?|\s[0-1]?[0-9][\/／][0-3]?[0-9]\s|[0-2]?[0-9][:：][0-5]?[0-9]\s?[\-~]\s?[0-2]?[0-9][:：][0-5]?[0-9]|[0-2]?[0-9][點時分秒HhSsMm]?[:：]?[0-5]?[0-9]?\s?[\-~]\s?[0-2]?[0-9][點時Hh][:：]?[0-5]?[0-9]?|[0-1]?[0-9][\/／][0-3]?[0-9]\s?[\-~]\s?[0-1]?[0-9][\/／][0-3]?[0-9])/i,
      css
    );
  },
  highlightTitle(str, css = "font-weight-bold") {
    return this.highlight(str, /(['「（【《『〈〔].+?[〕〉』》】）」'])/i, css);
  },
  highlightPipeline(str) {
    if (str) {
      let tmp = this.highlightBlue(str);
      tmp = this.highlightRed(tmp);
      tmp = this.highlightOrange(tmp);
      tmp = this.highlightGreen(tmp);
      tmp = this.highlightTimestamp(tmp);
      tmp = this.highlightTitle(tmp);
      return tmp;
    }
    return str;
  },
  handleSpecialClick(event) {
    const element = event.target;
    const { ipcRenderer, clipboard } = require("electron");
    if (element.tagName === "IMG" && element.src.startsWith("data:")) {
      // click on img
      ipcRenderer.invoke("open-image", {
        src: element.src,
        alt: element.alt,
      });
    } else if (element.classList.contains("open-os-explorer")) {
      const path = element.innerText;
      if (path) {
        clipboard.writeText(path);
        ipcRenderer.invoke("show-message-box", {
          title: "✂️ 剪貼簿",
          message: `路徑已複製`,
          detail: path,
          browser: true,
          statusOnly: true,
        });
        ipcRenderer.invoke("open-explorer", { path });
      }
    }
  },
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  assert: console.assert.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  table: console.table.bind(console),
  dir: console.dir.bind(console),
  dirxml: console.dirxml.bind(console),
  trace: console.trace.bind(console),
  clear: console.clear.bind(console),
  count: console.count.bind(console),
  countReset: console.countReset.bind(console),
  time: console.time.bind(console),
  timeEnd: console.timeEnd.bind(console),
  timeLog: console.timeLog.bind(console),
  timeStamp: console.timeStamp.bind(console),
  profile: console.profile.bind(console),
  profileEnd: console.profileEnd.bind(console),
  group: console.group.bind(console),
  groupEnd: console.groupEnd.bind(console),
};

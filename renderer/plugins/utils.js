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
  getUploadAxios() {
    const axios = require("axios");
    axios.defaults.headers.post["Content-Type"] = "multipart/form-data";
    return axios;
  },
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
   * // Do something after the animation
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
    if (!(dateObj instanceof Date) || isNaN(dateObj.valueOf())) {
      console.warn("twDateStr", dateObj, "is not a valid Date object");
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
    // 0. 支援星期幾的標示，例如 (五)、（日）、(星期一)、（週三）
    const dayOfWeek = "(?:\\s*[\\(（](?:星期|週|周)?[一二三四五六日天][\\)）])?";

    // 1. 日期格式 (含完整與短日期)
    const fullDate = `(?:\\d{2,4}[-\\/／\\.年])(?:1[0-2]|0?[1-9])[-\\/／\\.月](?:3[01]|[12]\\d|0?[1-9])[日號]?${dayOfWeek}`;
    const shortDate = `(?:1[0-2]|0?[1-9])[\\/／月](?:3[01]|[12]\\d|0?[1-9])[日號]?${dayOfWeek}`;
    const dateRe = `(?:${fullDate}|${shortDate})`;
    
    // 2. 時間格式 (擴增：早上、上午、中午、下午、晚上、凌晨)
    const timeRe = "(?:(?:早上|上午|中午|下午|晚上|凌晨)\\s*)?(?:[01]?\\d|2[0-3])(?:[:：][0-5]\\d|[點時][0-5]\\d分?|[點時])";

    // 3. 複合格式：日期+時間 (讓 "5/29下午5:30" 可以被視為單一整體匹配)
    const dateTimeRe = `(?:${dateRe}\\s*${timeRe})`;

    // 4. 區間格式 (支援 日期區間、時間區間 與 日期時間混合區間，且具備高強度的空白容錯)
    const dateTimeRange = `(?:${dateTimeRe}\\s*[-~]\\s*${dateTimeRe})`;
    const dateRange = `(?:${dateRe}\\s*[-~]\\s*${dateRe})`;
    const timeRange = `(?:${timeRe}\\s*[-~]\\s*${timeRe})`;

    // 5. 括號包覆格式 (精準擷取括號內的單一或區間日期時間)
    const parensRe = `\\([^)]*?(?:${dateTimeRange}|${dateRange}|${timeRange}|${dateTimeRe}|${dateRe}|${timeRe})[^)]*?\\)`;

    // 6. 組合所有正則條件 (優先度：區間 > 複合日期時間 > 單一日期/時間)
    const combinedStr = `(${[dateTimeRange, dateRange, timeRange, parensRe, dateTimeRe, fullDate, shortDate, timeRe].join('|')})`;
    const regex = new RegExp(combinedStr, "gi");

    return this.highlight(str, regex, css);
  },
  highlightTitle(str, css = "font-weight-bold") {
    return this.highlight(str, /(['「（【《『〈〔].+?[〕〉』》】）」'])/i, css);
  },
  
  /**
   * 🟢 [核心修復] 將高亮管道套上「保護屏障 (Masking)」
   * 擴增網路路徑與純 IP 的保護，避免被日期解析器誤判。
   */
  highlightPipeline(str) {
    if (!str) return str;

    const mdProtections = [];
    const codeProtections = [];
    const urlProtections = [];
    const pathProtections = [];
    const ipProtections = [];
    let tmp = str;

    // 1. 保護 Inline Code (如 `\\192.168.1.1\TBD`)
    tmp = tmp.replace(/(`[^`]+`)/g, (match) => {
      codeProtections.push(match);
      return `__CODE_PROTECT_${codeProtections.length - 1}__`;
    });

    // 2. 保護 Markdown 連結與圖片 (如 ![標題](data:image/jpeg;base64,...))
    tmp = tmp.replace(/(!?\[.*?\]\([^)]+\))/g, (match) => {
      mdProtections.push(match);
      return `__MD_PROTECT_${mdProtections.length - 1}__`;
    });

    // 3. 保護純文字 URL (如 http://192.168.1.1/file.pdf)
    tmp = tmp.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      urlProtections.push(match);
      return `__URL_PROTECT_${urlProtections.length - 1}__`;
    });

    // 4. 🟢 [新增] 保護 UNC 網路路徑與本機路徑 (如 \\220.1.34.57\folder 或 C:\folder)
    // 使用與 replaceFilepath 相同的正則以確保一致性，避免其內容的斜線或小數點被日期解析破壞
    const pathRegex = /(([c-zC-Z]:\\|\\\\)[^<>:"\/|?*\n\r\t]+(\\(.+\.[a-zA-Z]{1,4})?)?)/gim;
    tmp = tmp.replace(pathRegex, (match) => {
      pathProtections.push(match);
      return `__PATH_PROTECT_${pathProtections.length - 1}__`;
    });

    // 5. 🟢 [新增] 保護單獨的 IPv4 位址 (如 220.1.34.57)，防範其被短日期格式誤抓
    tmp = tmp.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (match) => {
      ipProtections.push(match);
      return `__IP_PROTECT_${ipProtections.length - 1}__`;
    });

    // 6. 執行各式高亮轉換
    tmp = this.highlightBlue(tmp);
    tmp = this.highlightRed(tmp);
    tmp = this.highlightOrange(tmp);
    tmp = this.highlightGreen(tmp);
    tmp = this.highlightTimestamp(tmp);
    tmp = this.highlightTitle(tmp);

    // 7. 依序還原受保護的原始結構 (順序需與前面相反，或互不干涉)
    ipProtections.forEach((ip, idx) => {
      tmp = tmp.replace(`__IP_PROTECT_${idx}__`, ip);
    });
    pathProtections.forEach((path, idx) => {
      tmp = tmp.replace(`__PATH_PROTECT_${idx}__`, path);
    });
    urlProtections.forEach((url, idx) => {
      tmp = tmp.replace(`__URL_PROTECT_${idx}__`, url);
    });
    mdProtections.forEach((md, idx) => {
      tmp = tmp.replace(`__MD_PROTECT_${idx}__`, md);
    });
    codeProtections.forEach((code, idx) => {
      tmp = tmp.replace(`__CODE_PROTECT_${idx}__`, code);
    });

    return tmp;
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
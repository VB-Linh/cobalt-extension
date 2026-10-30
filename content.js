(function(ut){"use strict";const At=Object.freeze({SETTINGS:"xvt_settings"}),C=Object.freeze({TWEET_ARTICLE:'article[data-testid="tweet"]',TIME_ELEMENT:"time",STATUS_ANCHOR:'a[href*="/status/"], a[href*="/statuses/"]',VIDEO_TAG:"video",VIDEO_PLAYER:'[data-testid="videoPlayer"], [data-testid="videoComponent"]',QUOTE_CONTAINER:'[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',EXCLUDED_COMPOSER:'[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',EXCLUDED_SIDEBAR:'[data-testid="sidebarColumn"], aside',EXCLUDED_DM:'[data-testid="messageEntry"]'}),it=Object.freeze({TWEET_ID:/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,MEDIA_INDEX:/(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,STATUS_URL:/^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,NUMERIC_ID:/^\d+$/});function lt(t){return!t||typeof t.closest!="function"?!0:!!(t.closest(C.EXCLUDED_COMPOSER)||t.closest(C.EXCLUDED_SIDEBAR)||t.closest(C.EXCLUDED_DM))}function nt(t,i=null){if(!t||typeof t.closest!="function")return null;if(i&&Q(i))return i;const e=t.closest(C.QUOTE_CONTAINER);if(e&&Q(e)&&(!i||i.contains(e)&&e!==i||e===i))return e;let n=t.parentElement;for(;n&&n!==i&&n!==document.body;){if(Q(n))return n;n=n.parentElement}return null}function Q(t){var i;return!t||typeof t.getAttribute!="function"?!1:!!(t.getAttribute("data-testid")==="quoteTweet"||t.getAttribute("data-testid")==="tweetQuote"||t.getAttribute("role")==="link"&&((i=t.querySelector)!=null&&i.call(t,'time, a[href*="/status/"], a[href*="/statuses/"]')))}function Rt(t,i){return i?t&&Q(t)?!0:!!nt(i,t):!1}function st(t){if(!t||typeof t.closest!="function"||lt(t))return null;const i=t.closest(C.QUOTE_CONTAINER);if(i&&Q(i))return i;const e=t.closest(C.TWEET_ARTICLE);if(e)return nt(t,e)||e;const n=t.closest('div[aria-modal="true"], div[role="dialog"]');if(n)return n.querySelector(C.TWEET_ARTICLE)||n;const s=t.closest('main[role="main"], [data-testid="primaryColumn"]');return s&&typeof window<"u"&&window.location&&(window.location.pathname||window.location.href||"").includes("/status/")?s:null}function It(t){return!t||typeof t.closest!="function"||t.isConnected===!1||lt(t)?!1:!!st(t)}function dt(t=document){if(!t||typeof t.querySelectorAll!="function")return[];const i=t.querySelectorAll(C.VIDEO_TAG),e=[];for(let n=0;n<i.length;n++){const s=i[n];It(s)&&e.push(s)}return e}function ft(t){var r,o,u,c;if(!t||typeof t.getAttribute!="function")return null;const i=((r=t.dataset)==null?void 0:r.mediaId)||t.getAttribute("data-media-id");if(i&&typeof i=="string"&&i.trim())return i.trim();const e=t.getAttribute("poster")||t.poster;if(e&&typeof e=="string"){const b=e.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);if(b&&b[1])return b[1];const v=e.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);if(v&&v[1])return v[1];const S=e.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);if(S&&S[1])return S[1];try{const h=new URL(e,"https://x.com").pathname.split("/").filter(Boolean);if(h.length>0){const y=h[h.length-1].replace(/\.[^.]+$/,"");if(y&&y!=="img")return y;if(h.length>1)return h[h.length-2]}}catch{}}const n=t.currentSrc||t.getAttribute("src")||t.src||((u=(o=t.querySelector)==null?void 0:o.call(t,"source"))==null?void 0:u.getAttribute("src"));if(n&&typeof n=="string"){const b=n.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);if(b&&b[1])return b[1];const v=n.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);if(v&&v[1])return v[1];const S=n.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);if(S&&S[1])return`blob_${S[1]}`}const s=(c=t.closest)==null?void 0:c.call(t,"[data-media-id]");if(s){const b=s.getAttribute("data-media-id");if(b&&b.trim())return b.trim()}return null}function rt(t,i=null,e=null){var s,r;const n=i??null;if(n!==null)return`${t}_media_${n}`;if(typeof e=="string"&&e.trim().length>0)return`${t}_media_fp_${e.trim()}`;if(e&&typeof e=="object"){const o=ft(e);if(o)return`${t}_media_fp_${o}`;const u=((s=e.closest)==null?void 0:s.call(e,'article, [data-testid="tweet"]'))||e.parentElement,c=(r=u==null?void 0:u.querySelectorAll)==null?void 0:r.call(u,"video");if(c&&c.length>1)return e.dataset||(e.dataset={}),e.dataset.xvtToken||(e.dataset.xvtToken=Math.random().toString(36).slice(2,10)),`${t}_media_tok_${e.dataset.xvtToken}`}return`${t}_media_null`}function W(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(it.TWEET_ID);return e?e[1]:null}function pt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(it.MEDIA_INDEX);if(!e)return null;const n=parseInt(e[1],10);return Number.isInteger(n)&&n>0?n:null}function ot(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(it.STATUS_URL);if(!e)return null;const n=e[1];return n?n.trim():null}function ht(t,i={}){const e=W(t);if(!e)return null;let s=`https://x.com/${i.username||ot(t)||"i"}/status/${e}`;const r=i.mediaIndex!==void 0?i.mediaIndex:pt(t);return r!=null&&Number.isInteger(Number(r))&&Number(r)>0&&(s+=`/video/${Number(r)}`),s}function mt(t,i){var c,b,v,S,_,h,y,N;const e={tweetId:null,permalink:null,mediaIndex:null,mediaFingerprint:null,isQuoted:!1,username:null,container:t||null};if(!i)return e;e.mediaFingerprint=ft(i);let n=typeof i.closest=="function"?i.closest('a[href*="/status/"], a[href*="/statuses/"]'):null;if(n){const m=n.getAttribute("href")||n.href||"";e.mediaIndex=pt(m)}const s=nt(i,t);if(!!s||Rt(t,i)){e.isQuoted=!0;const m=s||t;e.container=m;let l=null;if(m){if(typeof m.getAttribute=="function"){const d=m.getAttribute("href");d&&W(d)&&(l=d)}if(!l&&(typeof m.querySelectorAll=="function"||typeof m.querySelector=="function")){const d=typeof m.querySelectorAll=="function"?m.querySelectorAll(C.TIME_ELEMENT):[m.querySelector(C.TIME_ELEMENT)].filter(Boolean);for(const p of d){const x=(c=p.closest)==null?void 0:c.call(p,C.STATUS_ANCHOR);if(x){const L=x.getAttribute("href")||x.href;if(L&&W(L)){l=L;break}}}if(!l){const p=typeof m.querySelectorAll=="function"?m.querySelectorAll(C.STATUS_ANCHOR):[m.querySelector(C.STATUS_ANCHOR)].filter(Boolean);for(const x of p){const L=x.getAttribute("href")||x.href;if(L&&W(L)){l=L;break}}}}}if(l){const d=W(l);if(d)return e.tweetId=d,e.username=ot(l),e.permalink=ht(l,{mediaIndex:e.mediaIndex,username:e.username}),e}}const o=t||(typeof i.closest=="function"?i.closest(C.TWEET_ARTICLE):null);e.container=o;let u=null;if(o&&(typeof o.querySelectorAll=="function"||typeof o.querySelector=="function")){const m=typeof o.querySelectorAll=="function"?o.querySelectorAll(C.TIME_ELEMENT):[o.querySelector(C.TIME_ELEMENT)].filter(Boolean);for(const l of m){const d=(b=l.closest)==null?void 0:b.call(l,C.QUOTE_CONTAINER);if(d&&(((v=d.getAttribute)==null?void 0:v.call(d,"data-testid"))==="quoteTweet"||((S=d.getAttribute)==null?void 0:S.call(d,"data-testid"))==="tweetQuote"))continue;const p=(_=l.closest)==null?void 0:_.call(l,C.STATUS_ANCHOR);if(p){const x=p.getAttribute("href")||p.href;if(x&&W(x)){u=x;break}}}if(!u){const l=typeof o.querySelectorAll=="function"?o.querySelectorAll(C.STATUS_ANCHOR):[o.querySelector(C.STATUS_ANCHOR)].filter(Boolean);for(const d of l){const p=(h=d.closest)==null?void 0:h.call(d,C.QUOTE_CONTAINER);if(p&&(((y=p.getAttribute)==null?void 0:y.call(p,"data-testid"))==="quoteTweet"||((N=p.getAttribute)==null?void 0:N.call(p,"data-testid"))==="tweetQuote"))continue;const x=d.getAttribute("href")||d.href;if(x&&W(x)){u=x;break}}}}if(!u&&typeof window<"u"&&window.location){const m=window.location.pathname||window.location.href||"";W(m)&&(u=m)}if(u){const m=W(u);m&&(e.tweetId=m,e.username=ot(u),e.permalink=ht(u,{mediaIndex:e.mediaIndex,username:e.username}))}return e}class Nt{constructor(){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,this._dismissedKeys=new Set}isDismissed(i,e){var s;if(e&&e.dataset&&e.dataset.xvtDismissed==="true"||e&&this._dismissedElements.has(e))return!0;const n=i||((s=e==null?void 0:e.dataset)==null?void 0:s.xvtVideoKey);return n&&typeof n=="string"&&this._dismissedKeys.has(n)?(e&&(e.dataset&&(e.dataset.xvtDismissed="true"),this._dismissedElements.add(e)),!0):!1}dismiss(i,e){var s;const n=i||((s=e==null?void 0:e.dataset)==null?void 0:s.xvtVideoKey);e&&e.dataset&&(e.dataset.xvtDismissed="true",delete e.dataset.xvtMounted),e&&(this._dismissedElements.add(e),this._mountedElements.delete(e)),n&&typeof n=="string"&&this._dismissedKeys.add(n)}undismiss(i,e){var s;const n=i||((s=e==null?void 0:e.dataset)==null?void 0:s.xvtVideoKey);e&&e.dataset&&delete e.dataset.xvtDismissed,e&&this._dismissedElements.delete(e),n&&typeof n=="string"&&this._dismissedKeys.delete(n)}isMounted(i){return i?i.dataset&&i.dataset.xvtMounted==="true"?!0:this._mountedElements.has(i):!1}markMounted(i,e){i&&(i.dataset&&(i.dataset.xvtMounted="true",e&&(i.dataset.xvtVideoKey=e)),this._mountedElements.add(i))}unmarkMounted(i){i&&(i.dataset&&(delete i.dataset.xvtMounted,delete i.dataset.xvtVideoKey),this._mountedElements.delete(i))}getPerVideoData(i){if(i)return this._perVideoData.get(i)}setPerVideoData(i,e){if(!i||!e)return;const n=this._perVideoData.get(i)||{};this._perVideoData.set(i,{...n,...e})}reset(i=!0){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,i&&this._dismissedKeys.clear()}getDismissedCount(){return this._dismissedKeys.size}}function Dt(){return new Nt}const Y=Dt();function bt(t,i){if(!(!t||t.nodeType!==1)){if(t.tagName==="VIDEO"){i.add(t);return}if(typeof t.querySelectorAll=="function")try{const e=t.querySelectorAll("video");for(let n=0;n<e.length;n++)i.add(e[n])}catch{}}}function wt(t={}){const{onVideoDetected:i,onVideoRemoved:e,root:n=typeof document<"u"?document.body:null,stateStore:s=Y,detectVideos:r=dt,findTweetContainer:o=st,extractTweetInfo:u=mt,scheduler:c=typeof requestAnimationFrame=="function"?requestAnimationFrame:f=>setTimeout(f,16),canceler:b=typeof cancelAnimationFrame=="function"?cancelAnimationFrame:f=>clearTimeout(f)}=t;let v=null,S=!1,_=null;const h=new Set;function y(f){var g;if(!f||f.isConnected===!1||s.isMounted(f)||s.isDismissed(void 0,f))return;const I=o(f);if(!I)return;const A=u(I,f);if(!A||!A.tweetId)return;const k=rt(A.tweetId,A.mediaIndex,A.mediaFingerprint||f);if(!s.isDismissed(k,f)){if(!f.getAttribute("src")&&!f.src&&!((g=f.querySelector)!=null&&g.call(f,"source"))&&!f.getAttribute("poster")){const R=()=>{f.removeEventListener("loadedmetadata",R),f.removeEventListener("loadstart",R),!s.isMounted(f)&&!s.isDismissed(void 0,f)&&(h.add(f),m())};f.addEventListener("loadedmetadata",R,{once:!0}),f.addEventListener("loadstart",R,{once:!0})}if(s.markMounted(f,k),s.setPerVideoData(f,{videoKey:k,...A,detectedAt:Date.now()}),typeof i=="function")try{i(f,A)}catch(R){console.error("[X Video Tools] Error in onVideoDetected callback:",R)}}}function N(){if(_=null,h.size===0)return;const f=Array.from(h);h.clear();for(let I=0;I<f.length;I++)y(f[I])}function m(){_===null&&(_=c(()=>{N()}))}function l(f){var A;if(!S)return;let I=!1;for(let k=0;k<f.length;k++){const g=f[k];if(g.type==="attributes"){const R=g.target;R&&R.tagName==="VIDEO"&&!s.isMounted(R)&&!s.isDismissed(void 0,R)&&(h.add(R),I=!0);continue}if(g.type==="childList"){g.target&&g.target.tagName==="VIDEO"&&!s.isMounted(g.target)&&!s.isDismissed(void 0,g.target)&&(h.add(g.target),I=!0);const R=g.removedNodes;if(R&&R.length>0){const w=new Set;for(let D=0;D<R.length;D++){const V=R[D];V.nodeType===1&&bt(V,w)}for(const D of w)if(s.unmarkMounted(D),typeof e=="function")try{e(D)}catch(V){console.error("[X Video Tools] Error in onVideoRemoved callback:",V)}}const U=g.addedNodes;if(!U||U.length===0)continue;for(let w=0;w<U.length;w++){const D=U[w];if(D.nodeType===1){const V=h.size;if(bt(D,h),h.size>V&&(I=!0),D.tagName==="TIME"||typeof D.querySelector=="function"&&D.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]')){const G=(A=D.closest)==null?void 0:A.call(D,'article[data-testid="tweet"]');if(G){const $=G.querySelectorAll("video");for(let z=0;z<$.length;z++)!s.isMounted($[z])&&!s.isDismissed(void 0,$[z])&&(h.add($[z]),I=!0)}}}}}}I&&m()}function d(f){const I=f||n||(typeof document<"u"?document.body:null);if(!I)return;const A=r(I);for(let k=0;k<A.length;k++)h.add(A[k]);h.size>0&&N()}function p(f){if(S)return;const I=f||n||(typeof document<"u"?document.body:null);if(!I){console.warn("[X Video Tools] No valid root found to start VideoObserver.");return}if(typeof MutationObserver>"u"){console.warn("[X Video Tools] MutationObserver is not supported in this environment.");return}v=new MutationObserver(l),v.observe(I,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","poster","data-media-id"],characterData:!1}),S=!0,d(I)}function x(){v&&(v.disconnect(),v=null),_!==null&&(b(_),_=null),h.clear(),S=!1}function L(f=!1){x(),f&&s&&s.reset()}function M(){return S}return{start:p,stop:x,scan:d,reset:L,isActive:M,isRunning:M,_getPendingSize:()=>h.size}}const Ot=`
:host {
  all: initial;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
  pointer-events: auto;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Outer hit-box buffer wrapper (~6px padding) for anti-flicker pointer transitions */
.xvt-toolbar-container {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  padding: 6px;
  margin: -6px;
  pointer-events: auto;
}

/* Horizontal Pill Toolbar */
.xvt-toolbar-pill,
.xvt-toolbar-vertical {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  height: 32px;
  padding: 2px 6px;
  background: rgba(15, 20, 25, 0.65);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  gap: 2px;
  user-select: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s ease;
}

/* Visibility states */
.xvt-toolbar-container.xvt-idle .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-idle .xvt-toolbar-vertical {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px);
}
.xvt-toolbar-container.xvt-idle {
  pointer-events: none;
}

/* Ensure Media Picker popover retains pointer-events even if container enters idle or mouse drifts */
.xvt-toolbar-container.xvt-idle:has(.xvt-picker-popover),
.xvt-toolbar-container:has(.xvt-picker-popover),
.xvt-picker-popover {
  pointer-events: auto;
}

.xvt-toolbar-container.xvt-hovered .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-hovered .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-processing .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-processing .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-success .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-success .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-error .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-error .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-vertical {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}
.xvt-toolbar-container.xvt-hovered,
.xvt-toolbar-container.xvt-processing,
.xvt-toolbar-container.xvt-ambiguous,
.xvt-toolbar-container.xvt-success,
.xvt-toolbar-container.xvt-error,
.xvt-toolbar-container.xvt-unconfigured {
  pointer-events: auto;
}

/* Dismissing state animation (~150ms) */
.xvt-toolbar-container.xvt-dismissing .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-dismissing .xvt-toolbar-vertical {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.92);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.xvt-toolbar-container.xvt-dismissing {
  pointer-events: none;
}

/* Buttons inside pill: compact circular icon buttons */
.xvt-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #E7E9EA;
  cursor: pointer;
  border-radius: 9999px;
  line-height: 1;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.xvt-btn:focus-visible {
  outline: 2px solid #1d9bf0;
  outline-offset: 1px;
}

.xvt-btn:active {
  transform: scale(0.92);
}

.xvt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Primary Button: Tải video */
.xvt-btn-download:hover {
  background-color: rgba(29, 155, 240, 0.25);
  color: #1d9bf0;
}

/* Secondary Button: Mở CDN */
.xvt-btn-cdn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

/* Utility Button: Đóng / Ẩn */
.xvt-btn-dismiss {
  color: rgba(231, 233, 234, 0.65);
}

.xvt-btn-dismiss:hover {
  color: #FFFFFF;
  background-color: rgba(244, 33, 46, 0.2);
}

/* Divider line between buttons */
.xvt-divider {
  width: 1px;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.15);
  margin: 0 1px;
}

/* Hover Tooltips: Floating popup below the button */
.xvt-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 10001;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
}

.xvt-btn:hover .xvt-tooltip,
.xvt-btn:focus-visible .xvt-tooltip {
  opacity: 1;
  visibility: visible;
}

/* Feedback Notice Banner */
.xvt-notice {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  padding: 6px 10px;
  background: rgba(15, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #E7E9EA;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  z-index: 10001;
}

.xvt-notice.xvt-notice-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* Spinner Animation */
@keyframes xvt-spin {
  to {
    transform: rotate(360deg);
  }
}

.xvt-spinner {
  animation: xvt-spin 1s linear infinite;
}
`,B={DOWNLOAD:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',CDN:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',CLOSE:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',SPINNER:'<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',CHECKMARK:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',ERROR:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'},a=Object.freeze({IDLE:"idle",HOVERED:"hovered",PROCESSING:"processing",AMBIGUOUS:"ambiguous",SUCCESS:"success",ERROR:"error",UNCONFIGURED:"unconfigured",DISMISSED:"dismissed"}),Lt={[a.IDLE]:new Set([a.HOVERED,a.UNCONFIGURED,a.PROCESSING,a.DISMISSED]),[a.HOVERED]:new Set([a.IDLE,a.PROCESSING,a.UNCONFIGURED,a.DISMISSED]),[a.UNCONFIGURED]:new Set([a.HOVERED,a.IDLE,a.PROCESSING,a.DISMISSED]),[a.PROCESSING]:new Set([a.SUCCESS,a.ERROR,a.AMBIGUOUS,a.HOVERED,a.IDLE,a.DISMISSED]),[a.AMBIGUOUS]:new Set([a.PROCESSING,a.SUCCESS,a.ERROR,a.HOVERED,a.IDLE,a.DISMISSED]),[a.SUCCESS]:new Set([a.HOVERED,a.IDLE,a.DISMISSED]),[a.ERROR]:new Set([a.PROCESSING,a.HOVERED,a.IDLE,a.DISMISSED]),[a.DISMISSED]:new Set};class kt{constructor(i=a.IDLE){this._state=i,this._payload=null,this._listeners=new Set}getState(){return this._state}getPayload(){return this._payload}isDismissed(){return this._state===a.DISMISSED}isVisible(){return this._state!==a.IDLE&&this._state!==a.DISMISSED}setState(i,e=null){if(this._state===a.DISMISSED)return!1;if(this._state===i)return this._payload=e,this._notify(this._state,this._state,e),!0;const n=Lt[this._state];if(!n||!n.has(i))return console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${i}`),!1;const s=this._state;return this._state=i,this._payload=e,this._notify(this._state,s,e),!0}subscribe(i){return typeof i!="function"?()=>{}:(this._listeners.add(i),()=>{this._listeners.delete(i)})}_notify(i,e,n){for(const s of this._listeners)try{s(i,e,n)}catch(r){console.error("[X Video Tools] Error in toolbar state subscriber:",r)}}destroy(){this._listeners.clear(),this._payload=null}}function Ct(t){return new kt(t)}const Mt="video.twimg.com";function Z(t){if(!t||typeof t!="string")return!1;const i=t.trim();if(!i||i.startsWith("blob:")||i.startsWith("data:")||i.startsWith("javascript:"))return!1;try{const e=new URL(i);if(e.protocol!=="https:"||e.hostname.toLowerCase()!==Mt)return!1;const s=e.pathname;if(!s||s==="/"||s.trim()==="")return!1;const r=s.toLowerCase();return!(r.endsWith(".jpg")||r.endsWith(".jpeg")||r.endsWith(".png")||r.endsWith(".webp"))}catch{return!1}}function Ut(t){if(!t||typeof t!="object")return null;function i(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("blob:")||n.startsWith("data:")||!Z(n))return null;try{const r=new URL(n).pathname.toLowerCase();return r.includes("_thumb")||r.endsWith(".jpg")||r.endsWith(".png")||r.endsWith(".webp")?null:r.endsWith(".mp4")||r.includes(".mp4")||r.includes("/vid/")||r.includes("/pu/vid/")?n:null}catch{return null}}try{const e=t.currentSrc,n=i(e);if(n)return n}catch{}try{const e=t.src||(typeof t.getAttribute=="function"?t.getAttribute("src"):null),n=i(e);if(n)return n}catch{}try{if(typeof t.querySelectorAll=="function"){const e=t.querySelectorAll("source");for(const n of e){const s=n.src||n.getAttribute("src"),r=i(s);if(r)return r}}}catch{}return null}function vt(t){if(!t||typeof t!="string")return 0;const i=t.match(/\/(\d+)x(\d+)\//);if(!i)return 0;const e=Number(i[1]),n=Number(i[2]);return isNaN(e)||isNaN(n)||e<=0||n<=0?0:e*n}function yt(t){var n,s,r,o;if(!t||typeof t!="object")return!1;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((s=t.dimensions)==null?void 0:s.width)),e=Number(t.height??((r=t.original_info)==null?void 0:r.height)??((o=t.dimensions)==null?void 0:o.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0||typeof t.resolution=="string"&&/^\d+x\d+$/.test(t.resolution))return!0;if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return!0}return!1}function J(t){var n,s,r,o;if(!t||typeof t!="object")return 0;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((s=t.dimensions)==null?void 0:s.width)),e=Number(t.height??((r=t.original_info)==null?void 0:r.height)??((o=t.dimensions)==null?void 0:o.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0)return i*e;if(typeof t.resolution=="string"){const u=t.resolution.match(/^(\d+)x(\d+)$/);if(u){const c=Number(u[1]),b=Number(u[2]);if(c>0&&b>0)return c*b}}else if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return u*c}return t.url&&typeof t.url=="string"?vt(t.url):0}function Vt(t,i){const e=yt(t),n=yt(i),s=J(t),r=J(i),o=Number(t.bitrate||0),u=Number(i.bitrate||0);if(e&&n)return s!==r?r-s:u-o;if(e&&!n){if(s>=r||s>0&&o>=u)return-1}else if(!e&&n&&(r>=s||r>0&&u>=o))return 1;return s>0&&r>0?s!==r?r-s:u-o:o!==u?u-o:r-s}function gt(t){if(!Array.isArray(t)||t.length===0)return null;const i=t.filter(r=>!r||typeof r!="object"||r.content_type!=="video/mp4"||!r.url||typeof r.url!="string"?!1:Z(r.url));if(i.length===0)return null;let e=i[0];for(let r=1;r<i.length;r++){const o=i[r];Vt(e,o)>0&&(e=o)}const n=J(e),s=Number(e.bitrate||0);return{...e,url:e.url,isHls:!1,resolution:n,bitrate:s}}function xt(t){if(!Array.isArray(t)||t.length===0)return null;const i=gt(t);if(i)return i;const e=t.find(n=>{if(!n||typeof n!="object"||!n.url)return!1;const s=n.content_type==="application/x-mpegURL"||n.content_type==="application/vnd.apple.mpegurl",r=n.url.toLowerCase().includes(".m3u8");return(s||r)&&Z(n.url)});return e?{...e,url:e.url,isHls:!0,bitrate:Number(e.bitrate||0)}:null}function Et(t){var i;return!t||typeof t!="object"?!1:t.type==="video"||t.type==="animated_gif"||!!((i=t.video_info)!=null&&i.variants)}function St(t){var e;const i=[];if(!t)return i;if(t.id_str&&i.push(String(t.id_str)),t.media_url_https){const n=t.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);n&&i.push(n[1])}if(Array.isArray((e=t.video_info)==null?void 0:e.variants)){for(const n of t.video_info.variants)if(n.url){const s=n.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);s&&i.push(s[1])}}return i}function _t(t,i={},e=null){if(!Array.isArray(t)||t.length===0)return{media:null,ambiguous:!1,candidates:[]};const n=t.filter(Et);if(n.length===0)return{media:null,ambiguous:!1,candidates:[]};const s=i.mediaIndex;if(typeof s=="number"&&s>0){const o=t[s-1];if(o&&Et(o))return{media:o,ambiguous:!1,candidates:n}}let r=i.mediaFingerprint;if(!r&&e){const o=e.getAttribute("poster")||e.poster;if(o){const u=o.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);u&&(r=u[1])}}if(r&&typeof r=="string"){const o=r.trim(),u=n.filter(c=>St(c).some(v=>v===o));if(u.length===1)return{media:u[0],ambiguous:!1,candidates:n};if(u.length===0){const c=n.filter(b=>St(b).some(S=>o.includes(S)||S.includes(o)));if(c.length===1)return{media:c[0],ambiguous:!1,candidates:n}}}return n.length===1?{media:n[0],ambiguous:!1,candidates:n}:{media:null,ambiguous:!0,candidates:n}}const E=Object.freeze({NO_TWEET_INFO:"ERR_NO_TWEET_INFO",TWEET_INACCESSIBLE:"ERR_TWEET_INACCESSIBLE",RATE_LIMITED:"ERR_RATE_LIMITED",NETWORK_TIMEOUT:"ERR_NETWORK_TIMEOUT",NO_MEDIA:"ERR_NO_MEDIA",NO_SUPPORTED_VARIANT:"ERR_NO_SUPPORTED_VARIANT",AMBIGUOUS_MEDIA:"ERR_AMBIGUOUS_MEDIA",INVALID_URL:"ERR_INVALID_URL",TAB_CREATE_FAILED:"ERR_TAB_CREATE_FAILED",NETWORK_ERROR:"ERR_NETWORK_ERROR"}),H=Object.freeze({[E.NO_TWEET_INFO]:"Không tìm thấy thông tin bài viết",[E.TWEET_INACCESSIBLE]:"Tweet không tồn tại hoặc bị giới hạn quyền riêng tư",[E.RATE_LIMITED]:"Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau",[E.NETWORK_TIMEOUT]:"Lỗi kết nối mạng hoặc yêu cầu quá thời gian",[E.NO_MEDIA]:"Không tìm thấy video trong bài viết",[E.NO_SUPPORTED_VARIANT]:"Không tìm thấy định dạng video tương thích",[E.AMBIGUOUS_MEDIA]:"Có nhiều video. Vui lòng chọn video cần mở",[E.INVALID_URL]:"URL CDN không hợp lệ hoặc không an toàn",[E.TAB_CREATE_FAILED]:"Không thể mở tab mới",[E.NETWORK_ERROR]:"Lỗi kết nối mạng"});function at(t){return new Promise(i=>{let e=!1;function n(s){e||(e=!0,i(s))}try{const s=chrome.runtime.sendMessage(t,r=>{chrome.runtime.lastError?n({success:!1,error:"NETWORK_ERROR",message:chrome.runtime.lastError.message}):n(r||{success:!0})});s&&typeof s.then=="function"&&s.then(r=>n(r||{success:!0})).catch(r=>{n({success:!1,error:"NETWORK_ERROR",message:(r==null?void 0:r.message)||"Message error"})})}catch(s){n({success:!1,error:"NETWORK_ERROR",message:s.message})}})}async function Pt(t,i={},e={}){var u,c,b,v,S,_;const n=!!(e.shiftKey||e.isShiftClick),s=(t==null?void 0:t.src)||(typeof(t==null?void 0:t.getAttribute)=="function"?t.getAttribute("src"):null);if(s&&typeof s=="string"&&!s.startsWith("blob:")&&s.trim()!==""&&!Z(s))return{success:!1,code:E.INVALID_URL,error:H[E.INVALID_URL]};const r=Ut(t),o=(i==null?void 0:i.tweetId)||((u=t==null?void 0:t.dataset)==null?void 0:u.xvtTweetId)||((v=(b=(c=t==null?void 0:t.closest)==null?void 0:c.call(t,"article"))==null?void 0:b.id)==null?void 0:v.replace("tweet-",""))||null;if(r){const h=vt(r)||(t!=null&&t.videoWidth&&(t!=null&&t.videoHeight)?t.videoWidth*t.videoHeight:0);if(o&&h<3840*2160)try{const y=await at({action:"FETCH_SYNDICATION",payload:{tweetId:o}});if(y!=null&&y.success&&(y!=null&&y.data)){const N=y.data.mediaDetails||[];let m=null;const l=_t(N,i,t);if(l.media)m=l.media;else if(l.ambiguous){const d=r.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);if(d){const p=d[1];m=l.candidates.find(x=>{var L,M;return x.id_str===p?!0:(M=(L=x.video_info)==null?void 0:L.variants)==null?void 0:M.some(f=>f.url&&f.url.includes(`/${p}/`))})}}if(m){const d=gt((S=m.video_info)==null?void 0:S.variants);if(d){const p=d.resolution??J(d);if(h>0&&p>h||h===0&&p>0)return tt(d.url,!1,n)}}}}catch{}return tt(r,!1,n)}if(o)try{const h=await at({action:"FETCH_SYNDICATION",payload:{tweetId:o}});if(h.success&&h.data){const N=h.data.mediaDetails||[],m=_t(N,i,t);if(m.ambiguous)return typeof e.onAmbiguous=="function"&&e.onAmbiguous(m.candidates,async l=>{var p;const d=xt((p=l==null?void 0:l.video_info)==null?void 0:p.variants);return d?tt(d.url,!!d.isHls,n):{success:!1,code:E.NO_SUPPORTED_VARIANT,error:H[E.NO_SUPPORTED_VARIANT]}}),{success:!1,isAmbiguous:!0,code:E.AMBIGUOUS_MEDIA,error:H[E.AMBIGUOUS_MEDIA],candidates:m.candidates};if(m.media){const l=xt((_=m.media.video_info)==null?void 0:_.variants);return l?tt(l.url,!!l.isHls,n):{success:!1,code:E.NO_SUPPORTED_VARIANT,error:H[E.NO_SUPPORTED_VARIANT]}}return{success:!1,code:E.NO_MEDIA,error:H[E.NO_MEDIA]}}const y=Bt(h.error);return{success:!1,code:y,error:H[y]||h.message||"Lỗi kết nối máy chủ X"}}catch(h){return{success:!1,code:E.NETWORK_ERROR,error:h.message||H[E.NETWORK_ERROR]}}return{success:!1,code:E.NO_TWEET_INFO,error:H[E.NO_TWEET_INFO]}}async function tt(t,i,e){var n;if(!Z(t))return{success:!1,code:E.INVALID_URL,error:H[E.INVALID_URL]};if(e)try{if(typeof navigator<"u"&&((n=navigator.clipboard)!=null&&n.writeText))return await navigator.clipboard.writeText(t),{success:!0,url:t,isHls:i,copied:!0}}catch{}try{const s=await at({action:"OPEN_CDN",payload:{url:t}});return s&&s.success===!1?{success:!1,code:E.TAB_CREATE_FAILED,error:s.message||H[E.TAB_CREATE_FAILED]}:{success:!0,url:t,isHls:i,tabOpened:!0}}catch(s){return{success:!1,code:E.TAB_CREATE_FAILED,error:s.message||H[E.TAB_CREATE_FAILED]}}}function Bt(t){switch(t){case"API_RATE_LIMIT":case"RATE_LIMIT":case"ERR_RATE_LIMITED":return E.RATE_LIMITED;case"TWEET_INACCESSIBLE":case"NOT_FOUND":case"ERR_TWEET_NOT_FOUND":case"ERR_AGE_RESTRICTED":return E.TWEET_INACCESSIBLE;case"API_TIMEOUT":case"TIMEOUT":case"ERR_NETWORK_TIMEOUT":return E.NETWORK_TIMEOUT;case"NO_MEDIA":case"ERR_NO_MEDIA":return E.NO_MEDIA;default:return E.NETWORK_ERROR}}const Ht=`
.xvt-picker-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  max-width: 300px;
  background: rgba(15, 20, 25, 0.95);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 8px;
  z-index: 10002;
  color: #E7E9EA;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  animation: xvt-popover-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

@keyframes xvt-popover-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.xvt-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 6px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 6px;
}

.xvt-picker-title {
  font-size: 11px;
  font-weight: 600;
  color: #71767B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.xvt-picker-close {
  background: transparent;
  border: none;
  color: #71767B;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  line-height: 1;
  font-size: 14px;
}

.xvt-picker-close:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
}

.xvt-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.xvt-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  user-select: none;
}

.xvt-picker-item:hover,
.xvt-picker-item:focus-visible {
  background: rgba(29, 155, 240, 0.25);
  outline: none;
}

.xvt-picker-item:active {
  transform: scale(0.98);
}

.xvt-picker-thumb {
  width: 44px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  background: #000000;
  flex-shrink: 0;
}

.xvt-picker-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.xvt-picker-label {
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xvt-picker-meta {
  font-size: 10px;
  color: #71767B;
}
`;function Ft(t){var e;if(!t||typeof t!="object")return null;if(t.resolution){const n=String(t.resolution).trim();if(n.length>0)return n}const i=(e=t.video_info)==null?void 0:e.variants;if(Array.isArray(i)&&i.length>0){let n=0,s=0;for(const r of i){if(!r||typeof r.url!="string")continue;const o=r.url.match(/\/(\d+)x(\d+)\//);if(o){const u=Number(o[1]),c=Number(o[2]);!isNaN(u)&&!isNaN(c)&&u*c>s*n&&(s=u,n=c)}}if(n>0)return`${n}p`}return null}function Wt(t,i=[],{onSelect:e,onCancel:n}={}){if(!t)return{destroy:()=>{}};const s=t.querySelector(".xvt-picker-popover");s&&s.remove();let r=t.querySelector("#xvt-picker-styles");r||(r=document.createElement("style"),r.id="xvt-picker-styles",r.textContent=Ht,t.appendChild(r));const o=document.createElement("div");o.className="xvt-picker-popover",o.setAttribute("role","dialog"),o.setAttribute("aria-label","Chọn video để mở");const u=document.createElement("div");u.className="xvt-picker-header";const c=document.createElement("span");c.className="xvt-picker-title",c.textContent="Chọn video";const b=document.createElement("button");b.className="xvt-picker-close",b.setAttribute("aria-label","Đóng"),b.innerHTML="&times;",u.appendChild(c),u.appendChild(b),o.appendChild(u);const v=document.createElement("div");v.className="xvt-picker-list",v.setAttribute("role","menu"),i.forEach((l,d)=>{var k;const p=document.createElement("div");if(p.className="xvt-picker-item",p.setAttribute("role","menuitem"),p.setAttribute("tabindex","0"),l.media_url_https){const g=document.createElement("img");g.className="xvt-picker-thumb",g.src=l.media_url_https,g.alt=`Thumbnail Video ${d+1}`,p.appendChild(g)}const x=document.createElement("div");x.className="xvt-picker-info";const L=document.createElement("span");L.className="xvt-picker-label",L.textContent=`Video ${d+1}`;const M=document.createElement("span");M.className="xvt-picker-meta";let f=null;if((k=l.video_info)!=null&&k.aspect_ratio){const[g,R]=l.video_info.aspect_ratio;f=`${g}:${R}`}const I=Ft(l);f&&I?M.textContent=`${f} • ${I}`:f?M.textContent=f:I?M.textContent=I:M.textContent=l.type||"MP4",x.appendChild(L),x.appendChild(M),p.appendChild(x);const A=g=>{g.stopPropagation(),g.preventDefault(),_(),typeof e=="function"&&e(l,d)};p.addEventListener("click",A),p.addEventListener("keydown",g=>{(g.key==="Enter"||g.key===" ")&&A(g)}),v.appendChild(p)}),o.appendChild(v);let S=null;function _(){S!==null&&(clearTimeout(S),S=null),document.removeEventListener("click",N,!0),document.removeEventListener("keydown",y),o.parentNode&&o.parentNode.removeChild(o)}function h(l){l&&(l.stopPropagation(),l.preventDefault()),_(),typeof n=="function"&&n()}function y(l){l.key==="Escape"&&h(l)}function N(l){(typeof l.composedPath=="function"?l.composedPath():[]).includes(o)||o.contains&&o.contains(l.target)||h(l)}return b.addEventListener("click",h),document.addEventListener("keydown",y),S=setTimeout(()=>{document.addEventListener("click",N,!0)},0),(t.querySelector(".xvt-toolbar-container")||t).appendChild(o),{destroy:_}}const Kt=300,K=2500,Tt=250;function qt({host:t,wrapper:i,video:e,stateManager:n,toolbarController:s,stateStore:r,tweetInfo:o={},options:u={}}){var $,z;let c=!1,b=!1,v=null,S=0;function _(){v!==null&&(clearTimeout(v),v=null)}function h(){_(),v=setTimeout(()=>{!c&&!b&&!n.isDismissed()&&n.getState()!==a.AMBIGUOUS&&s.hide(),v=null},Kt)}function y(){var T;n.isDismissed()||(c=!0,_(),(T=s.updatePosition)==null||T.call(s),s.show())}function N(){var T;n.isDismissed()||c||(c=!0,_(),(T=s.updatePosition)==null||T.call(s),s.show())}function m(T){if(n.isDismissed())return;const P=T.relatedTarget;P&&(P===t||t.contains(P))||(c=!1,h())}function l(){n.isDismissed()||(b=!0,_(),s.show())}function d(){n.isDismissed()||b||(b=!0,_(),s.show())}function p(T){if(n.isDismissed())return;const P=T.relatedTarget;P&&(P===i||i.contains(P))||(b=!1,h())}function x(T){T.stopPropagation()}function L(T){if(T.stopPropagation(),T.preventDefault(),n.isDismissed())return;const P=Date.now();if(P-S<Tt)return;S=P;const et="Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";s.showNotice(et,K),n.setState(a.UNCONFIGURED,{message:et})}function M(T){if(T.stopPropagation(),T.preventDefault(),n.isDismissed()||n.getState()===a.PROCESSING)return;const P=Date.now();if(P-S<Tt)return;if(S=P,u.enableCdnResolver===!1){const O="Tính năng Mở CDN sẽ được tích hợp ở Phase 3.";s.showNotice(O,K),n.setState(a.UNCONFIGURED,{message:O});return}const et=!!T.shiftKey;n.setState(a.PROCESSING,{action:"cdn"});const Yt=u.cdnResolver||Pt;function X(O){if(O){if(O.isAmbiguous){n.getState()!==a.AMBIGUOUS&&n.setState(a.AMBIGUOUS,{candidates:O.candidates});return}O.success?(n.setState(a.SUCCESS,{action:"cdn"}),O.copied?s.showNotice("Đã sao chép liên kết CDN",K):O.isHls?s.showNotice("Đang mở luồng HLS (.m3u8)",K):s.showNotice("Đã mở tab CDN",K),setTimeout(()=>{n.getState()===a.SUCCESS&&n.setState(c||b?a.HOVERED:a.IDLE)},K)):(n.setState(a.ERROR,{action:"cdn",error:O.code||O.error}),s.showNotice(O.error||"Lỗi khi mở CDN",K),setTimeout(()=>{n.getState()===a.ERROR&&n.setState(c||b?a.HOVERED:a.IDLE)},K))}}try{const O=Yt(e,o,{shiftKey:et,onAmbiguous:(F,Zt)=>{n.setState(a.AMBIGUOUS,{candidates:F}),Wt(s.shadowRoot,F,{onSelect:async(Jt,te)=>{n.setState(a.PROCESSING,{action:"cdn"});try{const ct=await Zt(Jt);X(ct)}catch(ct){X({success:!1,error:ct.message||"Lỗi xử lý video"})}},onCancel:()=>{n.setState(c||b?a.HOVERED:a.IDLE)}})}});O&&typeof O.then=="function"?O.then(F=>{if(F!=null&&F.isAmbiguous){n.getState()!==a.AMBIGUOUS&&n.setState(a.AMBIGUOUS,{candidates:F.candidates});return}X(F)}).catch(F=>{X({success:!1,error:F.message||"Lỗi kết nối máy chủ X"})}):O!=null&&O.isAmbiguous?n.getState()!==a.AMBIGUOUS&&n.setState(a.AMBIGUOUS,{candidates:O.candidates}):X(O)}catch(O){X({success:!1,error:O.message||"Lỗi kết nối máy chủ X"})}}function f(T){T.stopPropagation(),T.preventDefault(),_(),s.dismiss()}function I(T,P){(T.key==="Enter"||T.key===" ")&&(T.preventDefault(),P(T))}i&&(i.addEventListener("mouseenter",y),i.addEventListener("mousemove",N),i.addEventListener("mouseleave",m));const A=($=e==null?void 0:e.closest)==null?void 0:$.call(e,'[data-testid="videoPlayer"]');if(A&&A!==i&&(A.addEventListener("mouseenter",y),A.addEventListener("mousemove",N)),e&&e!==i&&e!==A&&(e.addEventListener("mouseenter",y),e.addEventListener("mousemove",N)),t&&(t.addEventListener("mouseenter",l),t.addEventListener("mousemove",d),t.addEventListener("mouseleave",p),t.addEventListener("click",x),t.addEventListener("mousedown",x),t.addEventListener("mouseup",x)),typeof(i==null?void 0:i.matches)=="function")try{(i.matches(":hover")||A&&A.matches(":hover")||e&&((z=e.matches)!=null&&z.call(e,":hover")))&&(c=!0,s.show())}catch{}const k=t.shadowRoot;let g=null,R=null,U=null,w=null,D=null,V=null;k&&(g=k.querySelector(".xvt-btn-download"),R=k.querySelector(".xvt-btn-cdn"),U=k.querySelector(".xvt-btn-dismiss"),g&&(g.addEventListener("click",L),w=T=>I(T,L),g.addEventListener("keydown",w)),R&&(R.addEventListener("click",M),D=T=>I(T,M),R.addEventListener("keydown",D)),U&&(U.addEventListener("click",f),V=T=>I(T,f),U.addEventListener("keydown",V)));function G(){_(),i&&(i.removeEventListener("mouseenter",y),i.removeEventListener("mousemove",N),i.removeEventListener("mouseleave",m)),A&&A!==i&&(A.removeEventListener("mouseenter",y),A.removeEventListener("mousemove",N)),e&&e!==i&&e!==A&&(e.removeEventListener("mouseenter",y),e.removeEventListener("mousemove",N)),t&&(t.removeEventListener("mouseenter",l),t.removeEventListener("mousemove",d),t.removeEventListener("mouseleave",p),t.removeEventListener("click",x),t.removeEventListener("mousedown",x),t.removeEventListener("mouseup",x)),g&&(g.removeEventListener("click",L),w&&g.removeEventListener("keydown",w)),R&&(R.removeEventListener("click",M),D&&R.removeEventListener("keydown",D)),U&&(U.removeEventListener("click",f),V&&U.removeEventListener("keydown",V))}return{cleanup:G,cancelHideTimer:_,isHoveringVideo:()=>c,isHoveringToolbar:()=>b,getHideTimer:()=>v}}const Gt=150;function zt(t,i={},e={}){const n=e.stateStore||Y,s=t.closest('[data-testid="videoComponent"]'),r=t.closest('[data-testid="videoPlayer"]'),o=s||r||t.parentElement;if(!o)return console.warn("[X Video Tools] Cannot attach toolbar: no valid video wrapper found."),null;if(typeof window<"u")try{const w=window.getComputedStyle(o).position;if((w==="static"||!w)&&(o.style.position="relative"),o.style.setProperty("overflow","visible","important"),o.parentElement&&o.parentElement.tagName!=="ARTICLE"&&o.parentElement!==document.body){const D=window.getComputedStyle(o.parentElement).overflow;(D==="hidden"||D==="clip")&&o.parentElement.style.setProperty("overflow","visible","important")}}catch{o.style.position="relative",o.style.setProperty("overflow","visible","important")}else(!o.style.position||o.style.position==="static")&&(o.style.position="relative");const u=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?rt(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null),c=document.createElement("div");c.className="xvt-toolbar-host",c.setAttribute("data-xvt-mounted","true"),c.style.position="absolute",c.style.top="10px",c.style.left="10px",c.style.zIndex="9999";function b(){c.style.top="10px",c.style.left="10px",c.style.right="auto",c.style.transform="none"}b();const v=c.attachShadow({mode:"open"}),S=document.createElement("style");S.textContent=Ot,v.appendChild(S);const _=document.createElement("div");_.className="xvt-toolbar-container xvt-idle",_.innerHTML=`
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${B.DOWNLOAD}</span>
        <div class="xvt-tooltip" role="tooltip">Tải</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${B.CDN}</span>
        <div class="xvt-tooltip" role="tooltip">Link</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${B.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `,v.appendChild(_);const h=v.querySelector(".xvt-notice"),y=v.querySelector(".xvt-btn-download .xvt-btn-icon"),N=v.querySelector(".xvt-btn-download"),m=v.querySelector(".xvt-btn-cdn"),l=v.querySelector(".xvt-btn-cdn .xvt-btn-icon"),d=Ct(a.IDLE);let p=null,x=null;d.subscribe((w,D,V)=>{_.classList.remove("xvt-idle","xvt-hovered","xvt-processing","xvt-ambiguous","xvt-success","xvt-error","xvt-unconfigured","xvt-dismissing"),_.classList.add(`xvt-${w}`);const G=(V==null?void 0:V.action)==="cdn";w===a.PROCESSING?G?(l&&(l.innerHTML=B.SPINNER),m&&m.setAttribute("aria-busy","true")):(y&&(y.innerHTML=B.SPINNER),N&&N.setAttribute("aria-busy","true")):w===a.SUCCESS?G?(l&&(l.innerHTML=B.CHECKMARK),m&&m.removeAttribute("aria-busy")):(y&&(y.innerHTML=B.CHECKMARK),N&&N.removeAttribute("aria-busy")):w===a.ERROR?G?(l&&(l.innerHTML=B.ERROR),m&&m.removeAttribute("aria-busy")):(y&&(y.innerHTML=B.ERROR),N&&N.removeAttribute("aria-busy")):(y&&(y.innerHTML=B.DOWNLOAD),N&&N.removeAttribute("aria-busy"),l&&(l.innerHTML=B.CDN),m&&m.removeAttribute("aria-busy")),w===a.IDLE&&M()});function L(w,D=2500){h&&(p!==null&&(clearTimeout(p),p=null),h.textContent=w,h.classList.add("xvt-notice-visible"),p=setTimeout(()=>{M()},D))}function M(){p!==null&&(clearTimeout(p),p=null),h&&h.classList.remove("xvt-notice-visible")}function f(){d.isDismissed()||d.setState(a.HOVERED)}function I(){d.isDismissed()||d.getState()===a.AMBIGUOUS||d.setState(a.IDLE)}function A(){d.isDismissed()||(d.setState(a.DISMISSED),n.dismiss(u,t),_.classList.remove("xvt-hovered","xvt-idle","xvt-unconfigured"),_.classList.add("xvt-dismissing"),x=setTimeout(()=>{g()},Gt))}const k=e.onDestroy;function g(){if(p!==null&&(clearTimeout(p),p=null),x!==null&&(clearTimeout(x),x=null),U&&U.cleanup(),c.parentNode&&c.parentNode.removeChild(c),d.destroy(),typeof k=="function")try{k()}catch(w){console.error("[X Video Tools] Error in onDestroy callback:",w)}}o.appendChild(c);const R={host:c,shadowRoot:v,wrapper:o,video:t,stateManager:d,show:f,hide:I,dismiss:A,showNotice:L,hideNotice:M,updatePosition:b,updateState:(w,D)=>d.setState(w,D),destroy:g},U=qt({host:c,wrapper:o,video:t,stateManager:d,toolbarController:R,stateStore:n,tweetInfo:i,options:e});return R.eventController=U,R}const j=new WeakMap;function $t(t,i={},e={}){if(!t||t.nodeType!==1)return null;const n=e.stateStore||Y,s=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?rt(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null);if(n.isDismissed(s,t))return null;if(j.has(t))return j.get(t);const r=t.closest('[data-testid="videoComponent"]'),o=t.closest('[data-testid="videoPlayer"]'),u=r||o||t.parentElement;if(u&&u.querySelector(".xvt-toolbar-host"))return null;const c=zt(t,{...i,videoKey:s},{...e,stateStore:n,onDestroy:()=>{j.delete(t)}});return c?(j.set(t,c),c):null}function jt(t){if(!t)return!1;const i=j.get(t);if(!i){const e=t.closest('[data-testid="videoComponent"]'),n=t.closest('[data-testid="videoPlayer"]'),s=e||n||t.parentElement,r=s==null?void 0:s.querySelector(".xvt-toolbar-host");return r&&r.parentNode?(r.parentNode.removeChild(r),!0):!1}return j.delete(t),i.destroy(),!0}console.log("[X Video Tools] Content Script khởi tạo thành công trên",typeof window<"u"?window.location.hostname:"unknown"),console.log("[X Video Tools] Storage key tham chiếu:",At.SETTINGS);function Xt(t,i){console.log("[X Video Tools] Đã nhận diện video hợp lệ:",{tweetId:i.tweetId,permalink:i.permalink,mediaIndex:i.mediaIndex,isQuoted:i.isQuoted}),$t(t,i,{stateStore:Y})}function Qt(t){jt(t)}const q=wt({root:typeof document<"u"?document.body:null,stateStore:Y,detectVideos:dt,findTweetContainer:st,extractTweetInfo:mt,onVideoDetected:Xt,onVideoRemoved:Qt});if(typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{q.start()}):q.start()),typeof window<"u"){window.addEventListener("pagehide",()=>{q.stop()}),window.addEventListener("popstate",()=>{q.scan()});let t=null;if(window.addEventListener("scroll",()=>{t===null&&(t=setTimeout(()=>{t=null,q.scan()},250))},{passive:!0}),typeof history<"u"){const i=history.pushState;typeof i=="function"&&(history.pushState=function(...n){const s=i.apply(this,n);return setTimeout(()=>q.scan(),0),s});const e=history.replaceState;typeof e=="function"&&(history.replaceState=function(...n){const s=e.apply(this,n);return setTimeout(()=>q.scan(),0),s})}}ut.observer=q,Object.defineProperty(ut,Symbol.toStringTag,{value:"Module"})})(this.XVideoToolsContent=this.XVideoToolsContent||{});

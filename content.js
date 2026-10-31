(function(vt){"use strict";var Ut,Vt,Pt,Bt;const J=Object.freeze({SETTINGS:"xvt_settings",JWT_SESSION:"cobalt_jwt_session"}),tt=Object.freeze({cobaltUrl:"",videoQuality:"1080",apiKey:""});let z={...tt};function Xt(){return!!(z!=null&&z.cobaltUrl&&z.cobaltUrl.trim())}async function xt(){var t,i;try{if(typeof chrome<"u"&&((i=(t=chrome==null?void 0:chrome.storage)==null?void 0:t.local)!=null&&i.get)){const e=await chrome.storage.local.get(J.SETTINGS),n=e==null?void 0:e[J.SETTINGS],o={...tt,...n||{}};return z=o,o}return{...z}}catch(e){return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:",e),z={...tt},{...tt}}}typeof chrome<"u"&&((Vt=(Ut=chrome==null?void 0:chrome.storage)==null?void 0:Ut.local)!=null&&Vt.get)&&(xt().catch(()=>{}),(Bt=(Pt=chrome==null?void 0:chrome.storage)==null?void 0:Pt.onChanged)!=null&&Bt.addListener&&chrome.storage.onChanged.addListener((t,i)=>{if(i==="local"&&t[J.SETTINGS]){const e=t[J.SETTINGS].newValue;z={...tt,...e||{}}}}));const k=Object.freeze({TWEET_ARTICLE:'article[data-testid="tweet"]',TIME_ELEMENT:"time",STATUS_ANCHOR:'a[href*="/status/"], a[href*="/statuses/"]',VIDEO_TAG:"video",VIDEO_PLAYER:'[data-testid="videoPlayer"], [data-testid="videoComponent"]',QUOTE_CONTAINER:'[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',EXCLUDED_COMPOSER:'[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',EXCLUDED_SIDEBAR:'[data-testid="sidebarColumn"], aside',EXCLUDED_DM:'[data-testid="messageEntry"]'}),lt=Object.freeze({TWEET_ID:/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,MEDIA_INDEX:/(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,STATUS_URL:/^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,NUMERIC_ID:/^\d+$/});function yt(t){return!t||typeof t.closest!="function"?!0:!!(t.closest(k.EXCLUDED_COMPOSER)||t.closest(k.EXCLUDED_SIDEBAR)||t.closest(k.EXCLUDED_DM))}function dt(t,i=null){if(!t||typeof t.closest!="function")return null;if(i&&et(i))return i;const e=t.closest(k.QUOTE_CONTAINER);if(e&&et(e)&&(!i||i.contains(e)&&e!==i||e===i))return e;let n=t.parentElement;for(;n&&n!==i&&n!==document.body;){if(et(n))return n;n=n.parentElement}return null}function et(t){var i;return!t||typeof t.getAttribute!="function"?!1:!!(t.getAttribute("data-testid")==="quoteTweet"||t.getAttribute("data-testid")==="tweetQuote"||t.getAttribute("role")==="link"&&((i=t.querySelector)!=null&&i.call(t,'time, a[href*="/status/"], a[href*="/statuses/"]')))}function Qt(t,i){return i?t&&et(t)?!0:!!dt(i,t):!1}function ft(t){if(!t||typeof t.closest!="function"||yt(t))return null;const i=t.closest(k.QUOTE_CONTAINER);if(i&&et(i))return i;const e=t.closest(k.TWEET_ARTICLE);if(e)return dt(t,e)||e;const n=t.closest('div[aria-modal="true"], div[role="dialog"]');if(n)return n.querySelector(k.TWEET_ARTICLE)||n;const o=t.closest('main[role="main"], [data-testid="primaryColumn"]');return o&&typeof window<"u"&&window.location&&(window.location.pathname||window.location.href||"").includes("/status/")?o:null}function Yt(t){return!t||typeof t.closest!="function"||t.isConnected===!1||yt(t)?!1:!!ft(t)}function St(t=document){if(!t||typeof t.querySelectorAll!="function")return[];const i=t.querySelectorAll(k.VIDEO_TAG),e=[];for(let n=0;n<i.length;n++){const o=i[n];Yt(o)&&e.push(o)}return e}function gt(t){var s,a,u,c;if(!t||typeof t.getAttribute!="function")return null;const i=((s=t.dataset)==null?void 0:s.mediaId)||t.getAttribute("data-media-id");if(i&&typeof i=="string"&&i.trim())return i.trim();const e=t.getAttribute("poster")||t.poster;if(e&&typeof e=="string"){const b=e.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);if(b&&b[1])return b[1];const E=e.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);if(E&&E[1])return E[1];const T=e.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);if(T&&T[1])return T[1];try{const h=new URL(e,"https://x.com").pathname.split("/").filter(Boolean);if(h.length>0){const v=h[h.length-1].replace(/\.[^.]+$/,"");if(v&&v!=="img")return v;if(h.length>1)return h[h.length-2]}}catch{}}const n=t.currentSrc||t.getAttribute("src")||t.src||((u=(a=t.querySelector)==null?void 0:a.call(t,"source"))==null?void 0:u.getAttribute("src"));if(n&&typeof n=="string"){const b=n.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);if(b&&b[1])return b[1];const E=n.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);if(E&&E[1])return E[1];const T=n.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);if(T&&T[1])return`blob_${T[1]}`}const o=(c=t.closest)==null?void 0:c.call(t,"[data-media-id]");if(o){const b=o.getAttribute("data-media-id");if(b&&b.trim())return b.trim()}return null}function ot(t,i=null,e=null){var o,s;const n=i??null;if(n!==null)return`${t}_media_${n}`;if(typeof e=="string"&&e.trim().length>0)return`${t}_media_fp_${e.trim()}`;if(e&&typeof e=="object"){const a=gt(e);if(a)return`${t}_media_fp_${a}`;const u=((o=e.closest)==null?void 0:o.call(e,'article, [data-testid="tweet"]'))||e.parentElement,c=(s=u==null?void 0:u.querySelectorAll)==null?void 0:s.call(u,"video");if(c&&c.length>1)return e.dataset||(e.dataset={}),e.dataset.xvtToken||(e.dataset.xvtToken=Math.random().toString(36).slice(2,10)),`${t}_media_tok_${e.dataset.xvtToken}`}return`${t}_media_null`}function q(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(lt.TWEET_ID);return e?e[1]:null}function Tt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(lt.MEDIA_INDEX);if(!e)return null;const n=parseInt(e[1],10);return Number.isInteger(n)&&n>0?n:null}function pt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(lt.STATUS_URL);if(!e)return null;const n=e[1];return n?n.trim():null}function _t(t,i={}){const e=q(t);if(!e)return null;let o=`https://x.com/${i.username||pt(t)||"i"}/status/${e}`;const s=i.mediaIndex!==void 0?i.mediaIndex:Tt(t);return s!=null&&Number.isInteger(Number(s))&&Number(s)>0&&(o+=`/video/${Number(s)}`),o}function Rt(t,i){var c,b,E,T,_,h,v,A;const e={tweetId:null,permalink:null,mediaIndex:null,mediaFingerprint:null,isQuoted:!1,username:null,container:t||null};if(!i)return e;e.mediaFingerprint=gt(i);let n=typeof i.closest=="function"?i.closest('a[href*="/status/"], a[href*="/statuses/"]'):null;if(n){const m=n.getAttribute("href")||n.href||"";e.mediaIndex=Tt(m)}const o=dt(i,t);if(!!o||Qt(t,i)){e.isQuoted=!0;const m=o||t;e.container=m;let l=null;if(m){if(typeof m.getAttribute=="function"){const d=m.getAttribute("href");d&&q(d)&&(l=d)}if(!l&&(typeof m.querySelectorAll=="function"||typeof m.querySelector=="function")){const d=typeof m.querySelectorAll=="function"?m.querySelectorAll(k.TIME_ELEMENT):[m.querySelector(k.TIME_ELEMENT)].filter(Boolean);for(const p of d){const y=(c=p.closest)==null?void 0:c.call(p,k.STATUS_ANCHOR);if(y){const L=y.getAttribute("href")||y.href;if(L&&q(L)){l=L;break}}}if(!l){const p=typeof m.querySelectorAll=="function"?m.querySelectorAll(k.STATUS_ANCHOR):[m.querySelector(k.STATUS_ANCHOR)].filter(Boolean);for(const y of p){const L=y.getAttribute("href")||y.href;if(L&&q(L)){l=L;break}}}}}if(l){const d=q(l);if(d)return e.tweetId=d,e.username=pt(l),e.permalink=_t(l,{mediaIndex:e.mediaIndex,username:e.username}),e}}const a=t||(typeof i.closest=="function"?i.closest(k.TWEET_ARTICLE):null);e.container=a;let u=null;if(a&&(typeof a.querySelectorAll=="function"||typeof a.querySelector=="function")){const m=typeof a.querySelectorAll=="function"?a.querySelectorAll(k.TIME_ELEMENT):[a.querySelector(k.TIME_ELEMENT)].filter(Boolean);for(const l of m){const d=(b=l.closest)==null?void 0:b.call(l,k.QUOTE_CONTAINER);if(d&&(((E=d.getAttribute)==null?void 0:E.call(d,"data-testid"))==="quoteTweet"||((T=d.getAttribute)==null?void 0:T.call(d,"data-testid"))==="tweetQuote"))continue;const p=(_=l.closest)==null?void 0:_.call(l,k.STATUS_ANCHOR);if(p){const y=p.getAttribute("href")||p.href;if(y&&q(y)){u=y;break}}}if(!u){const l=typeof a.querySelectorAll=="function"?a.querySelectorAll(k.STATUS_ANCHOR):[a.querySelector(k.STATUS_ANCHOR)].filter(Boolean);for(const d of l){const p=(h=d.closest)==null?void 0:h.call(d,k.QUOTE_CONTAINER);if(p&&(((v=p.getAttribute)==null?void 0:v.call(p,"data-testid"))==="quoteTweet"||((A=p.getAttribute)==null?void 0:A.call(p,"data-testid"))==="tweetQuote"))continue;const y=d.getAttribute("href")||d.href;if(y&&q(y)){u=y;break}}}}if(!u&&typeof window<"u"&&window.location){const m=window.location.pathname||window.location.href||"";q(m)&&(u=m)}if(u){const m=q(u);m&&(e.tweetId=m,e.username=pt(u),e.permalink=_t(u,{mediaIndex:e.mediaIndex,username:e.username}))}return e}class Zt{constructor(){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,this._dismissedKeys=new Set}isDismissed(i,e){var o;if(e&&e.dataset&&e.dataset.xvtDismissed==="true"||e&&this._dismissedElements.has(e))return!0;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);return n&&typeof n=="string"&&this._dismissedKeys.has(n)?(e&&(e.dataset&&(e.dataset.xvtDismissed="true"),this._dismissedElements.add(e)),!0):!1}dismiss(i,e){var o;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);e&&e.dataset&&(e.dataset.xvtDismissed="true",delete e.dataset.xvtMounted),e&&(this._dismissedElements.add(e),this._mountedElements.delete(e)),n&&typeof n=="string"&&this._dismissedKeys.add(n)}undismiss(i,e){var o;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);e&&e.dataset&&delete e.dataset.xvtDismissed,e&&this._dismissedElements.delete(e),n&&typeof n=="string"&&this._dismissedKeys.delete(n)}isMounted(i){return i?i.dataset&&i.dataset.xvtMounted==="true"?!0:this._mountedElements.has(i):!1}markMounted(i,e){i&&(i.dataset&&(i.dataset.xvtMounted="true",e&&(i.dataset.xvtVideoKey=e)),this._mountedElements.add(i))}unmarkMounted(i){i&&(i.dataset&&(delete i.dataset.xvtMounted,delete i.dataset.xvtVideoKey),this._mountedElements.delete(i))}getPerVideoData(i){if(i)return this._perVideoData.get(i)}setPerVideoData(i,e){if(!i||!e)return;const n=this._perVideoData.get(i)||{};this._perVideoData.set(i,{...n,...e})}reset(i=!0){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,i&&this._dismissedKeys.clear()}getDismissedCount(){return this._dismissedKeys.size}}function Jt(){return new Zt}const it=Jt();function Dt(t,i){if(!(!t||t.nodeType!==1)){if(t.tagName==="VIDEO"){i.add(t);return}if(typeof t.querySelectorAll=="function")try{const e=t.querySelectorAll("video");for(let n=0;n<e.length;n++)i.add(e[n])}catch{}}}function te(t={}){const{onVideoDetected:i,onVideoRemoved:e,root:n=typeof document<"u"?document.body:null,stateStore:o=it,detectVideos:s=St,findTweetContainer:a=ft,extractTweetInfo:u=Rt,scheduler:c=typeof requestAnimationFrame=="function"?requestAnimationFrame:f=>setTimeout(f,16),canceler:b=typeof cancelAnimationFrame=="function"?cancelAnimationFrame:f=>clearTimeout(f)}=t;let E=null,T=!1,_=null;const h=new Set;function v(f){var x;if(!f||f.isConnected===!1||o.isMounted(f)||o.isDismissed(void 0,f))return;const I=a(f);if(!I)return;const R=u(I,f);if(!R||!R.tweetId)return;const C=ot(R.tweetId,R.mediaIndex,R.mediaFingerprint||f);if(!o.isDismissed(C,f)){if(!f.getAttribute("src")&&!f.src&&!((x=f.querySelector)!=null&&x.call(f,"source"))&&!f.getAttribute("poster")){const D=()=>{f.removeEventListener("loadedmetadata",D),f.removeEventListener("loadstart",D),!o.isMounted(f)&&!o.isDismissed(void 0,f)&&(h.add(f),m())};f.addEventListener("loadedmetadata",D,{once:!0}),f.addEventListener("loadstart",D,{once:!0})}if(o.markMounted(f,C),o.setPerVideoData(f,{videoKey:C,...R,detectedAt:Date.now()}),typeof i=="function")try{i(f,R)}catch(D){console.error("[X Video Tools] Error in onVideoDetected callback:",D)}}}function A(){if(_=null,h.size===0)return;const f=Array.from(h);h.clear();for(let I=0;I<f.length;I++)v(f[I])}function m(){_===null&&(_=c(()=>{A()}))}function l(f){var R;if(!T)return;let I=!1;for(let C=0;C<f.length;C++){const x=f[C];if(x.type==="attributes"){const D=x.target;D&&D.tagName==="VIDEO"&&!o.isMounted(D)&&!o.isDismissed(void 0,D)&&(h.add(D),I=!0);continue}if(x.type==="childList"){x.target&&x.target.tagName==="VIDEO"&&!o.isMounted(x.target)&&!o.isDismissed(void 0,x.target)&&(h.add(x.target),I=!0);const D=x.removedNodes;if(D&&D.length>0){const N=new Set;for(let O=0;O<D.length;O++){const B=D[O];B.nodeType===1&&Dt(B,N)}for(const O of N)if(o.unmarkMounted(O),typeof e=="function")try{e(O)}catch(B){console.error("[X Video Tools] Error in onVideoRemoved callback:",B)}}const V=x.addedNodes;if(!V||V.length===0)continue;for(let N=0;N<V.length;N++){const O=V[N];if(O.nodeType===1){const B=h.size;if(Dt(O,h),h.size>B&&(I=!0),O.tagName==="TIME"||typeof O.querySelector=="function"&&O.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]')){const j=(R=O.closest)==null?void 0:R.call(O,'article[data-testid="tweet"]');if(j){const Q=j.querySelectorAll("video");for(let X=0;X<Q.length;X++)!o.isMounted(Q[X])&&!o.isDismissed(void 0,Q[X])&&(h.add(Q[X]),I=!0)}}}}}}I&&m()}function d(f){const I=f||n||(typeof document<"u"?document.body:null);if(!I)return;const R=s(I);for(let C=0;C<R.length;C++)h.add(R[C]);h.size>0&&A()}function p(f){if(T)return;const I=f||n||(typeof document<"u"?document.body:null);if(!I){console.warn("[X Video Tools] No valid root found to start VideoObserver.");return}if(typeof MutationObserver>"u"){console.warn("[X Video Tools] MutationObserver is not supported in this environment.");return}E=new MutationObserver(l),E.observe(I,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","poster","data-media-id"],characterData:!1}),T=!0,d(I)}function y(){E&&(E.disconnect(),E=null),_!==null&&(b(_),_=null),h.clear(),T=!1}function L(f=!1){y(),f&&o&&o.reset()}function M(){return T}return{start:p,stop:y,scan:d,reset:L,isActive:M,isRunning:M,_getPendingSize:()=>h.size}}const ee=`
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
.xvt-toolbar-container.xvt-downloading .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-downloading .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-completed .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-completed .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-picker .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-picker .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-success .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-success .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-error .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-error .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-interrupted .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-interrupted .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-cancelled .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-cancelled .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-vertical {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.xvt-toolbar-container.xvt-hovered,
.xvt-toolbar-container.xvt-processing,
.xvt-toolbar-container.xvt-downloading,
.xvt-toolbar-container.xvt-completed,
.xvt-toolbar-container.xvt-ambiguous,
.xvt-toolbar-container.xvt-picker,
.xvt-toolbar-container.xvt-success,
.xvt-toolbar-container.xvt-error,
.xvt-toolbar-container.xvt-interrupted,
.xvt-toolbar-container.xvt-cancelled,
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
`,G={DOWNLOAD:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',CDN:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',CLOSE:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',SPINNER:'<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',CHECKMARK:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',ERROR:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'},r=Object.freeze({IDLE:"idle",HOVERED:"hovered",PROCESSING:"processing",DOWNLOADING:"downloading",COMPLETED:"completed",AMBIGUOUS:"ambiguous",PICKER:"picker",SUCCESS:"success",ERROR:"error",UNCONFIGURED:"unconfigured",INTERRUPTED:"interrupted",CANCELLED:"cancelled",DISMISSED:"dismissed"}),ie={[r.IDLE]:new Set([r.HOVERED,r.UNCONFIGURED,r.PROCESSING,r.DISMISSED]),[r.HOVERED]:new Set([r.IDLE,r.PROCESSING,r.UNCONFIGURED,r.DISMISSED]),[r.UNCONFIGURED]:new Set([r.HOVERED,r.IDLE,r.PROCESSING,r.DISMISSED]),[r.PROCESSING]:new Set([r.DOWNLOADING,r.SUCCESS,r.COMPLETED,r.ERROR,r.AMBIGUOUS,r.PICKER,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.DOWNLOADING]:new Set([r.COMPLETED,r.SUCCESS,r.ERROR,r.INTERRUPTED,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.AMBIGUOUS]:new Set([r.PROCESSING,r.DOWNLOADING,r.SUCCESS,r.ERROR,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.PICKER]:new Set([r.PROCESSING,r.DOWNLOADING,r.SUCCESS,r.ERROR,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.SUCCESS]:new Set([r.HOVERED,r.IDLE,r.DISMISSED]),[r.COMPLETED]:new Set([r.HOVERED,r.IDLE,r.DISMISSED]),[r.ERROR]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.INTERRUPTED]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.CANCELLED]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.DISMISSED]:new Set};class ne{constructor(i=r.IDLE){this._state=i,this._payload=null,this._listeners=new Set}getState(){return this._state}getPayload(){return this._payload}isDismissed(){return this._state===r.DISMISSED}isVisible(){return this._state!==r.IDLE&&this._state!==r.DISMISSED}setState(i,e=null){if(this._state===r.DISMISSED)return!1;if(this._state===i)return this._payload=e,this._notify(this._state,this._state,e),!0;const n=ie[this._state];if(!n||!n.has(i))return console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${i}`),!1;const o=this._state;return this._state=i,this._payload=e,this._notify(this._state,o,e),!0}subscribe(i){return typeof i!="function"?()=>{}:(this._listeners.add(i),()=>{this._listeners.delete(i)})}_notify(i,e,n){for(const o of this._listeners)try{o(i,e,n)}catch(s){console.error("[X Video Tools] Error in toolbar state subscriber:",s)}}destroy(){this._listeners.clear(),this._payload=null}}function oe(t){return new ne(t)}const re="video.twimg.com";function nt(t){if(!t||typeof t!="string")return!1;const i=t.trim();if(!i||i.startsWith("blob:")||i.startsWith("data:")||i.startsWith("javascript:"))return!1;try{const e=new URL(i);if(e.protocol!=="https:"||e.hostname.toLowerCase()!==re)return!1;const o=e.pathname;if(!o||o==="/"||o.trim()==="")return!1;const s=o.toLowerCase();return!(s.endsWith(".jpg")||s.endsWith(".jpeg")||s.endsWith(".png")||s.endsWith(".webp"))}catch{return!1}}function se(t){if(!t||typeof t!="object")return null;function i(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("blob:")||n.startsWith("data:")||!nt(n))return null;try{const s=new URL(n).pathname.toLowerCase();return s.includes("_thumb")||s.endsWith(".jpg")||s.endsWith(".png")||s.endsWith(".webp")?null:s.endsWith(".mp4")||s.includes(".mp4")||s.includes("/vid/")||s.includes("/pu/vid/")?n:null}catch{return null}}try{const e=t.currentSrc,n=i(e);if(n)return n}catch{}try{const e=t.src||(typeof t.getAttribute=="function"?t.getAttribute("src"):null),n=i(e);if(n)return n}catch{}try{if(typeof t.querySelectorAll=="function"){const e=t.querySelectorAll("source");for(const n of e){const o=n.src||n.getAttribute("src"),s=i(o);if(s)return s}}}catch{}return null}function It(t){if(!t||typeof t!="string")return 0;const i=t.match(/\/(\d+)x(\d+)\//);if(!i)return 0;const e=Number(i[1]),n=Number(i[2]);return isNaN(e)||isNaN(n)||e<=0||n<=0?0:e*n}function Nt(t){var n,o,s,a;if(!t||typeof t!="object")return!1;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((o=t.dimensions)==null?void 0:o.width)),e=Number(t.height??((s=t.original_info)==null?void 0:s.height)??((a=t.dimensions)==null?void 0:a.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0||typeof t.resolution=="string"&&/^\d+x\d+$/.test(t.resolution))return!0;if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return!0}return!1}function rt(t){var n,o,s,a;if(!t||typeof t!="object")return 0;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((o=t.dimensions)==null?void 0:o.width)),e=Number(t.height??((s=t.original_info)==null?void 0:s.height)??((a=t.dimensions)==null?void 0:a.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0)return i*e;if(typeof t.resolution=="string"){const u=t.resolution.match(/^(\d+)x(\d+)$/);if(u){const c=Number(u[1]),b=Number(u[2]);if(c>0&&b>0)return c*b}}else if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return u*c}return t.url&&typeof t.url=="string"?It(t.url):0}function ae(t,i){const e=Nt(t),n=Nt(i),o=rt(t),s=rt(i),a=Number(t.bitrate||0),u=Number(i.bitrate||0);if(e&&n)return o!==s?s-o:u-a;if(e&&!n){if(o>=s||o>0&&a>=u)return-1}else if(!e&&n&&(s>=o||s>0&&u>=a))return 1;return o>0&&s>0?o!==s?s-o:u-a:a!==u?u-a:s-o}function At(t){if(!Array.isArray(t)||t.length===0)return null;const i=t.filter(s=>!s||typeof s!="object"||s.content_type!=="video/mp4"||!s.url||typeof s.url!="string"?!1:nt(s.url));if(i.length===0)return null;let e=i[0];for(let s=1;s<i.length;s++){const a=i[s];ae(e,a)>0&&(e=a)}const n=rt(e),o=Number(e.bitrate||0);return{...e,url:e.url,isHls:!1,resolution:n,bitrate:o}}function Ot(t){if(!Array.isArray(t)||t.length===0)return null;const i=At(t);if(i)return i;const e=t.find(n=>{if(!n||typeof n!="object"||!n.url)return!1;const o=n.content_type==="application/x-mpegURL"||n.content_type==="application/vnd.apple.mpegurl",s=n.url.toLowerCase().includes(".m3u8");return(o||s)&&nt(n.url)});return e?{...e,url:e.url,isHls:!0,bitrate:Number(e.bitrate||0)}:null}function wt(t){var i;return!t||typeof t!="object"?!1:t.type==="video"||t.type==="animated_gif"||!!((i=t.video_info)!=null&&i.variants)}function Lt(t){var e;const i=[];if(!t)return i;if(t.id_str&&i.push(String(t.id_str)),t.media_url_https){const n=t.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);n&&i.push(n[1])}if(Array.isArray((e=t.video_info)==null?void 0:e.variants)){for(const n of t.video_info.variants)if(n.url){const o=n.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);o&&i.push(o[1])}}return i}function Ct(t,i={},e=null){if(!Array.isArray(t)||t.length===0)return{media:null,ambiguous:!1,candidates:[]};const n=t.filter(wt);if(n.length===0)return{media:null,ambiguous:!1,candidates:[]};const o=i.mediaIndex;if(typeof o=="number"&&o>0){const a=t[o-1];if(a&&wt(a))return{media:a,ambiguous:!1,candidates:n}}let s=i.mediaFingerprint;if(!s&&e){const a=e.getAttribute("poster")||e.poster;if(a){const u=a.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);u&&(s=u[1])}}if(s&&typeof s=="string"){const a=s.trim(),u=n.filter(c=>Lt(c).some(E=>E===a));if(u.length===1)return{media:u[0],ambiguous:!1,candidates:n};if(u.length===0){const c=n.filter(b=>Lt(b).some(T=>a.includes(T)||T.includes(a)));if(c.length===1)return{media:c[0],ambiguous:!1,candidates:n}}}return n.length===1?{media:n[0],ambiguous:!1,candidates:n}:{media:null,ambiguous:!0,candidates:n}}const g=Object.freeze({NO_TWEET_INFO:"ERR_NO_TWEET_INFO",TWEET_INACCESSIBLE:"ERR_TWEET_INACCESSIBLE",RATE_LIMITED:"ERR_RATE_LIMITED",NETWORK_TIMEOUT:"ERR_NETWORK_TIMEOUT",NO_MEDIA:"ERR_NO_MEDIA",NO_SUPPORTED_VARIANT:"ERR_NO_SUPPORTED_VARIANT",AMBIGUOUS_MEDIA:"ERR_AMBIGUOUS_MEDIA",INVALID_URL:"ERR_INVALID_URL",TAB_CREATE_FAILED:"ERR_TAB_CREATE_FAILED",NETWORK_ERROR:"ERR_NETWORK_ERROR"}),K=Object.freeze({[g.NO_TWEET_INFO]:"Không tìm thấy thông tin bài viết",[g.TWEET_INACCESSIBLE]:"Tweet không tồn tại hoặc bị giới hạn quyền riêng tư",[g.RATE_LIMITED]:"Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau",[g.NETWORK_TIMEOUT]:"Lỗi kết nối mạng hoặc yêu cầu quá thời gian",[g.NO_MEDIA]:"Không tìm thấy video trong bài viết",[g.NO_SUPPORTED_VARIANT]:"Không tìm thấy định dạng video tương thích",[g.AMBIGUOUS_MEDIA]:"Có nhiều video. Vui lòng chọn video cần mở",[g.INVALID_URL]:"URL CDN không hợp lệ hoặc không an toàn",[g.TAB_CREATE_FAILED]:"Không thể mở tab mới",[g.NETWORK_ERROR]:"Lỗi kết nối mạng"});function ht(t){return new Promise(i=>{let e=!1;function n(o){e||(e=!0,i(o))}try{const o=chrome.runtime.sendMessage(t,s=>{chrome.runtime.lastError?n({success:!1,error:"NETWORK_ERROR",message:chrome.runtime.lastError.message}):n(s||{success:!0})});o&&typeof o.then=="function"&&o.then(s=>n(s||{success:!0})).catch(s=>{n({success:!1,error:"NETWORK_ERROR",message:(s==null?void 0:s.message)||"Message error"})})}catch(o){n({success:!1,error:"NETWORK_ERROR",message:o.message})}})}async function ce(t,i={},e={}){var u,c,b,E,T,_;const n=!!(e.shiftKey||e.isShiftClick),o=(t==null?void 0:t.src)||(typeof(t==null?void 0:t.getAttribute)=="function"?t.getAttribute("src"):null);if(o&&typeof o=="string"&&!o.startsWith("blob:")&&o.trim()!==""&&!nt(o))return{success:!1,code:g.INVALID_URL,error:K[g.INVALID_URL]};const s=se(t),a=(i==null?void 0:i.tweetId)||((u=t==null?void 0:t.dataset)==null?void 0:u.xvtTweetId)||((E=(b=(c=t==null?void 0:t.closest)==null?void 0:c.call(t,"article"))==null?void 0:b.id)==null?void 0:E.replace("tweet-",""))||null;if(s){const h=It(s)||(t!=null&&t.videoWidth&&(t!=null&&t.videoHeight)?t.videoWidth*t.videoHeight:0);if(a&&h<3840*2160)try{const v=await ht({action:"FETCH_SYNDICATION",payload:{tweetId:a}});if(v!=null&&v.success&&(v!=null&&v.data)){const A=v.data.mediaDetails||[];let m=null;const l=Ct(A,i,t);if(l.media)m=l.media;else if(l.ambiguous){const d=s.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);if(d){const p=d[1];m=l.candidates.find(y=>{var L,M;return y.id_str===p?!0:(M=(L=y.video_info)==null?void 0:L.variants)==null?void 0:M.some(f=>f.url&&f.url.includes(`/${p}/`))})}}if(m){const d=At((T=m.video_info)==null?void 0:T.variants);if(d){const p=d.resolution??rt(d);if(h>0&&p>h||h===0&&p>0)return st(d.url,!1,n)}}}}catch{}return st(s,!1,n)}if(a)try{const h=await ht({action:"FETCH_SYNDICATION",payload:{tweetId:a}});if(h.success&&h.data){const A=h.data.mediaDetails||[],m=Ct(A,i,t);if(m.ambiguous)return typeof e.onAmbiguous=="function"&&e.onAmbiguous(m.candidates,async l=>{var p;const d=Ot((p=l==null?void 0:l.video_info)==null?void 0:p.variants);return d?st(d.url,!!d.isHls,n):{success:!1,code:g.NO_SUPPORTED_VARIANT,error:K[g.NO_SUPPORTED_VARIANT]}}),{success:!1,isAmbiguous:!0,code:g.AMBIGUOUS_MEDIA,error:K[g.AMBIGUOUS_MEDIA],candidates:m.candidates};if(m.media){const l=Ot((_=m.media.video_info)==null?void 0:_.variants);return l?st(l.url,!!l.isHls,n):{success:!1,code:g.NO_SUPPORTED_VARIANT,error:K[g.NO_SUPPORTED_VARIANT]}}return{success:!1,code:g.NO_MEDIA,error:K[g.NO_MEDIA]}}const v=ue(h.error);return{success:!1,code:v,error:K[v]||h.message||"Lỗi kết nối máy chủ X"}}catch(h){return{success:!1,code:g.NETWORK_ERROR,error:h.message||K[g.NETWORK_ERROR]}}return{success:!1,code:g.NO_TWEET_INFO,error:K[g.NO_TWEET_INFO]}}async function st(t,i,e){var n;if(!nt(t))return{success:!1,code:g.INVALID_URL,error:K[g.INVALID_URL]};if(e)try{if(typeof navigator<"u"&&((n=navigator.clipboard)!=null&&n.writeText))return await navigator.clipboard.writeText(t),{success:!0,url:t,isHls:i,copied:!0}}catch{}try{const o=await ht({action:"OPEN_CDN",payload:{url:t}});return o&&o.success===!1?{success:!1,code:g.TAB_CREATE_FAILED,error:o.message||K[g.TAB_CREATE_FAILED]}:{success:!0,url:t,isHls:i,tabOpened:!0}}catch(o){return{success:!1,code:g.TAB_CREATE_FAILED,error:o.message||K[g.TAB_CREATE_FAILED]}}}function ue(t){switch(t){case"API_RATE_LIMIT":case"RATE_LIMIT":case"ERR_RATE_LIMITED":return g.RATE_LIMITED;case"TWEET_INACCESSIBLE":case"NOT_FOUND":case"ERR_TWEET_NOT_FOUND":case"ERR_AGE_RESTRICTED":return g.TWEET_INACCESSIBLE;case"API_TIMEOUT":case"TIMEOUT":case"ERR_NETWORK_TIMEOUT":return g.NETWORK_TIMEOUT;case"NO_MEDIA":case"ERR_NO_MEDIA":return g.NO_MEDIA;default:return g.NETWORK_ERROR}}const le=`
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
`;function de(t){var e;if(!t||typeof t!="object")return null;if(t.resolution){const n=String(t.resolution).trim();if(n.length>0)return n}const i=(e=t.video_info)==null?void 0:e.variants;if(Array.isArray(i)&&i.length>0){let n=0,o=0;for(const s of i){if(!s||typeof s.url!="string")continue;const a=s.url.match(/\/(\d+)x(\d+)\//);if(a){const u=Number(a[1]),c=Number(a[2]);!isNaN(u)&&!isNaN(c)&&u*c>o*n&&(o=u,n=c)}}if(n>0)return`${n}p`}return null}function kt(t,i=[],{onSelect:e,onCancel:n}={}){if(!t)return{destroy:()=>{}};const o=t.querySelector(".xvt-picker-popover");o&&o.remove();let s=t.querySelector("#xvt-picker-styles");s||(s=document.createElement("style"),s.id="xvt-picker-styles",s.textContent=le,t.appendChild(s));const a=document.createElement("div");a.className="xvt-picker-popover",a.setAttribute("role","dialog"),a.setAttribute("aria-label","Chọn video để mở");const u=document.createElement("div");u.className="xvt-picker-header";const c=document.createElement("span");c.className="xvt-picker-title",c.textContent="Chọn video";const b=document.createElement("button");b.className="xvt-picker-close",b.setAttribute("aria-label","Đóng"),b.innerHTML="&times;",u.appendChild(c),u.appendChild(b),a.appendChild(u);const E=document.createElement("div");E.className="xvt-picker-list",E.setAttribute("role","menu"),i.forEach((l,d)=>{var C;const p=document.createElement("div");if(p.className="xvt-picker-item",p.setAttribute("role","menuitem"),p.setAttribute("tabindex","0"),l.media_url_https){const x=document.createElement("img");x.className="xvt-picker-thumb",x.src=l.media_url_https,x.alt=`Thumbnail Video ${d+1}`,p.appendChild(x)}const y=document.createElement("div");y.className="xvt-picker-info";const L=document.createElement("span");L.className="xvt-picker-label",L.textContent=`Video ${d+1}`;const M=document.createElement("span");M.className="xvt-picker-meta";let f=null;if((C=l.video_info)!=null&&C.aspect_ratio){const[x,D]=l.video_info.aspect_ratio;f=`${x}:${D}`}const I=de(l);f&&I?M.textContent=`${f} • ${I}`:f?M.textContent=f:I?M.textContent=I:M.textContent=l.type||"MP4",y.appendChild(L),y.appendChild(M),p.appendChild(y);const R=x=>{x.stopPropagation(),x.preventDefault(),_(),typeof e=="function"&&e(l,d)};p.addEventListener("click",R),p.addEventListener("keydown",x=>{(x.key==="Enter"||x.key===" ")&&R(x)}),E.appendChild(p)}),a.appendChild(E);let T=null;function _(){T!==null&&(clearTimeout(T),T=null),document.removeEventListener("click",A,!0),document.removeEventListener("keydown",v),a.parentNode&&a.parentNode.removeChild(a)}function h(l){l&&(l.stopPropagation(),l.preventDefault()),_(),typeof n=="function"&&n()}function v(l){l.key==="Escape"&&h(l)}function A(l){(typeof l.composedPath=="function"?l.composedPath():[]).includes(a)||a.contains&&a.contains(l.target)||h(l)}return b.addEventListener("click",h),document.addEventListener("keydown",v),T=setTimeout(()=>{document.addEventListener("click",A,!0)},0),(t.querySelector(".xvt-toolbar-container")||t).appendChild(a),{destroy:_}}const fe=300,U=2500,Mt=250;function pe({host:t,wrapper:i,video:e,stateManager:n,toolbarController:o,stateStore:s,tweetInfo:a={},options:u={}}){var Q,X;let c=!1,b=!1,E=null,T=0;function _(){E!==null&&(clearTimeout(E),E=null)}function h(){_(),E=setTimeout(()=>{const S=n.getState();!c&&!b&&!n.isDismissed()&&S!==r.AMBIGUOUS&&S!==r.PICKER&&S!==r.DOWNLOADING&&o.hide(),E=null},fe)}function v(){var S;n.isDismissed()||(c=!0,_(),(S=o.updatePosition)==null||S.call(o),o.show())}function A(){var S;n.isDismissed()||c||(c=!0,_(),(S=o.updatePosition)==null||S.call(o),o.show())}function m(S){if(n.isDismissed())return;const H=S.relatedTarget;H&&(H===t||t.contains(H))||(c=!1,h())}function l(){n.isDismissed()||(b=!0,_(),o.show())}function d(){n.isDismissed()||b||(b=!0,_(),o.show())}function p(S){if(n.isDismissed())return;const H=S.relatedTarget;H&&(H===i||i.contains(H))||(b=!1,h())}function y(S){S.stopPropagation()}function L(S){var Z,Wt,Ft,Gt,Kt,qt,zt,$t,jt;if(S.stopPropagation(),S.preventDefault(),n.isDismissed())return;const H=n.getState();if(H===r.PROCESSING||H===r.DOWNLOADING)return;const at=Date.now();if(at-T<Mt)return;if(T=at,!!!(u.enableDownload===!0||u.cobaltUrl||Xt())){const ct="Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";o.showNotice(ct,U),n.setState(r.UNCONFIGURED,{message:ct});return}n.setState(r.PROCESSING,{action:"download"});const W=a.tweetId||((Z=e==null?void 0:e.dataset)==null?void 0:Z.xvtTweetId)||((Gt=(Ft=(Wt=e==null?void 0:e.closest)==null?void 0:Wt.call(e,"article"))==null?void 0:Ft.id)==null?void 0:Gt.replace("tweet-",""))||typeof window<"u"&&((zt=(qt=(Kt=window.location)==null?void 0:Kt.href)==null?void 0:qt.match(/\/status\/(\d+)/))==null?void 0:zt[1])||null,w=a.permalink||(W?`https://x.com/i/status/${W}`:null)||(typeof window<"u"&&((jt=($t=window.location)==null?void 0:$t.href)!=null&&jt.includes("/status/"))?window.location.href:null),F=a.videoKey||(W?ot(W,a.mediaIndex,a.mediaFingerprint||e):null),mt=`${F||W||"vid"}_${Date.now()}`,bt={tweetId:W,permalink:w,username:a.username,mediaIndex:a.mediaIndex,videoKey:F,correlationId:mt};function Et(ct={}){try{chrome.runtime.sendMessage({action:"COBALT_DOWNLOAD",payload:{...bt,...ct}},P=>{if(!P){n.setState(r.ERROR,{action:"download"}),o.showNotice("Không nhận được phản hồi từ tiện ích.",U);return}if(P.status==="picker"||P.type==="PICKER"){n.setState(r.PICKER,{items:P.items||P.picker}),kt(o.shadowRoot,P.items||P.picker,{onSelect:ut=>{n.setState(r.PROCESSING,{action:"download"}),Et({selectedUrl:ut.url})},onCancel:()=>{n.setState(c||b?r.HOVERED:r.IDLE)}});return}if(P.success)n.setState(r.DOWNLOADING,{action:"download",downloadId:P.downloadId}),o.showNotice("Đang tải video...",U),setTimeout(()=>{n.getState()===r.DOWNLOADING&&(n.setState(r.SUCCESS,{action:"download"}),o.showNotice("Đã bắt đầu tải video",U),setTimeout(()=>{n.getState()===r.SUCCESS&&n.setState(c||b?r.HOVERED:r.IDLE)},U))},800);else if(P.error==="UNCONFIGURED"){const ut=P.message||"Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";o.showNotice(ut,U),n.setState(r.UNCONFIGURED,{message:ut})}else n.setState(r.ERROR,{action:"download",error:P.error}),o.showNotice(P.message||"Lỗi khi tải video",U),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||b?r.HOVERED:r.IDLE)},U)})}catch(P){n.setState(r.ERROR,{action:"download",error:P.message}),o.showNotice(P.message||"Lỗi kết nối nền",U)}}Et()}function M(S){if(S.stopPropagation(),S.preventDefault(),n.isDismissed()||n.getState()===r.PROCESSING)return;const H=Date.now();if(H-T<Mt)return;if(T=H,u.enableCdnResolver===!1){const w="Tính năng Mở CDN sẽ được tích hợp ở Phase 3.";o.showNotice(w,U),n.setState(r.UNCONFIGURED,{message:w});return}const at=!!S.shiftKey;n.setState(r.PROCESSING,{action:"cdn"});const Ht=u.cdnResolver||ce;function W(w){if(w){if(w.isAmbiguous){n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:w.candidates});return}w.success?(n.setState(r.SUCCESS,{action:"cdn"}),w.copied?o.showNotice("Đã sao chép liên kết CDN",U):w.isHls?o.showNotice("Đang mở luồng HLS (.m3u8)",U):o.showNotice("Đã mở tab CDN",U),setTimeout(()=>{n.getState()===r.SUCCESS&&n.setState(c||b?r.HOVERED:r.IDLE)},U)):(n.setState(r.ERROR,{action:"cdn",error:w.code||w.error}),o.showNotice(w.error||"Lỗi khi mở CDN",U),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||b?r.HOVERED:r.IDLE)},U))}}try{const w=Ht(e,a,{shiftKey:at,onAmbiguous:(F,mt)=>{n.setState(r.AMBIGUOUS,{candidates:F}),kt(o.shadowRoot,F,{onSelect:async(bt,Et)=>{n.setState(r.PROCESSING,{action:"cdn"});try{const Z=await mt(bt);W(Z)}catch(Z){W({success:!1,error:Z.message||"Lỗi xử lý video"})}},onCancel:()=>{n.setState(c||b?r.HOVERED:r.IDLE)}})}});w&&typeof w.then=="function"?w.then(F=>{if(F!=null&&F.isAmbiguous){n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:F.candidates});return}W(F)}).catch(F=>{W({success:!1,error:F.message||"Lỗi kết nối máy chủ X"})}):w!=null&&w.isAmbiguous?n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:w.candidates}):W(w)}catch(w){W({success:!1,error:w.message||"Lỗi kết nối máy chủ X"})}}function f(S){S.stopPropagation(),S.preventDefault(),_(),o.dismiss()}function I(S,H){(S.key==="Enter"||S.key===" ")&&(S.preventDefault(),H(S))}i&&(i.addEventListener("mouseenter",v),i.addEventListener("mousemove",A),i.addEventListener("mouseleave",m));const R=(Q=e==null?void 0:e.closest)==null?void 0:Q.call(e,'[data-testid="videoPlayer"]');if(R&&R!==i&&(R.addEventListener("mouseenter",v),R.addEventListener("mousemove",A)),e&&e!==i&&e!==R&&(e.addEventListener("mouseenter",v),e.addEventListener("mousemove",A)),t&&(t.addEventListener("mouseenter",l),t.addEventListener("mousemove",d),t.addEventListener("mouseleave",p),t.addEventListener("click",y),t.addEventListener("mousedown",y),t.addEventListener("mouseup",y)),typeof(i==null?void 0:i.matches)=="function")try{(i.matches(":hover")||R&&R.matches(":hover")||e&&((X=e.matches)!=null&&X.call(e,":hover")))&&(c=!0,o.show())}catch{}const C=t.shadowRoot;let x=null,D=null,V=null,N=null,O=null,B=null;C&&(x=C.querySelector(".xvt-btn-download"),D=C.querySelector(".xvt-btn-cdn"),V=C.querySelector(".xvt-btn-dismiss"),x&&(x.addEventListener("click",L),N=S=>I(S,L),x.addEventListener("keydown",N)),D&&(D.addEventListener("click",M),O=S=>I(S,M),D.addEventListener("keydown",O)),V&&(V.addEventListener("click",f),B=S=>I(S,f),V.addEventListener("keydown",B)));function j(){_(),i&&(i.removeEventListener("mouseenter",v),i.removeEventListener("mousemove",A),i.removeEventListener("mouseleave",m)),R&&R!==i&&(R.removeEventListener("mouseenter",v),R.removeEventListener("mousemove",A)),e&&e!==i&&e!==R&&(e.removeEventListener("mouseenter",v),e.removeEventListener("mousemove",A)),t&&(t.removeEventListener("mouseenter",l),t.removeEventListener("mousemove",d),t.removeEventListener("mouseleave",p),t.removeEventListener("click",y),t.removeEventListener("mousedown",y),t.removeEventListener("mouseup",y)),x&&(x.removeEventListener("click",L),N&&x.removeEventListener("keydown",N)),D&&(D.removeEventListener("click",M),O&&D.removeEventListener("keydown",O)),V&&(V.removeEventListener("click",f),B&&V.removeEventListener("keydown",B))}return{cleanup:j,cancelHideTimer:_,isHoveringVideo:()=>c,isHoveringToolbar:()=>b,getHideTimer:()=>E}}const he=150;function me(t,i={},e={}){const n=e.stateStore||it,o=t.closest('[data-testid="videoComponent"]'),s=t.closest('[data-testid="videoPlayer"]'),a=o||s||t.parentElement;if(!a)return console.warn("[X Video Tools] Cannot attach toolbar: no valid video wrapper found."),null;if(typeof window<"u")try{const N=window.getComputedStyle(a).position;if((N==="static"||!N)&&(a.style.position="relative"),a.style.setProperty("overflow","visible","important"),a.parentElement&&a.parentElement.tagName!=="ARTICLE"&&a.parentElement!==document.body){const O=window.getComputedStyle(a.parentElement).overflow;(O==="hidden"||O==="clip")&&a.parentElement.style.setProperty("overflow","visible","important")}}catch{a.style.position="relative",a.style.setProperty("overflow","visible","important")}else(!a.style.position||a.style.position==="static")&&(a.style.position="relative");const u=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?ot(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null),c=document.createElement("div");c.className="xvt-toolbar-host",c.setAttribute("data-xvt-mounted","true"),c.style.position="absolute",c.style.top="10px",c.style.left="10px",c.style.zIndex="9999";function b(){c.style.top="10px",c.style.left="10px",c.style.right="auto",c.style.transform="none"}b();const E=c.attachShadow({mode:"open"}),T=document.createElement("style");T.textContent=ee,E.appendChild(T);const _=document.createElement("div");_.className="xvt-toolbar-container xvt-idle",_.innerHTML=`
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${G.DOWNLOAD}</span>
        <div class="xvt-tooltip" role="tooltip">Tải</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${G.CDN}</span>
        <div class="xvt-tooltip" role="tooltip">Link</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${G.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `,E.appendChild(_);const h=E.querySelector(".xvt-notice"),v=E.querySelector(".xvt-btn-download .xvt-btn-icon"),A=E.querySelector(".xvt-btn-download"),m=E.querySelector(".xvt-btn-cdn"),l=E.querySelector(".xvt-btn-cdn .xvt-btn-icon"),d=oe(r.IDLE);let p=null,y=null;d.subscribe((N,O,B)=>{_.classList.remove("xvt-idle","xvt-hovered","xvt-processing","xvt-downloading","xvt-completed","xvt-ambiguous","xvt-picker","xvt-success","xvt-error","xvt-interrupted","xvt-cancelled","xvt-unconfigured","xvt-dismissing"),_.classList.add(`xvt-${N}`);const j=(B==null?void 0:B.action)==="cdn";N===r.PROCESSING||N===r.DOWNLOADING?j?(l&&(l.innerHTML=G.SPINNER),m&&m.setAttribute("aria-busy","true")):(v&&(v.innerHTML=G.SPINNER),A&&A.setAttribute("aria-busy","true")):N===r.SUCCESS||N===r.COMPLETED?j?(l&&(l.innerHTML=G.CHECKMARK),m&&m.removeAttribute("aria-busy")):(v&&(v.innerHTML=G.CHECKMARK),A&&A.removeAttribute("aria-busy")):N===r.ERROR||N===r.INTERRUPTED?j?(l&&(l.innerHTML=G.ERROR),m&&m.removeAttribute("aria-busy")):(v&&(v.innerHTML=G.ERROR),A&&A.removeAttribute("aria-busy")):(v&&(v.innerHTML=G.DOWNLOAD),A&&A.removeAttribute("aria-busy"),l&&(l.innerHTML=G.CDN),m&&m.removeAttribute("aria-busy")),N===r.IDLE&&M()});function L(N,O=2500){h&&(p!==null&&(clearTimeout(p),p=null),h.textContent=N,h.classList.add("xvt-notice-visible"),p=setTimeout(()=>{M()},O))}function M(){p!==null&&(clearTimeout(p),p=null),h&&h.classList.remove("xvt-notice-visible")}function f(){d.isDismissed()||d.setState(r.HOVERED)}function I(){d.isDismissed()||d.getState()===r.AMBIGUOUS||d.getState()===r.PICKER||d.getState()===r.DOWNLOADING||d.setState(r.IDLE)}function R(){d.isDismissed()||(d.setState(r.DISMISSED),n.dismiss(u,t),_.classList.remove("xvt-hovered","xvt-idle","xvt-unconfigured"),_.classList.add("xvt-dismissing"),y=setTimeout(()=>{x()},he))}const C=e.onDestroy;function x(){if(p!==null&&(clearTimeout(p),p=null),y!==null&&(clearTimeout(y),y=null),V&&V.cleanup(),c.parentNode&&c.parentNode.removeChild(c),d.destroy(),typeof C=="function")try{C()}catch(N){console.error("[X Video Tools] Error in onDestroy callback:",N)}}a.appendChild(c);const D={host:c,shadowRoot:E,wrapper:a,video:t,stateManager:d,show:f,hide:I,dismiss:R,showNotice:L,hideNotice:M,updatePosition:b,updateState:(N,O)=>d.setState(N,O),destroy:x},V=pe({host:c,wrapper:a,video:t,stateManager:d,toolbarController:D,stateStore:n,tweetInfo:i,options:e});return D.eventController=V,D}const Y=new WeakMap;function be(t,i={},e={}){if(!t||t.nodeType!==1)return null;const n=e.stateStore||it,o=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?ot(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null);if(n.isDismissed(o,t))return null;if(Y.has(t))return Y.get(t);const s=t.closest('[data-testid="videoComponent"]'),a=t.closest('[data-testid="videoPlayer"]'),u=s||a||t.parentElement;if(u&&u.querySelector(".xvt-toolbar-host"))return null;const c=me(t,{...i,videoKey:o},{...e,stateStore:n,onDestroy:()=>{Y.delete(t)}});return c?(Y.set(t,c),c):null}function Ee(t){if(!t)return!1;const i=Y.get(t);if(!i){const e=t.closest('[data-testid="videoComponent"]'),n=t.closest('[data-testid="videoPlayer"]'),o=e||n||t.parentElement,s=o==null?void 0:o.querySelector(".xvt-toolbar-host");return s&&s.parentNode?(s.parentNode.removeChild(s),!0):!1}return Y.delete(t),i.destroy(),!0}console.log("[X Video Tools] Content Script khởi tạo thành công trên",typeof window<"u"?window.location.hostname:"unknown"),console.log("[X Video Tools] Storage key tham chiếu:",J.SETTINGS),xt().catch(()=>{});function ve(t,i){console.log("[X Video Tools] Đã nhận diện video hợp lệ:",{tweetId:i.tweetId,permalink:i.permalink,mediaIndex:i.mediaIndex,isQuoted:i.isQuoted}),be(t,i,{stateStore:it})}function xe(t){Ee(t)}const $=te({root:typeof document<"u"?document.body:null,stateStore:it,detectVideos:St,findTweetContainer:ft,extractTweetInfo:Rt,onVideoDetected:ve,onVideoRemoved:xe});if(typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{$.start()}):$.start()),typeof window<"u"){window.addEventListener("pagehide",()=>{$.stop()}),window.addEventListener("popstate",()=>{$.scan()});let t=null;if(window.addEventListener("scroll",()=>{t===null&&(t=setTimeout(()=>{t=null,$.scan()},250))},{passive:!0}),typeof history<"u"){const i=history.pushState;typeof i=="function"&&(history.pushState=function(...n){const o=i.apply(this,n);return setTimeout(()=>$.scan(),0),o});const e=history.replaceState;typeof e=="function"&&(history.replaceState=function(...n){const o=e.apply(this,n);return setTimeout(()=>$.scan(),0),o})}}vt.observer=$,Object.defineProperty(vt,Symbol.toStringTag,{value:"Module"})})(this.XVideoToolsContent=this.XVideoToolsContent||{});

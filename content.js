(function(vt){"use strict";var Mt,Vt,Pt,Ht;const et=Object.freeze({SETTINGS:"xvt_settings",JWT_SESSION:"cobalt_jwt_session"}),it=Object.freeze({cobaltUrl:"",videoQuality:"1080",apiKey:""});let j={...it};function Jt(){return!!(j!=null&&j.cobaltUrl&&j.cobaltUrl.trim())}async function xt(){var t,n;try{if(typeof chrome<"u"&&((n=(t=chrome==null?void 0:chrome.storage)==null?void 0:t.local)!=null&&n.get)){const e=await chrome.storage.local.get(et.SETTINGS),i=e==null?void 0:e[et.SETTINGS],r={...it,...i||{}};return j=r,r}return{...j}}catch(e){return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:",e),j={...it},{...it}}}typeof chrome<"u"&&((Vt=(Mt=chrome==null?void 0:chrome.storage)==null?void 0:Mt.local)!=null&&Vt.get)&&(xt().catch(()=>{}),(Ht=(Pt=chrome==null?void 0:chrome.storage)==null?void 0:Pt.onChanged)!=null&&Ht.addListener&&chrome.storage.onChanged.addListener((t,n)=>{if(n==="local"&&t[et.SETTINGS]){const e=t[et.SETTINGS].newValue;j={...it,...e||{}}}}));const k=Object.freeze({TWEET_ARTICLE:'article[data-testid="tweet"]',TIME_ELEMENT:"time",STATUS_ANCHOR:'a[href*="/status/"], a[href*="/statuses/"]',VIDEO_TAG:"video",VIDEO_PLAYER:'[data-testid="videoPlayer"], [data-testid="videoComponent"]',QUOTE_CONTAINER:'[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',EXCLUDED_COMPOSER:'[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',EXCLUDED_SIDEBAR:'[data-testid="sidebarColumn"], aside',EXCLUDED_DM:'[data-testid="messageEntry"]'}),ft=Object.freeze({TWEET_ID:/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,MEDIA_INDEX:/(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,STATUS_URL:/^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,NUMERIC_ID:/^\d+$/});function St(t){return!t||typeof t.closest!="function"?!0:!!(t.closest(k.EXCLUDED_COMPOSER)||t.closest(k.EXCLUDED_SIDEBAR)||t.closest(k.EXCLUDED_DM))}function pt(t,n=null){if(!t||typeof t.closest!="function")return null;if(n&&nt(n))return n;const e=t.closest(k.QUOTE_CONTAINER);if(e&&nt(e)&&(!n||n.contains(e)&&e!==n||e===n))return e;let i=t.parentElement;for(;i&&i!==n&&i!==document.body;){if(nt(i))return i;i=i.parentElement}return null}function nt(t){var n;return!t||typeof t.getAttribute!="function"?!1:!!(t.getAttribute("data-testid")==="quoteTweet"||t.getAttribute("data-testid")==="tweetQuote"||t.getAttribute("role")==="link"&&((n=t.querySelector)!=null&&n.call(t,'time, a[href*="/status/"], a[href*="/statuses/"]')))}function te(t,n){return n?t&&nt(t)?!0:!!pt(n,t):!1}function ht(t){if(!t||typeof t.closest!="function"||St(t))return null;const n=t.closest(k.QUOTE_CONTAINER);if(n&&nt(n))return n;const e=t.closest(k.TWEET_ARTICLE);if(e)return pt(t,e)||e;const i=t.closest('div[aria-modal="true"], div[role="dialog"]');if(i)return i.querySelector(k.TWEET_ARTICLE)||i;const r=t.closest('main[role="main"], [data-testid="primaryColumn"]');return r&&typeof window<"u"&&window.location&&(window.location.pathname||window.location.href||"").includes("/status/")?r:null}function ee(t){return!t||typeof t.closest!="function"||t.isConnected===!1||St(t)?!1:!!ht(t)}function yt(t=document){if(!t||typeof t.querySelectorAll!="function")return[];const n=t.querySelectorAll(k.VIDEO_TAG),e=[];for(let i=0;i<n.length;i++){const r=n[i];ee(r)&&e.push(r)}return e}function gt(t){var s,a,l,c;if(!t||typeof t.getAttribute!="function")return null;const n=((s=t.dataset)==null?void 0:s.mediaId)||t.getAttribute("data-media-id");if(n&&typeof n=="string"&&n.trim())return n.trim();const e=t.getAttribute("poster")||t.poster;if(e&&typeof e=="string"){const p=e.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);if(p&&p[1])return p[1];const v=e.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);if(v&&v[1])return v[1];const g=e.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);if(g&&g[1])return g[1];try{const h=new URL(e,"https://x.com").pathname.split("/").filter(Boolean);if(h.length>0){const D=h[h.length-1].replace(/\.[^.]+$/,"");if(D&&D!=="img")return D;if(h.length>1)return h[h.length-2]}}catch{}}const i=t.currentSrc||t.getAttribute("src")||t.src||((l=(a=t.querySelector)==null?void 0:a.call(t,"source"))==null?void 0:l.getAttribute("src"));if(i&&typeof i=="string"){const p=i.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);if(p&&p[1])return p[1];const v=i.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);if(v&&v[1])return v[1];const g=i.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);if(g&&g[1])return`blob_${g[1]}`}const r=(c=t.closest)==null?void 0:c.call(t,"[data-media-id]");if(r){const p=r.getAttribute("data-media-id");if(p&&p.trim())return p.trim()}return null}function at(t,n=null,e=null){var r,s;const i=n??null;if(i!==null)return`${t}_media_${i}`;if(typeof e=="string"&&e.trim().length>0)return`${t}_media_fp_${e.trim()}`;if(e&&typeof e=="object"){const a=gt(e);if(a)return`${t}_media_fp_${a}`;const l=((r=e.closest)==null?void 0:r.call(e,'article, [data-testid="tweet"]'))||e.parentElement,c=(s=l==null?void 0:l.querySelectorAll)==null?void 0:s.call(l,"video");if(c&&c.length>1)return e.dataset||(e.dataset={}),e.dataset.xvtToken||(e.dataset.xvtToken=Math.random().toString(36).slice(2,10)),`${t}_media_tok_${e.dataset.xvtToken}`}return`${t}_media_null`}function $(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(ft.TWEET_ID);return e?e[1]:null}function Tt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(ft.MEDIA_INDEX);if(!e)return null;const i=parseInt(e[1],10);return Number.isInteger(i)&&i>0?i:null}function mt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(ft.STATUS_URL);if(!e)return null;const i=e[1];return i?i.trim():null}function Dt(t,n={}){const e=$(t);if(!e)return null;let r=`https://x.com/${n.username||mt(t)||"i"}/status/${e}`;const s=n.mediaIndex!==void 0?n.mediaIndex:Tt(t);return s!=null&&Number.isInteger(Number(s))&&Number(s)>0&&(r+=`/video/${Number(s)}`),r}function Rt(t,n){var c,p,v,g,R,h,D,A;const e={tweetId:null,permalink:null,mediaIndex:null,mediaFingerprint:null,isQuoted:!1,username:null,container:t||null};if(!n)return e;e.mediaFingerprint=gt(n);let i=typeof n.closest=="function"?n.closest('a[href*="/status/"], a[href*="/statuses/"]'):null;if(i){const b=i.getAttribute("href")||i.href||"";e.mediaIndex=Tt(b)}const r=pt(n,t);if(!!r||te(t,n)){e.isQuoted=!0;const b=r||t;e.container=b;let u=null;if(b){if(typeof b.getAttribute=="function"){const d=b.getAttribute("href");d&&$(d)&&(u=d)}if(!u&&(typeof b.querySelectorAll=="function"||typeof b.querySelector=="function")){const d=typeof b.querySelectorAll=="function"?b.querySelectorAll(k.TIME_ELEMENT):[b.querySelector(k.TIME_ELEMENT)].filter(Boolean);for(const f of d){const x=(c=f.closest)==null?void 0:c.call(f,k.STATUS_ANCHOR);if(x){const U=x.getAttribute("href")||x.href;if(U&&$(U)){u=U;break}}}if(!u){const f=typeof b.querySelectorAll=="function"?b.querySelectorAll(k.STATUS_ANCHOR):[b.querySelector(k.STATUS_ANCHOR)].filter(Boolean);for(const x of f){const U=x.getAttribute("href")||x.href;if(U&&$(U)){u=U;break}}}}}if(u){const d=$(u);if(d)return e.tweetId=d,e.username=mt(u),e.permalink=Dt(u,{mediaIndex:e.mediaIndex,username:e.username}),e}}const a=t||(typeof n.closest=="function"?n.closest(k.TWEET_ARTICLE):null);e.container=a;let l=null;if(a&&(typeof a.querySelectorAll=="function"||typeof a.querySelector=="function")){const b=typeof a.querySelectorAll=="function"?a.querySelectorAll(k.TIME_ELEMENT):[a.querySelector(k.TIME_ELEMENT)].filter(Boolean);for(const u of b){const d=(p=u.closest)==null?void 0:p.call(u,k.QUOTE_CONTAINER);if(d&&(((v=d.getAttribute)==null?void 0:v.call(d,"data-testid"))==="quoteTweet"||((g=d.getAttribute)==null?void 0:g.call(d,"data-testid"))==="tweetQuote"))continue;const f=(R=u.closest)==null?void 0:R.call(u,k.STATUS_ANCHOR);if(f){const x=f.getAttribute("href")||f.href;if(x&&$(x)){l=x;break}}}if(!l){const u=typeof a.querySelectorAll=="function"?a.querySelectorAll(k.STATUS_ANCHOR):[a.querySelector(k.STATUS_ANCHOR)].filter(Boolean);for(const d of u){const f=(h=d.closest)==null?void 0:h.call(d,k.QUOTE_CONTAINER);if(f&&(((D=f.getAttribute)==null?void 0:D.call(f,"data-testid"))==="quoteTweet"||((A=f.getAttribute)==null?void 0:A.call(f,"data-testid"))==="tweetQuote"))continue;const x=d.getAttribute("href")||d.href;if(x&&$(x)){l=x;break}}}}if(!l&&typeof window<"u"&&window.location){const b=window.location.pathname||window.location.href||"";$(b)&&(l=b)}if(l){const b=$(l);b&&(e.tweetId=b,e.username=mt(l),e.permalink=Dt(l,{mediaIndex:e.mediaIndex,username:e.username}))}return e}class ie{constructor(){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,this._dismissedKeys=new Set}isDismissed(n,e){var r;if(e&&e.dataset&&e.dataset.xvtDismissed==="true"||e&&this._dismissedElements.has(e))return!0;const i=n||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);return i&&typeof i=="string"&&this._dismissedKeys.has(i)?(e&&(e.dataset&&(e.dataset.xvtDismissed="true"),this._dismissedElements.add(e)),!0):!1}dismiss(n,e){var r;const i=n||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);e&&e.dataset&&(e.dataset.xvtDismissed="true",delete e.dataset.xvtMounted),e&&(this._dismissedElements.add(e),this._mountedElements.delete(e)),i&&typeof i=="string"&&this._dismissedKeys.add(i)}undismiss(n,e){var r;const i=n||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);e&&e.dataset&&delete e.dataset.xvtDismissed,e&&this._dismissedElements.delete(e),i&&typeof i=="string"&&this._dismissedKeys.delete(i)}isMounted(n){return n?n.dataset&&n.dataset.xvtMounted==="true"?!0:this._mountedElements.has(n):!1}markMounted(n,e){n&&(n.dataset&&(n.dataset.xvtMounted="true",e&&(n.dataset.xvtVideoKey=e)),this._mountedElements.add(n))}unmarkMounted(n){n&&(n.dataset&&(delete n.dataset.xvtMounted,delete n.dataset.xvtVideoKey),this._mountedElements.delete(n))}getPerVideoData(n){if(n)return this._perVideoData.get(n)}setPerVideoData(n,e){if(!n||!e)return;const i=this._perVideoData.get(n)||{};this._perVideoData.set(n,{...i,...e})}reset(n=!0){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,n&&this._dismissedKeys.clear()}getDismissedCount(){return this._dismissedKeys.size}}function ne(){return new ie}const ot=ne();function It(t,n){if(!(!t||t.nodeType!==1)){if(t.tagName==="VIDEO"){n.add(t);return}if(typeof t.querySelectorAll=="function")try{const e=t.querySelectorAll("video");for(let i=0;i<e.length;i++)n.add(e[i])}catch{}}}function oe(t={}){const{onVideoDetected:n,onVideoRemoved:e,root:i=typeof document<"u"?document.body:null,stateStore:r=ot,detectVideos:s=yt,findTweetContainer:a=ht,extractTweetInfo:l=Rt,scheduler:c=typeof requestAnimationFrame=="function"?requestAnimationFrame:m=>setTimeout(m,16),canceler:p=typeof cancelAnimationFrame=="function"?cancelAnimationFrame:m=>clearTimeout(m)}=t;let v=null,g=!1,R=null;const h=new Set;function D(m){var T;if(!m||m.isConnected===!1||r.isMounted(m)||r.isDismissed(void 0,m))return;const I=a(m);if(!I)return;const O=l(I,m);if(!O||!O.tweetId)return;const M=at(O.tweetId,O.mediaIndex,O.mediaFingerprint||m);if(!r.isDismissed(M,m)){if(!m.getAttribute("src")&&!m.src&&!((T=m.querySelector)!=null&&T.call(m,"source"))&&!m.getAttribute("poster")){const _=()=>{m.removeEventListener("loadedmetadata",_),m.removeEventListener("loadstart",_),!r.isMounted(m)&&!r.isDismissed(void 0,m)&&(h.add(m),b())};m.addEventListener("loadedmetadata",_,{once:!0}),m.addEventListener("loadstart",_,{once:!0})}if(r.markMounted(m,M),r.setPerVideoData(m,{videoKey:M,...O,detectedAt:Date.now()}),typeof n=="function")try{n(m,O)}catch(_){console.error("[X Video Tools] Error in onVideoDetected callback:",_)}}}function A(){if(R=null,h.size===0)return;const m=Array.from(h);h.clear();for(let I=0;I<m.length;I++)D(m[I])}function b(){R===null&&(R=c(()=>{A()}))}function u(m){var O;if(!g)return;let I=!1;for(let M=0;M<m.length;M++){const T=m[M];if(T.type==="attributes"){const _=T.target;_&&_.tagName==="VIDEO"&&!r.isMounted(_)&&!r.isDismissed(void 0,_)&&(h.add(_),I=!0);continue}if(T.type==="childList"){T.target&&T.target.tagName==="VIDEO"&&!r.isMounted(T.target)&&!r.isDismissed(void 0,T.target)&&(h.add(T.target),I=!0);const _=T.removedNodes;if(_&&_.length>0){const S=new Set;for(let N=0;N<_.length;N++){const H=_[N];H.nodeType===1&&It(H,S)}for(const N of S)if(r.unmarkMounted(N),typeof e=="function")try{e(N)}catch(H){console.error("[X Video Tools] Error in onVideoRemoved callback:",H)}}const W=T.addedNodes;if(!W||W.length===0)continue;for(let S=0;S<W.length;S++){const N=W[S];if(N.nodeType===1){const H=h.size;if(It(N,h),h.size>H&&(I=!0),N.tagName==="TIME"||typeof N.querySelector=="function"&&N.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]')){const B=(O=N.closest)==null?void 0:O.call(N,'article[data-testid="tweet"]');if(B){const G=B.querySelectorAll("video");for(let z=0;z<G.length;z++)!r.isMounted(G[z])&&!r.isDismissed(void 0,G[z])&&(h.add(G[z]),I=!0)}}}}}}I&&b()}function d(m){const I=m||i||(typeof document<"u"?document.body:null);if(!I)return;const O=s(I);for(let M=0;M<O.length;M++)h.add(O[M]);h.size>0&&A()}function f(m){if(g)return;const I=m||i||(typeof document<"u"?document.body:null);if(!I){console.warn("[X Video Tools] No valid root found to start VideoObserver.");return}if(typeof MutationObserver>"u"){console.warn("[X Video Tools] MutationObserver is not supported in this environment.");return}v=new MutationObserver(u),v.observe(I,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","poster","data-media-id"],characterData:!1}),g=!0,d(I)}function x(){v&&(v.disconnect(),v=null),R!==null&&(p(R),R=null),h.clear(),g=!1}function U(m=!1){x(),m&&r&&r.reset()}function P(){return g}return{start:f,stop:x,scan:d,reset:U,isActive:P,isRunning:P,_getPendingSize:()=>h.size}}const re=`
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

/* Avoid visual clash between tooltip and notice banner */
.xvt-has-notice .xvt-tooltip,
.xvt-toolbar-container:has(.xvt-notice-visible) .xvt-tooltip {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
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
`,K={DOWNLOAD:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',CDN:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',CLOSE:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',SPINNER:'<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',CHECKMARK:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',ERROR:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'},o=Object.freeze({IDLE:"idle",HOVERED:"hovered",PROCESSING:"processing",DOWNLOADING:"downloading",COMPLETED:"completed",AMBIGUOUS:"ambiguous",PICKER:"picker",SUCCESS:"success",ERROR:"error",UNCONFIGURED:"unconfigured",INTERRUPTED:"interrupted",CANCELLED:"cancelled",DISMISSED:"dismissed"}),se={[o.IDLE]:new Set([o.HOVERED,o.UNCONFIGURED,o.PROCESSING,o.DISMISSED]),[o.HOVERED]:new Set([o.IDLE,o.PROCESSING,o.UNCONFIGURED,o.DISMISSED]),[o.UNCONFIGURED]:new Set([o.HOVERED,o.IDLE,o.PROCESSING,o.DISMISSED]),[o.PROCESSING]:new Set([o.DOWNLOADING,o.SUCCESS,o.COMPLETED,o.ERROR,o.AMBIGUOUS,o.PICKER,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.DOWNLOADING]:new Set([o.COMPLETED,o.SUCCESS,o.ERROR,o.INTERRUPTED,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.AMBIGUOUS]:new Set([o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.ERROR,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.PICKER]:new Set([o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.ERROR,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.SUCCESS]:new Set([o.HOVERED,o.IDLE,o.DISMISSED,o.PROCESSING]),[o.COMPLETED]:new Set([o.HOVERED,o.IDLE,o.DISMISSED,o.PROCESSING]),[o.ERROR]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.INTERRUPTED]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.CANCELLED]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.DISMISSED]:new Set};class ae{constructor(n=o.IDLE){this._state=n,this._payload=null,this._listeners=new Set}getState(){return this._state}getPayload(){return this._payload}isDismissed(){return this._state===o.DISMISSED}isVisible(){return this._state!==o.IDLE&&this._state!==o.DISMISSED}setState(n,e=null){if(this._state===o.DISMISSED)return!1;if(this._state===n)return this._payload=e,this._notify(this._state,this._state,e),!0;const i=se[this._state];if(!i||!i.has(n))return console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${n}`),!1;const r=this._state;return this._state=n,this._payload=e,this._notify(this._state,r,e),!0}subscribe(n){return typeof n!="function"?()=>{}:(this._listeners.add(n),()=>{this._listeners.delete(n)})}_notify(n,e,i){for(const r of this._listeners)try{r(n,e,i)}catch(s){console.error("[X Video Tools] Error in toolbar state subscriber:",s)}}destroy(){this._listeners.clear(),this._payload=null}}function ce(t){return new ae(t)}const ue="video.twimg.com";function rt(t){if(!t||typeof t!="string")return!1;const n=t.trim();if(!n||n.startsWith("blob:")||n.startsWith("data:")||n.startsWith("javascript:"))return!1;try{const e=new URL(n);if(e.protocol!=="https:"||e.hostname.toLowerCase()!==ue)return!1;const r=e.pathname;if(!r||r==="/"||r.trim()==="")return!1;const s=r.toLowerCase();return!(s.endsWith(".jpg")||s.endsWith(".jpeg")||s.endsWith(".png")||s.endsWith(".webp"))}catch{return!1}}function le(t){if(!t||typeof t!="object")return null;function n(e){if(!e||typeof e!="string")return null;const i=e.trim();if(!i||i.startsWith("blob:")||i.startsWith("data:")||!rt(i))return null;try{const s=new URL(i).pathname.toLowerCase();return s.includes("_thumb")||s.endsWith(".jpg")||s.endsWith(".png")||s.endsWith(".webp")?null:s.endsWith(".mp4")||s.includes(".mp4")||s.includes("/vid/")||s.includes("/pu/vid/")?i:null}catch{return null}}try{const e=t.currentSrc,i=n(e);if(i)return i}catch{}try{const e=t.src||(typeof t.getAttribute=="function"?t.getAttribute("src"):null),i=n(e);if(i)return i}catch{}try{if(typeof t.querySelectorAll=="function"){const e=t.querySelectorAll("source");for(const i of e){const r=i.src||i.getAttribute("src"),s=n(r);if(s)return s}}}catch{}return null}function Nt(t){if(!t||typeof t!="string")return 0;const n=t.match(/\/(\d+)x(\d+)\//);if(!n)return 0;const e=Number(n[1]),i=Number(n[2]);return isNaN(e)||isNaN(i)||e<=0||i<=0?0:e*i}function _t(t){var i,r,s,a;if(!t||typeof t!="object")return!1;const n=Number(t.width??((i=t.original_info)==null?void 0:i.width)??((r=t.dimensions)==null?void 0:r.width)),e=Number(t.height??((s=t.original_info)==null?void 0:s.height)??((a=t.dimensions)==null?void 0:a.height));if(!isNaN(n)&&!isNaN(e)&&n>0&&e>0||typeof t.resolution=="string"&&/^\d+x\d+$/.test(t.resolution))return!0;if(t.resolution&&typeof t.resolution=="object"){const l=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(l)&&!isNaN(c)&&l>0&&c>0)return!0}return!1}function ct(t){var i,r,s,a;if(!t||typeof t!="object")return 0;const n=Number(t.width??((i=t.original_info)==null?void 0:i.width)??((r=t.dimensions)==null?void 0:r.width)),e=Number(t.height??((s=t.original_info)==null?void 0:s.height)??((a=t.dimensions)==null?void 0:a.height));if(!isNaN(n)&&!isNaN(e)&&n>0&&e>0)return n*e;if(typeof t.resolution=="string"){const l=t.resolution.match(/^(\d+)x(\d+)$/);if(l){const c=Number(l[1]),p=Number(l[2]);if(c>0&&p>0)return c*p}}else if(t.resolution&&typeof t.resolution=="object"){const l=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(l)&&!isNaN(c)&&l>0&&c>0)return l*c}return t.url&&typeof t.url=="string"?Nt(t.url):0}function de(t,n){const e=_t(t),i=_t(n),r=ct(t),s=ct(n),a=Number(t.bitrate||0),l=Number(n.bitrate||0);if(e&&i)return r!==s?s-r:l-a;if(e&&!i){if(r>=s||r>0&&a>=l)return-1}else if(!e&&i&&(s>=r||s>0&&l>=a))return 1;return r>0&&s>0?r!==s?s-r:l-a:a!==l?l-a:s-r}function At(t){if(!Array.isArray(t)||t.length===0)return null;const n=t.filter(s=>!s||typeof s!="object"||s.content_type!=="video/mp4"||!s.url||typeof s.url!="string"?!1:rt(s.url));if(n.length===0)return null;let e=n[0];for(let s=1;s<n.length;s++){const a=n[s];de(e,a)>0&&(e=a)}const i=ct(e),r=Number(e.bitrate||0);return{...e,url:e.url,isHls:!1,resolution:i,bitrate:r}}function Ot(t){if(!Array.isArray(t)||t.length===0)return null;const n=At(t);if(n)return n;const e=t.find(i=>{if(!i||typeof i!="object"||!i.url)return!1;const r=i.content_type==="application/x-mpegURL"||i.content_type==="application/vnd.apple.mpegurl",s=i.url.toLowerCase().includes(".m3u8");return(r||s)&&rt(i.url)});return e?{...e,url:e.url,isHls:!0,bitrate:Number(e.bitrate||0)}:null}function wt(t){var n;return!t||typeof t!="object"?!1:t.type==="video"||t.type==="animated_gif"||!!((n=t.video_info)!=null&&n.variants)}function Lt(t){var e;const n=[];if(!t)return n;if(t.id_str&&n.push(String(t.id_str)),t.media_url_https){const i=t.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);i&&n.push(i[1])}if(Array.isArray((e=t.video_info)==null?void 0:e.variants)){for(const i of t.video_info.variants)if(i.url){const r=i.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);r&&n.push(r[1])}}return n}function Ct(t,n={},e=null){if(!Array.isArray(t)||t.length===0)return{media:null,ambiguous:!1,candidates:[]};const i=t.filter(wt);if(i.length===0)return{media:null,ambiguous:!1,candidates:[]};const r=n.mediaIndex;if(typeof r=="number"&&r>0){const a=t[r-1];if(a&&wt(a))return{media:a,ambiguous:!1,candidates:i}}let s=n.mediaFingerprint;if(!s&&e){const a=e.getAttribute("poster")||e.poster;if(a){const l=a.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);l&&(s=l[1])}}if(s&&typeof s=="string"){const a=s.trim(),l=i.filter(c=>Lt(c).some(v=>v===a));if(l.length===1)return{media:l[0],ambiguous:!1,candidates:i};if(l.length===0){const c=i.filter(p=>Lt(p).some(g=>a.includes(g)||g.includes(a)));if(c.length===1)return{media:c[0],ambiguous:!1,candidates:i}}}return i.length===1?{media:i[0],ambiguous:!1,candidates:i}:{media:null,ambiguous:!0,candidates:i}}const y=Object.freeze({NO_TWEET_INFO:"ERR_NO_TWEET_INFO",TWEET_INACCESSIBLE:"ERR_TWEET_INACCESSIBLE",RATE_LIMITED:"ERR_RATE_LIMITED",NETWORK_TIMEOUT:"ERR_NETWORK_TIMEOUT",NO_MEDIA:"ERR_NO_MEDIA",NO_SUPPORTED_VARIANT:"ERR_NO_SUPPORTED_VARIANT",AMBIGUOUS_MEDIA:"ERR_AMBIGUOUS_MEDIA",INVALID_URL:"ERR_INVALID_URL",TAB_CREATE_FAILED:"ERR_TAB_CREATE_FAILED",NETWORK_ERROR:"ERR_NETWORK_ERROR"}),q=Object.freeze({[y.NO_TWEET_INFO]:"Không tìm thấy thông tin bài viết",[y.TWEET_INACCESSIBLE]:"Tweet không tồn tại hoặc bị giới hạn quyền riêng tư",[y.RATE_LIMITED]:"Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau",[y.NETWORK_TIMEOUT]:"Lỗi kết nối mạng hoặc yêu cầu quá thời gian",[y.NO_MEDIA]:"Không tìm thấy video trong bài viết",[y.NO_SUPPORTED_VARIANT]:"Không tìm thấy định dạng video tương thích",[y.AMBIGUOUS_MEDIA]:"Có nhiều video. Vui lòng chọn video cần mở",[y.INVALID_URL]:"URL CDN không hợp lệ hoặc không an toàn",[y.TAB_CREATE_FAILED]:"Không thể mở tab mới",[y.NETWORK_ERROR]:"Lỗi kết nối mạng"});function Et(t){return new Promise(n=>{let e=!1;function i(r){e||(e=!0,n(r))}try{const r=chrome.runtime.sendMessage(t,s=>{chrome.runtime.lastError?i({success:!1,error:"NETWORK_ERROR",message:chrome.runtime.lastError.message}):i(s||{success:!0})});r&&typeof r.then=="function"&&r.then(s=>i(s||{success:!0})).catch(s=>{i({success:!1,error:"NETWORK_ERROR",message:(s==null?void 0:s.message)||"Message error"})})}catch(r){i({success:!1,error:"NETWORK_ERROR",message:r.message})}})}async function fe(t,n={},e={}){var l,c,p,v,g,R;const i=!!(e.shiftKey||e.isShiftClick),r=(t==null?void 0:t.src)||(typeof(t==null?void 0:t.getAttribute)=="function"?t.getAttribute("src"):null);if(r&&typeof r=="string"&&!r.startsWith("blob:")&&r.trim()!==""&&!rt(r))return{success:!1,code:y.INVALID_URL,error:q[y.INVALID_URL]};const s=le(t),a=(n==null?void 0:n.tweetId)||((l=t==null?void 0:t.dataset)==null?void 0:l.xvtTweetId)||((v=(p=(c=t==null?void 0:t.closest)==null?void 0:c.call(t,"article"))==null?void 0:p.id)==null?void 0:v.replace("tweet-",""))||null;if(s){const h=Nt(s)||(t!=null&&t.videoWidth&&(t!=null&&t.videoHeight)?t.videoWidth*t.videoHeight:0);if(a&&h<3840*2160)try{const D=await Et({action:"FETCH_SYNDICATION",payload:{tweetId:a}});if(D!=null&&D.success&&(D!=null&&D.data)){const A=D.data.mediaDetails||[];let b=null;const u=Ct(A,n,t);if(u.media)b=u.media;else if(u.ambiguous){const d=s.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);if(d){const f=d[1];b=u.candidates.find(x=>{var U,P;return x.id_str===f?!0:(P=(U=x.video_info)==null?void 0:U.variants)==null?void 0:P.some(m=>m.url&&m.url.includes(`/${f}/`))})}}if(b){const d=At((g=b.video_info)==null?void 0:g.variants);if(d){const f=d.resolution??ct(d);if(h>0&&f>h||h===0&&f>0)return ut(d.url,!1,i)}}}}catch{}return ut(s,!1,i)}if(a)try{const h=await Et({action:"FETCH_SYNDICATION",payload:{tweetId:a}});if(h.success&&h.data){const A=h.data.mediaDetails||[],b=Ct(A,n,t);if(b.ambiguous)return typeof e.onAmbiguous=="function"&&e.onAmbiguous(b.candidates,async u=>{var f;const d=Ot((f=u==null?void 0:u.video_info)==null?void 0:f.variants);return d?ut(d.url,!!d.isHls,i):{success:!1,code:y.NO_SUPPORTED_VARIANT,error:q[y.NO_SUPPORTED_VARIANT]}}),{success:!1,isAmbiguous:!0,code:y.AMBIGUOUS_MEDIA,error:q[y.AMBIGUOUS_MEDIA],candidates:b.candidates};if(b.media){const u=Ot((R=b.media.video_info)==null?void 0:R.variants);return u?ut(u.url,!!u.isHls,i):{success:!1,code:y.NO_SUPPORTED_VARIANT,error:q[y.NO_SUPPORTED_VARIANT]}}return{success:!1,code:y.NO_MEDIA,error:q[y.NO_MEDIA]}}const D=pe(h.error);return{success:!1,code:D,error:q[D]||h.message||"Lỗi kết nối máy chủ X"}}catch(h){return{success:!1,code:y.NETWORK_ERROR,error:h.message||q[y.NETWORK_ERROR]}}return{success:!1,code:y.NO_TWEET_INFO,error:q[y.NO_TWEET_INFO]}}async function ut(t,n,e){var i;if(!rt(t))return{success:!1,code:y.INVALID_URL,error:q[y.INVALID_URL]};if(e)try{if(typeof navigator<"u"&&((i=navigator.clipboard)!=null&&i.writeText))return await navigator.clipboard.writeText(t),{success:!0,url:t,isHls:n,copied:!0}}catch{}try{const r=await Et({action:"OPEN_CDN",payload:{url:t}});return r&&r.success===!1?{success:!1,code:y.TAB_CREATE_FAILED,error:r.message||q[y.TAB_CREATE_FAILED]}:{success:!0,url:t,isHls:n,tabOpened:!0}}catch(r){return{success:!1,code:y.TAB_CREATE_FAILED,error:r.message||q[y.TAB_CREATE_FAILED]}}}function pe(t){switch(t){case"API_RATE_LIMIT":case"RATE_LIMIT":case"ERR_RATE_LIMITED":return y.RATE_LIMITED;case"TWEET_INACCESSIBLE":case"NOT_FOUND":case"ERR_TWEET_NOT_FOUND":case"ERR_AGE_RESTRICTED":return y.TWEET_INACCESSIBLE;case"API_TIMEOUT":case"TIMEOUT":case"ERR_NETWORK_TIMEOUT":return y.NETWORK_TIMEOUT;case"NO_MEDIA":case"ERR_NO_MEDIA":return y.NO_MEDIA;default:return y.NETWORK_ERROR}}const he=`
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
`;function me(t){var e;if(!t||typeof t!="object")return null;if(t.resolution){const i=String(t.resolution).trim();if(i.length>0)return i}const n=(e=t.video_info)==null?void 0:e.variants;if(Array.isArray(n)&&n.length>0){let i=0,r=0;for(const s of n){if(!s||typeof s.url!="string")continue;const a=s.url.match(/\/(\d+)x(\d+)\//);if(a){const l=Number(a[1]),c=Number(a[2]);!isNaN(l)&&!isNaN(c)&&l*c>r*i&&(r=l,i=c)}}if(i>0)return`${i}p`}return null}function kt(t,n=[],{onSelect:e,onCancel:i}={}){if(!t)return{destroy:()=>{}};const r=t.querySelector(".xvt-picker-popover");r&&r.remove();let s=t.querySelector("#xvt-picker-styles");s||(s=document.createElement("style"),s.id="xvt-picker-styles",s.textContent=he,t.appendChild(s));const a=document.createElement("div");a.className="xvt-picker-popover",a.setAttribute("role","dialog"),a.setAttribute("aria-label","Chọn video để mở");const l=document.createElement("div");l.className="xvt-picker-header";const c=document.createElement("span");c.className="xvt-picker-title",c.textContent="Chọn video";const p=document.createElement("button");p.className="xvt-picker-close",p.setAttribute("aria-label","Đóng"),p.innerHTML="&times;",l.appendChild(c),l.appendChild(p),a.appendChild(l);const v=document.createElement("div");v.className="xvt-picker-list",v.setAttribute("role","menu"),n.forEach((u,d)=>{var M;const f=document.createElement("div");if(f.className="xvt-picker-item",f.setAttribute("role","menuitem"),f.setAttribute("tabindex","0"),u.media_url_https){const T=document.createElement("img");T.className="xvt-picker-thumb",T.src=u.media_url_https,T.alt=`Thumbnail Video ${d+1}`,f.appendChild(T)}const x=document.createElement("div");x.className="xvt-picker-info";const U=document.createElement("span");U.className="xvt-picker-label",U.textContent=`Video ${d+1}`;const P=document.createElement("span");P.className="xvt-picker-meta";let m=null;if((M=u.video_info)!=null&&M.aspect_ratio){const[T,_]=u.video_info.aspect_ratio;m=`${T}:${_}`}const I=me(u);m&&I?P.textContent=`${m} • ${I}`:m?P.textContent=m:I?P.textContent=I:P.textContent=u.type||"MP4",x.appendChild(U),x.appendChild(P),f.appendChild(x);const O=T=>{T.stopPropagation(),T.preventDefault(),R(),typeof e=="function"&&e(u,d)};f.addEventListener("click",O),f.addEventListener("keydown",T=>{(T.key==="Enter"||T.key===" ")&&O(T)}),v.appendChild(f)}),a.appendChild(v);let g=null;function R(){g!==null&&(clearTimeout(g),g=null),document.removeEventListener("click",A,!0),document.removeEventListener("keydown",D),a.parentNode&&a.parentNode.removeChild(a)}function h(u){u&&(u.stopPropagation(),u.preventDefault()),R(),typeof i=="function"&&i()}function D(u){u.key==="Escape"&&h(u)}function A(u){(typeof u.composedPath=="function"?u.composedPath():[]).includes(a)||a.contains&&a.contains(u.target)||h(u)}return p.addEventListener("click",h),document.addEventListener("keydown",D),g=setTimeout(()=>{document.addEventListener("click",A,!0)},0),(t.querySelector(".xvt-toolbar-container")||t).appendChild(a),{destroy:R}}const Ee=300,L=2500,Ut=250;function be({host:t,wrapper:n,video:e,stateManager:i,toolbarController:r,stateStore:s,tweetInfo:a={},options:l={}}){var Bt,Ft,Wt,Gt,Kt,qt,zt,$t,jt,Xt,Qt,Yt,Zt;let c=!1,p=!1,v=null,g=0,R=null;const h=a.tweetId||((Bt=e==null?void 0:e.dataset)==null?void 0:Bt.xvtTweetId)||((Gt=(Wt=(Ft=e==null?void 0:e.closest)==null?void 0:Ft.call(e,"article"))==null?void 0:Wt.id)==null?void 0:Gt.replace("tweet-",""))||typeof window<"u"&&((zt=(qt=(Kt=window.location)==null?void 0:Kt.href)==null?void 0:qt.match(/\/status\/(\d+)/))==null?void 0:zt[1])||null,D=a.permalink||(h?`https://x.com/i/status/${h}`:null)||(typeof window<"u"&&((jt=($t=window.location)==null?void 0:$t.href)!=null&&jt.includes("/status/"))?window.location.href:null),A=a.videoKey||(h?at(h,a.mediaIndex,a.mediaFingerprint||e):null);function b(E){if(!E||E.type!=="DOWNLOAD_STATUS_CHANGED")return;const C=A&&E.videoKey&&E.videoKey===A,J=R&&E.downloadId&&E.downloadId===R;!C&&!J||(E.state==="complete"?(i.setState(o.COMPLETED,{action:"download",downloadId:E.downloadId}),r.showNotice("Đã tải xong video",L),setTimeout(()=>{const Q=i.getState();(Q===o.COMPLETED||Q===o.SUCCESS)&&i.setState(c||p?o.HOVERED:o.IDLE)},L)):E.state==="cancelled"?(i.setState(o.CANCELLED,{action:"download"}),r.showNotice("Đã hủy tải xuống",L),setTimeout(()=>{i.getState()===o.CANCELLED&&i.setState(c||p?o.HOVERED:o.IDLE)},L)):E.state==="interrupted"&&(i.setState(o.INTERRUPTED,{action:"download",error:E.error}),r.showNotice(E.message||"Tải xuống bị gián đoạn",L),setTimeout(()=>{const Q=i.getState();(Q===o.INTERRUPTED||Q===o.ERROR)&&i.setState(c||p?o.HOVERED:o.IDLE)},L)))}typeof chrome<"u"&&((Qt=(Xt=chrome.runtime)==null?void 0:Xt.onMessage)!=null&&Qt.addListener)&&chrome.runtime.onMessage.addListener(b);function u(){v!==null&&(clearTimeout(v),v=null)}function d(){u(),v=setTimeout(()=>{const E=i.getState();!c&&!p&&!i.isDismissed()&&E!==o.AMBIGUOUS&&E!==o.PICKER&&E!==o.DOWNLOADING&&r.hide(),v=null},Ee)}function f(){var E;i.isDismissed()||(c=!0,u(),(E=r.updatePosition)==null||E.call(r),r.show())}function x(){var E;i.isDismissed()||c||(c=!0,u(),(E=r.updatePosition)==null||E.call(r),r.show())}function U(E){if(i.isDismissed())return;const C=E.relatedTarget;C&&(C===t||t.contains(C))||(c=!1,d())}function P(){i.isDismissed()||(p=!0,u(),r.show())}function m(){i.isDismissed()||p||(p=!0,u(),r.show())}function I(E){if(i.isDismissed())return;const C=E.relatedTarget;C&&(C===n||n.contains(C))||(p=!1,d())}function O(E){E.stopPropagation()}function M(E){if(E.stopPropagation(),E.preventDefault(),i.isDismissed())return;const C=i.getState();if(C===o.PROCESSING||C===o.DOWNLOADING||C===o.SUCCESS||C===o.COMPLETED)return;const J=Date.now();if(J-g<Ut)return;if(g=J,!!!(l.enableDownload===!0||l.cobaltUrl||Jt())){const tt="Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";r.showNotice(tt,L),i.setState(o.UNCONFIGURED,{message:tt}),setTimeout(()=>{i.getState()===o.UNCONFIGURED&&i.setState(c||p?o.HOVERED:o.IDLE)},L);return}i.setState(o.PROCESSING,{action:"download"});const Y=`${A||h||"vid"}_${Date.now()}`,w={tweetId:h,permalink:D,username:a.username,mediaIndex:a.mediaIndex,videoKey:A,correlationId:Y};function F(tt={}){try{chrome.runtime.sendMessage({action:"COBALT_DOWNLOAD",payload:{...w,...tt}},V=>{if(!V){i.setState(o.ERROR,{action:"download"}),r.showNotice("Không nhận được phản hồi từ tiện ích.",L),setTimeout(()=>{i.getState()===o.ERROR&&i.setState(c||p?o.HOVERED:o.IDLE)},L);return}if(V.status==="picker"||V.type==="PICKER"){i.setState(o.PICKER,{items:V.items||V.picker}),kt(r.shadowRoot,V.items||V.picker,{onSelect:st=>{i.setState(o.PROCESSING,{action:"download"}),F({selectedUrl:st.url})},onCancel:()=>{i.setState(c||p?o.HOVERED:o.IDLE)}});return}if(V.success)R=V.downloadId,i.setState(o.DOWNLOADING,{action:"download",downloadId:V.downloadId}),r.showNotice("Đang tải video...",L);else if(V.error==="UNCONFIGURED"){const st=V.message||"Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";r.showNotice(st,L),i.setState(o.UNCONFIGURED,{message:st}),setTimeout(()=>{i.getState()===o.UNCONFIGURED&&i.setState(c||p?o.HOVERED:o.IDLE)},L)}else i.setState(o.ERROR,{action:"download",error:V.error}),r.showNotice(V.message||"Lỗi khi tải video",L),setTimeout(()=>{i.getState()===o.ERROR&&i.setState(c||p?o.HOVERED:o.IDLE)},L)})}catch(V){i.setState(o.ERROR,{action:"download",error:V.message}),r.showNotice(V.message||"Lỗi kết nối nền",L),setTimeout(()=>{i.getState()===o.ERROR&&i.setState(c||p?o.HOVERED:o.IDLE)},L)}}F()}function T(E){if(E.stopPropagation(),E.preventDefault(),i.isDismissed()||i.getState()===o.PROCESSING)return;const C=Date.now();if(C-g<Ut)return;if(g=C,l.enableCdnResolver===!1){const w="Tính năng Mở CDN sẽ được tích hợp ở Phase 3.";r.showNotice(w,L),i.setState(o.UNCONFIGURED,{message:w});return}const J=!!E.shiftKey;i.setState(o.PROCESSING,{action:"cdn"});const Q=l.cdnResolver||fe;function Y(w){if(w){if(w.isAmbiguous){i.getState()!==o.AMBIGUOUS&&i.setState(o.AMBIGUOUS,{candidates:w.candidates});return}w.success?(i.setState(o.SUCCESS,{action:"cdn"}),w.copied?r.showNotice("Đã sao chép liên kết CDN",L):w.isHls?r.showNotice("Đang mở luồng HLS (.m3u8)",L):r.showNotice("Đã mở tab CDN",L),setTimeout(()=>{i.getState()===o.SUCCESS&&i.setState(c||p?o.HOVERED:o.IDLE)},L)):(i.setState(o.ERROR,{action:"cdn",error:w.code||w.error}),r.showNotice(w.error||"Lỗi khi mở CDN",L),setTimeout(()=>{i.getState()===o.ERROR&&i.setState(c||p?o.HOVERED:o.IDLE)},L))}}try{const w=Q(e,a,{shiftKey:J,onAmbiguous:(F,tt)=>{i.setState(o.AMBIGUOUS,{candidates:F}),kt(r.shadowRoot,F,{onSelect:async(V,st)=>{i.setState(o.PROCESSING,{action:"cdn"});try{const bt=await tt(V);Y(bt)}catch(bt){Y({success:!1,error:bt.message||"Lỗi xử lý video"})}},onCancel:()=>{i.setState(c||p?o.HOVERED:o.IDLE)}})}});w&&typeof w.then=="function"?w.then(F=>{if(F!=null&&F.isAmbiguous){i.getState()!==o.AMBIGUOUS&&i.setState(o.AMBIGUOUS,{candidates:F.candidates});return}Y(F)}).catch(F=>{Y({success:!1,error:F.message||"Lỗi kết nối máy chủ X"})}):w!=null&&w.isAmbiguous?i.getState()!==o.AMBIGUOUS&&i.setState(o.AMBIGUOUS,{candidates:w.candidates}):Y(w)}catch(w){Y({success:!1,error:w.message||"Lỗi kết nối máy chủ X"})}}function _(E){E.stopPropagation(),E.preventDefault(),u(),r.dismiss()}function W(E,C){(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),C(E))}n&&(n.addEventListener("mouseenter",f),n.addEventListener("mousemove",x),n.addEventListener("mouseleave",U));const S=(Yt=e==null?void 0:e.closest)==null?void 0:Yt.call(e,'[data-testid="videoPlayer"]');if(S&&S!==n&&(S.addEventListener("mouseenter",f),S.addEventListener("mousemove",x)),e&&e!==n&&e!==S&&(e.addEventListener("mouseenter",f),e.addEventListener("mousemove",x)),t&&(t.addEventListener("mouseenter",P),t.addEventListener("mousemove",m),t.addEventListener("mouseleave",I),t.addEventListener("click",O),t.addEventListener("mousedown",O),t.addEventListener("mouseup",O)),typeof(n==null?void 0:n.matches)=="function")try{(n.matches(":hover")||S&&S.matches(":hover")||e&&((Zt=e.matches)!=null&&Zt.call(e,":hover")))&&(c=!0,r.show())}catch{}const N=t.shadowRoot;let H=null,B=null,G=null,z=null,lt=null,dt=null;N&&(H=N.querySelector(".xvt-btn-download"),B=N.querySelector(".xvt-btn-cdn"),G=N.querySelector(".xvt-btn-dismiss"),H&&(H.addEventListener("click",M),z=E=>W(E,M),H.addEventListener("keydown",z)),B&&(B.addEventListener("click",T),lt=E=>W(E,T),B.addEventListener("keydown",lt)),G&&(G.addEventListener("click",_),dt=E=>W(E,_),G.addEventListener("keydown",dt)));function De(){var E,C;u(),n&&(n.removeEventListener("mouseenter",f),n.removeEventListener("mousemove",x),n.removeEventListener("mouseleave",U)),S&&S!==n&&(S.removeEventListener("mouseenter",f),S.removeEventListener("mousemove",x)),e&&e!==n&&e!==S&&(e.removeEventListener("mouseenter",f),e.removeEventListener("mousemove",x)),t&&(t.removeEventListener("mouseenter",P),t.removeEventListener("mousemove",m),t.removeEventListener("mouseleave",I),t.removeEventListener("click",O),t.removeEventListener("mousedown",O),t.removeEventListener("mouseup",O)),H&&(H.removeEventListener("click",M),z&&H.removeEventListener("keydown",z)),B&&(B.removeEventListener("click",T),lt&&B.removeEventListener("keydown",lt)),G&&(G.removeEventListener("click",_),dt&&G.removeEventListener("keydown",dt)),typeof chrome<"u"&&((C=(E=chrome.runtime)==null?void 0:E.onMessage)!=null&&C.removeListener)&&chrome.runtime.onMessage.removeListener(b)}return{cleanup:De,cancelHideTimer:u,isHoveringVideo:()=>c,isHoveringToolbar:()=>p,getHideTimer:()=>v}}const ve=150;function xe(t,n={},e={}){const i=e.stateStore||ot,r=t.closest('[data-testid="videoComponent"]'),s=t.closest('[data-testid="videoPlayer"]'),a=r||s||t.parentElement;if(!a)return console.warn("[X Video Tools] Cannot attach toolbar: no valid video wrapper found."),null;if(typeof window<"u")try{const S=window.getComputedStyle(a).position;if((S==="static"||!S)&&(a.style.position="relative"),a.style.setProperty("overflow","visible","important"),a.parentElement&&a.parentElement.tagName!=="ARTICLE"&&a.parentElement!==document.body){const N=window.getComputedStyle(a.parentElement).overflow;(N==="hidden"||N==="clip")&&a.parentElement.style.setProperty("overflow","visible","important")}}catch{a.style.position="relative",a.style.setProperty("overflow","visible","important")}else(!a.style.position||a.style.position==="static")&&(a.style.position="relative");const l=n.videoKey||t.dataset.xvtVideoKey||(n.tweetId?at(n.tweetId,n.mediaIndex,n.mediaFingerprint||t):null),c=document.createElement("div");c.className="xvt-toolbar-host",c.setAttribute("data-xvt-mounted","true"),c.style.position="absolute",c.style.top="10px",c.style.left="10px",c.style.zIndex="9999";function p(){c.style.top="10px",c.style.left="10px",c.style.right="auto",c.style.transform="none"}p();const v=c.attachShadow({mode:"open"}),g=document.createElement("style");g.textContent=re,v.appendChild(g);const R=document.createElement("div");R.className="xvt-toolbar-container xvt-idle",R.innerHTML=`
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${K.DOWNLOAD}</span>
        <div class="xvt-tooltip" role="tooltip">Tải</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${K.CDN}</span>
        <div class="xvt-tooltip" role="tooltip">Link</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${K.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `,v.appendChild(R);const h=v.querySelector(".xvt-notice"),D=v.querySelector(".xvt-btn-download .xvt-btn-icon"),A=v.querySelector(".xvt-btn-download"),b=v.querySelector(".xvt-btn-cdn"),u=v.querySelector(".xvt-btn-cdn .xvt-btn-icon"),d=ce(o.IDLE);let f=null,x=null;d.subscribe((S,N,H)=>{R.classList.remove("xvt-idle","xvt-hovered","xvt-processing","xvt-downloading","xvt-completed","xvt-ambiguous","xvt-picker","xvt-success","xvt-error","xvt-interrupted","xvt-cancelled","xvt-unconfigured","xvt-dismissing"),R.classList.add(`xvt-${S}`);const B=(H==null?void 0:H.action)==="cdn";S===o.PROCESSING||S===o.DOWNLOADING?B?(u&&(u.innerHTML=K.SPINNER),b&&b.setAttribute("aria-busy","true")):(D&&(D.innerHTML=K.SPINNER),A&&A.setAttribute("aria-busy","true")):S===o.SUCCESS||S===o.COMPLETED?B?(u&&(u.innerHTML=K.CHECKMARK),b&&b.removeAttribute("aria-busy")):(D&&(D.innerHTML=K.CHECKMARK),A&&A.removeAttribute("aria-busy")):S===o.ERROR||S===o.INTERRUPTED?B?(u&&(u.innerHTML=K.ERROR),b&&b.removeAttribute("aria-busy")):(D&&(D.innerHTML=K.ERROR),A&&A.removeAttribute("aria-busy")):(D&&(D.innerHTML=K.DOWNLOAD),A&&A.removeAttribute("aria-busy"),u&&(u.innerHTML=K.CDN),b&&b.removeAttribute("aria-busy"))});function U(S,N=2500){h&&(f!==null&&(clearTimeout(f),f=null),h.textContent=S,R.classList.add("xvt-has-notice"),h.classList.add("xvt-notice-visible"),f=setTimeout(()=>{P()},N))}function P(){f!==null&&(clearTimeout(f),f=null),R&&R.classList.remove("xvt-has-notice"),h&&h.classList.remove("xvt-notice-visible")}function m(){d.isDismissed()||d.setState(o.HOVERED)}function I(){d.isDismissed()||d.getState()===o.AMBIGUOUS||d.getState()===o.PICKER||d.getState()===o.DOWNLOADING||d.setState(o.IDLE)}function O(){d.isDismissed()||(d.setState(o.DISMISSED),i.dismiss(l,t),R.classList.remove("xvt-hovered","xvt-idle","xvt-unconfigured"),R.classList.add("xvt-dismissing"),x=setTimeout(()=>{T()},ve))}const M=e.onDestroy;function T(){if(f!==null&&(clearTimeout(f),f=null),x!==null&&(clearTimeout(x),x=null),W&&W.cleanup(),c.parentNode&&c.parentNode.removeChild(c),d.destroy(),typeof M=="function")try{M()}catch(S){console.error("[X Video Tools] Error in onDestroy callback:",S)}}a.appendChild(c);const _={host:c,shadowRoot:v,wrapper:a,video:t,stateManager:d,show:m,hide:I,dismiss:O,showNotice:U,hideNotice:P,updatePosition:p,updateState:(S,N)=>d.setState(S,N),destroy:T},W=be({host:c,wrapper:a,video:t,stateManager:d,toolbarController:_,stateStore:i,tweetInfo:n,options:e});return _.eventController=W,_}const Z=new WeakMap;function Se(t,n={},e={}){if(!t||t.nodeType!==1)return null;const i=e.stateStore||ot,r=n.videoKey||t.dataset.xvtVideoKey||(n.tweetId?at(n.tweetId,n.mediaIndex,n.mediaFingerprint||t):null);if(i.isDismissed(r,t))return null;if(Z.has(t))return Z.get(t);const s=t.closest('[data-testid="videoComponent"]'),a=t.closest('[data-testid="videoPlayer"]'),l=s||a||t.parentElement;if(l&&l.querySelector(".xvt-toolbar-host"))return null;const c=xe(t,{...n,videoKey:r},{...e,stateStore:i,onDestroy:()=>{Z.delete(t)}});return c?(Z.set(t,c),c):null}function ye(t){if(!t)return!1;const n=Z.get(t);if(!n){const e=t.closest('[data-testid="videoComponent"]'),i=t.closest('[data-testid="videoPlayer"]'),r=e||i||t.parentElement,s=r==null?void 0:r.querySelector(".xvt-toolbar-host");return s&&s.parentNode?(s.parentNode.removeChild(s),!0):!1}return Z.delete(t),n.destroy(),!0}console.log("[X Video Tools] Content Script khởi tạo thành công trên",typeof window<"u"?window.location.hostname:"unknown"),console.log("[X Video Tools] Storage key tham chiếu:",et.SETTINGS),xt().catch(()=>{});function ge(t,n){console.log("[X Video Tools] Đã nhận diện video hợp lệ:",{tweetId:n.tweetId,permalink:n.permalink,mediaIndex:n.mediaIndex,isQuoted:n.isQuoted}),Se(t,n,{stateStore:ot})}function Te(t){ye(t)}const X=oe({root:typeof document<"u"?document.body:null,stateStore:ot,detectVideos:yt,findTweetContainer:ht,extractTweetInfo:Rt,onVideoDetected:ge,onVideoRemoved:Te});if(typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{X.start()}):X.start()),typeof window<"u"){window.addEventListener("pagehide",()=>{X.stop()}),window.addEventListener("popstate",()=>{X.scan()});let t=null;if(window.addEventListener("scroll",()=>{t===null&&(t=setTimeout(()=>{t=null,X.scan()},250))},{passive:!0}),typeof history<"u"){const n=history.pushState;typeof n=="function"&&(history.pushState=function(...i){const r=n.apply(this,i);return setTimeout(()=>X.scan(),0),r});const e=history.replaceState;typeof e=="function"&&(history.replaceState=function(...i){const r=e.apply(this,i);return setTimeout(()=>X.scan(),0),r})}}vt.observer=X,Object.defineProperty(vt,Symbol.toStringTag,{value:"Module"})})(this.XVideoToolsContent=this.XVideoToolsContent||{});

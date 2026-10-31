(function(Ot){"use strict";var $t,zt,jt,Xt;const ct=Object.freeze({SETTINGS:"xvt_settings",JWT_SESSION:"cobalt_jwt_session"}),ut=Object.freeze({cobaltUrl:"",videoQuality:"1080",apiKey:""});let Z={...ut};function le(){return!!(Z!=null&&Z.cobaltUrl&&Z.cobaltUrl.trim())}async function Lt(){var t,i;try{if(typeof chrome<"u"&&((i=(t=chrome==null?void 0:chrome.storage)==null?void 0:t.local)!=null&&i.get)){const e=await chrome.storage.local.get(ct.SETTINGS),n=e==null?void 0:e[ct.SETTINGS],o={...ut,...n||{}};return Z=o,o}return{...Z}}catch(e){return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:",e),Z={...ut},{...ut}}}typeof chrome<"u"&&((zt=($t=chrome==null?void 0:chrome.storage)==null?void 0:$t.local)!=null&&zt.get)&&(Lt().catch(()=>{}),(Xt=(jt=chrome==null?void 0:chrome.storage)==null?void 0:jt.onChanged)!=null&&Xt.addListener&&chrome.storage.onChanged.addListener((t,i)=>{if(i==="local"&&t[ct.SETTINGS]){const e=t[ct.SETTINGS].newValue;Z={...ut,...e||{}}}}));const P=Object.freeze({TWEET_ARTICLE:'article[data-testid="tweet"]',TIME_ELEMENT:"time",STATUS_ANCHOR:'a[href*="/status/"], a[href*="/statuses/"]',VIDEO_TAG:"video",VIDEO_PLAYER:'[data-testid="videoPlayer"], [data-testid="videoComponent"]',QUOTE_CONTAINER:'[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',EXCLUDED_COMPOSER:'[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',EXCLUDED_SIDEBAR:'[data-testid="sidebarColumn"], aside',EXCLUDED_DM:'[data-testid="messageEntry"]'}),Rt=Object.freeze({TWEET_ID:/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,MEDIA_INDEX:/(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,STATUS_URL:/^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,NUMERIC_ID:/^\d+$/});function Ct(t){return!t||typeof t.closest!="function"?!0:!!(t.closest(P.EXCLUDED_COMPOSER)||t.closest(P.EXCLUDED_SIDEBAR)||t.closest(P.EXCLUDED_DM))}function Tt(t,i=null){if(!t||typeof t.closest!="function")return null;if(i&&lt(i))return i;const e=t.closest(P.QUOTE_CONTAINER);if(e&&lt(e)&&(!i||i.contains(e)&&e!==i||e===i))return e;let n=t.parentElement;for(;n&&n!==i&&n!==document.body;){if(lt(n))return n;n=n.parentElement}return null}function lt(t){var i;return!t||typeof t.getAttribute!="function"?!1:!!(t.getAttribute("data-testid")==="quoteTweet"||t.getAttribute("data-testid")==="tweetQuote"||t.getAttribute("role")==="link"&&((i=t.querySelector)!=null&&i.call(t,'time, a[href*="/status/"], a[href*="/statuses/"]')))}function de(t,i){return i?t&&lt(t)?!0:!!Tt(i,t):!1}function It(t){if(!t||typeof t.closest!="function"||Ct(t))return null;const i=t.closest(P.QUOTE_CONTAINER);if(i&&lt(i))return i;const e=t.closest(P.TWEET_ARTICLE);if(e)return Tt(t,e)||e;const n=t.closest('div[aria-modal="true"], div[role="dialog"]');if(n)return n.querySelector(P.TWEET_ARTICLE)||n;const o=t.closest('main[role="main"], [data-testid="primaryColumn"]');return o&&typeof window<"u"&&window.location&&(window.location.pathname||window.location.href||"").includes("/status/")?o:null}function fe(t){return!t||typeof t.closest!="function"||t.isConnected===!1||Ct(t)?!1:!!It(t)}function kt(t=document){if(!t||typeof t.querySelectorAll!="function")return[];const i=t.querySelectorAll(P.VIDEO_TAG),e=[];for(let n=0;n<i.length;n++){const o=i[n];fe(o)&&e.push(o)}return e}function dt(t){var u,c,m,g,v,_,b,T,O,I,y;if(!t||typeof t.getAttribute!="function")return null;const i=((u=t.dataset)==null?void 0:u.mediaId)||t.getAttribute("data-media-id");if(i&&typeof i=="string"&&i.trim())return i.trim();const e=t.getAttribute("poster")||t.poster;if(e&&typeof e=="string"){const S=e.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);if(S&&S[1])return S[1];const d=e.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);if(d&&d[1])return d[1];const p=e.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);if(p&&p[1])return p[1];try{const E=new URL(e,"https://x.com").pathname.split("/").filter(Boolean);if(E.length>0){const l=E[E.length-1].replace(/\.[^.]+$/,"");if(l&&l!=="img")return l;if(E.length>1)return E[E.length-2]}}catch{}}const n=t.currentSrc||t.getAttribute("src")||t.src||((m=(c=t.querySelector)==null?void 0:c.call(t,"source"))==null?void 0:m.getAttribute("src"));if(n&&typeof n=="string"){const S=n.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);if(S&&S[1])return S[1];const d=n.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);if(d&&d[1])return d[1];const p=n.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);if(p&&p[1])return`blob_${p[1]}`}const o=(g=t.closest)==null?void 0:g.call(t,"[data-media-id]");if(o&&(!o.querySelectorAll||o.querySelectorAll("video").length===1)){const S=o.getAttribute("data-media-id");if(S&&S.trim())return S.trim()}const a=((v=t.closest)==null?void 0:v.call(t,'[data-testid="quoteTweet"], [data-testid="tweetQuote"], article[data-testid="tweet"]'))||document.body;let s=t.parentElement;for(;s&&s!==a&&s!==document.body;){if(typeof s.querySelectorAll=="function"&&s.querySelectorAll("video").length===1){const S=(_=s.querySelector)==null?void 0:_.call(s,'img[src*="media"], img[src*="thumb"], img[src*="amplify_video"], img[src*="ext_tw_video"]');if(S){const p=((b=S.getAttribute)==null?void 0:b.call(S,"src"))||S.src;if(p&&typeof p=="string"){const x=p.match(/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|media)\/([a-zA-Z0-9_-]+)/i);if(x&&x[1])return x[1]}}const d=(T=s.querySelectorAll)==null?void 0:T.call(s,'[style*="background"], [style*="url("]');if(d)for(let p=0;p<d.length;p++){const E=(((I=(O=d[p]).getAttribute)==null?void 0:I.call(O,"style"))||((y=d[p].style)==null?void 0:y.backgroundImage)||"").match(/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|media)\/([a-zA-Z0-9_-]+)/i);if(E&&E[1])return E[1]}}s=s.parentElement}return null}function ft(t,i=null,e=null){var o,a;const n=i??null;if(n!==null)return`${t}_media_${n}`;if(typeof e=="string"&&e.trim().length>0)return`${t}_media_fp_${e.trim()}`;if(e&&typeof e=="object"){const s=dt(e);if(s)return`${t}_media_fp_${s}`;const u=((o=e.closest)==null?void 0:o.call(e,'article, [data-testid="tweet"]'))||e.parentElement,c=(a=u==null?void 0:u.querySelectorAll)==null?void 0:a.call(u,"video");if(c&&c.length>1)return e.dataset||(e.dataset={}),e.dataset.xvtToken||(e.dataset.xvtToken=Math.random().toString(36).slice(2,10)),`${t}_media_tok_${e.dataset.xvtToken}`}return`${t}_media_null`}function Y(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(Rt.TWEET_ID);return e?e[1]:null}function mt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(Rt.MEDIA_INDEX);if(!e)return null;const n=parseInt(e[1],10);return Number.isInteger(n)&&n>0?n:null}function Dt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(Rt.STATUS_URL);if(!e)return null;const n=e[1];return n?n.trim():null}function Ut(t,i={}){const e=Y(t);if(!e)return null;let o=`https://x.com/${i.username||Dt(t)||"i"}/status/${e}`;const a=i.mediaIndex!==void 0?i.mediaIndex:mt(t);return a!=null&&Number.isInteger(Number(a))&&Number(a)>0&&(o+=`/video/${Number(a)}`),o}function Mt(t,i){var c,m,g,v,_,b,T,O,I,y,S;const e={tweetId:null,permalink:null,mediaIndex:null,mediaFingerprint:null,isQuoted:!1,username:null,container:t||null};if(!i)return e;e.mediaFingerprint=dt(i);let n=typeof i.closest=="function"?i.closest('a[href*="/status/"], a[href*="/statuses/"]'):null;if(!n&&typeof i.closest=="function"){const d=((c=i.closest)==null?void 0:c.call(i,'[data-testid="quoteTweet"], [data-testid="tweetQuote"], article[data-testid="tweet"]'))||document.body;let p=i.parentElement;for(;p&&p!==d&&p!==document.body;){if(p.querySelectorAll("video").length===1){const x=(m=p.querySelector)==null?void 0:m.call(p,'a[href*="/video/"]');if(x){n=x;break}}p=p.parentElement}if(!n){const x=i.closest('[data-testid="videoComponent"], [data-testid="videoPlayer"]')||i.parentElement;x&&x.querySelectorAll("video").length===1&&(n=(g=x.querySelector)==null?void 0:g.call(x,'a[href*="/video/"]'))}}if(n){const d=n.getAttribute("href")||n.href||"";e.mediaIndex=mt(d)}const o=Tt(i,t);if(!!o||de(t,i)){e.isQuoted=!0;const d=o||t;e.container=d;let p=null;if(d){if(typeof d.getAttribute=="function"){const x=d.getAttribute("href");x&&Y(x)&&(p=x)}if(!p&&(typeof d.querySelectorAll=="function"||typeof d.querySelector=="function")){const x=typeof d.querySelectorAll=="function"?d.querySelectorAll(P.TIME_ELEMENT):[d.querySelector(P.TIME_ELEMENT)].filter(Boolean);for(const E of x){const l=(v=E.closest)==null?void 0:v.call(E,P.STATUS_ANCHOR);if(l){const D=l.getAttribute("href")||l.href;if(D&&Y(D)){p=D;break}}}if(!p){const E=typeof d.querySelectorAll=="function"?d.querySelectorAll(P.STATUS_ANCHOR):[d.querySelector(P.STATUS_ANCHOR)].filter(Boolean);for(const l of E){const D=l.getAttribute("href")||l.href;if(D&&Y(D)){p=D;break}}}}}if(p){const x=Y(p);if(x)return e.tweetId=x,e.username=Dt(p),e.permalink=Ut(p,{mediaIndex:e.mediaIndex,username:e.username}),e}}const s=t||(typeof i.closest=="function"?i.closest(P.TWEET_ARTICLE):null);e.container=s;let u=null;if(s&&(typeof s.querySelectorAll=="function"||typeof s.querySelector=="function")){const d=typeof s.querySelectorAll=="function"?s.querySelectorAll(P.TIME_ELEMENT):[s.querySelector(P.TIME_ELEMENT)].filter(Boolean);for(const p of d){const x=(_=p.closest)==null?void 0:_.call(p,P.QUOTE_CONTAINER);if(x&&(((b=x.getAttribute)==null?void 0:b.call(x,"data-testid"))==="quoteTweet"||((T=x.getAttribute)==null?void 0:T.call(x,"data-testid"))==="tweetQuote"))continue;const E=(O=p.closest)==null?void 0:O.call(p,P.STATUS_ANCHOR);if(E){const l=E.getAttribute("href")||E.href;if(l&&Y(l)){u=l;break}}}if(!u){const p=typeof s.querySelectorAll=="function"?s.querySelectorAll(P.STATUS_ANCHOR):[s.querySelector(P.STATUS_ANCHOR)].filter(Boolean);for(const x of p){const E=(I=x.closest)==null?void 0:I.call(x,P.QUOTE_CONTAINER);if(E&&(((y=E.getAttribute)==null?void 0:y.call(E,"data-testid"))==="quoteTweet"||((S=E.getAttribute)==null?void 0:S.call(E,"data-testid"))==="tweetQuote"))continue;const l=x.getAttribute("href")||x.href;if(l&&Y(l)){u=l;break}}}}if(!u&&typeof window<"u"&&window.location){const d=window.location.pathname||window.location.href||"";Y(d)&&(u=d)}if(u){const d=Y(u);d&&(e.tweetId=d,e.username=Dt(u),e.permalink=Ut(u,{mediaIndex:e.mediaIndex,username:e.username}))}return e}class he{constructor(){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,this._dismissedKeys=new Set}isDismissed(i,e){var o;if(e&&e.dataset&&e.dataset.xvtDismissed==="true"||e&&this._dismissedElements.has(e))return!0;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);return n&&typeof n=="string"&&this._dismissedKeys.has(n)?(e&&(e.dataset&&(e.dataset.xvtDismissed="true"),this._dismissedElements.add(e)),!0):!1}dismiss(i,e){var o;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);e&&e.dataset&&(e.dataset.xvtDismissed="true",delete e.dataset.xvtMounted),e&&(this._dismissedElements.add(e),this._mountedElements.delete(e)),n&&typeof n=="string"&&this._dismissedKeys.add(n)}undismiss(i,e){var o;const n=i||((o=e==null?void 0:e.dataset)==null?void 0:o.xvtVideoKey);e&&e.dataset&&delete e.dataset.xvtDismissed,e&&this._dismissedElements.delete(e),n&&typeof n=="string"&&this._dismissedKeys.delete(n)}isMounted(i){return i?i.dataset&&i.dataset.xvtMounted==="true"?!0:this._mountedElements.has(i):!1}markMounted(i,e){i&&(i.dataset&&(i.dataset.xvtMounted="true",e&&(i.dataset.xvtVideoKey=e)),this._mountedElements.add(i))}unmarkMounted(i){i&&(i.dataset&&(delete i.dataset.xvtMounted,delete i.dataset.xvtVideoKey),this._mountedElements.delete(i))}getPerVideoData(i){if(i)return this._perVideoData.get(i)}setPerVideoData(i,e){if(!i||!e)return;const n=this._perVideoData.get(i)||{};this._perVideoData.set(i,{...n,...e})}reset(i=!0){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,i&&this._dismissedKeys.clear()}getDismissedCount(){return this._dismissedKeys.size}}function pe(){return new he}const ht=pe();function Vt(t,i){if(!(!t||t.nodeType!==1)){if(t.tagName==="VIDEO"){i.add(t);return}if(typeof t.querySelectorAll=="function")try{const e=t.querySelectorAll("video");for(let n=0;n<e.length;n++)i.add(e[n])}catch{}}}function me(t={}){const{onVideoDetected:i,onVideoRemoved:e,root:n=typeof document<"u"?document.body:null,stateStore:o=ht,detectVideos:a=kt,findTweetContainer:s=It,extractTweetInfo:u=Mt,scheduler:c=typeof requestAnimationFrame=="function"?requestAnimationFrame:l=>setTimeout(l,16),canceler:m=typeof cancelAnimationFrame=="function"?cancelAnimationFrame:l=>clearTimeout(l)}=t;let g=null,v=!1,_=null;const b=new Set;function T(l){var w;if(!l||l.isConnected===!1||o.isMounted(l)||o.isDismissed(void 0,l))return;const D=s(l);if(!D)return;const U=u(D,l);if(!U||!U.tweetId)return;const M=ft(U.tweetId,U.mediaIndex,U.mediaFingerprint||l);if(!o.isDismissed(M,l)){if(!l.getAttribute("src")&&!l.src&&!((w=l.querySelector)!=null&&w.call(l,"source"))&&!l.getAttribute("poster")){const R=()=>{l.removeEventListener("loadedmetadata",R),l.removeEventListener("loadstart",R),!o.isMounted(l)&&!o.isDismissed(void 0,l)&&(b.add(l),I())};l.addEventListener("loadedmetadata",R,{once:!0}),l.addEventListener("loadstart",R,{once:!0})}if(o.markMounted(l,M),o.setPerVideoData(l,{videoKey:M,...U,detectedAt:Date.now()}),typeof i=="function")try{i(l,{...U,videoKey:M})}catch(R){console.error("[X Video Tools] Error in onVideoDetected callback:",R)}}}function O(){if(_=null,b.size===0)return;const l=Array.from(b);b.clear();for(let D=0;D<l.length;D++)T(l[D])}function I(){_===null&&(_=c(()=>{O()}))}function y(l){var U;if(!v)return;let D=!1;for(let M=0;M<l.length;M++){const w=l[M];if(w.type==="attributes"){const R=w.target;R&&R.tagName==="VIDEO"&&!o.isMounted(R)&&!o.isDismissed(void 0,R)&&(b.add(R),D=!0);continue}if(w.type==="childList"){w.target&&w.target.tagName==="VIDEO"&&!o.isMounted(w.target)&&!o.isDismissed(void 0,w.target)&&(b.add(w.target),D=!0);const R=w.removedNodes;if(R&&R.length>0){const W=new Set;for(let C=0;C<R.length;C++){const X=R[C];X.nodeType===1&&Vt(X,W)}for(const C of W)if(o.unmarkMounted(C),typeof e=="function")try{e(C)}catch(X){console.error("[X Video Tools] Error in onVideoRemoved callback:",X)}}const q=w.addedNodes;if(!q||q.length===0)continue;for(let W=0;W<q.length;W++){const C=q[W];if(C.nodeType===1){const X=b.size;if(Vt(C,b),b.size>X&&(D=!0),C.tagName==="TIME"||typeof C.querySelector=="function"&&C.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]')){const at=(U=C.closest)==null?void 0:U.call(C,'article[data-testid="tweet"]');if(at){const et=at.querySelectorAll("video");for(let V=0;V<et.length;V++)!o.isMounted(et[V])&&!o.isDismissed(void 0,et[V])&&(b.add(et[V]),D=!0)}}}}}}D&&I()}function S(l){const D=l||n||(typeof document<"u"?document.body:null);if(!D)return;const U=a(D);for(let M=0;M<U.length;M++)b.add(U[M]);b.size>0&&O()}function d(l){if(v)return;const D=l||n||(typeof document<"u"?document.body:null);if(!D){console.warn("[X Video Tools] No valid root found to start VideoObserver.");return}if(typeof MutationObserver>"u"){console.warn("[X Video Tools] MutationObserver is not supported in this environment.");return}g=new MutationObserver(y),g.observe(D,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","poster","data-media-id"],characterData:!1}),v=!0,S(D)}function p(){g&&(g.disconnect(),g=null),_!==null&&(m(_),_=null),b.clear(),v=!1}function x(l=!1){p(),l&&o&&o.reset()}function E(){return v}return{start:d,stop:p,scan:S,reset:x,isActive:E,isRunning:E,_getPendingSize:()=>b.size}}const be=`
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
`,z={DOWNLOAD:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',CDN:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',CLOSE:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',SPINNER:'<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',CHECKMARK:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',ERROR:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'},r=Object.freeze({IDLE:"idle",HOVERED:"hovered",PROCESSING:"processing",DOWNLOADING:"downloading",COMPLETED:"completed",AMBIGUOUS:"ambiguous",PICKER:"picker",SUCCESS:"success",ERROR:"error",UNCONFIGURED:"unconfigured",INTERRUPTED:"interrupted",CANCELLED:"cancelled",DISMISSED:"dismissed"}),ye={[r.IDLE]:new Set([r.HOVERED,r.UNCONFIGURED,r.PROCESSING,r.DISMISSED]),[r.HOVERED]:new Set([r.IDLE,r.PROCESSING,r.UNCONFIGURED,r.DISMISSED]),[r.UNCONFIGURED]:new Set([r.HOVERED,r.IDLE,r.PROCESSING,r.DISMISSED]),[r.PROCESSING]:new Set([r.DOWNLOADING,r.SUCCESS,r.COMPLETED,r.ERROR,r.AMBIGUOUS,r.PICKER,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.DOWNLOADING]:new Set([r.COMPLETED,r.SUCCESS,r.ERROR,r.INTERRUPTED,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.AMBIGUOUS]:new Set([r.PROCESSING,r.DOWNLOADING,r.SUCCESS,r.ERROR,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.PICKER]:new Set([r.PROCESSING,r.DOWNLOADING,r.SUCCESS,r.ERROR,r.CANCELLED,r.HOVERED,r.IDLE,r.DISMISSED]),[r.SUCCESS]:new Set([r.HOVERED,r.IDLE,r.DISMISSED,r.PROCESSING]),[r.COMPLETED]:new Set([r.HOVERED,r.IDLE,r.DISMISSED,r.PROCESSING]),[r.ERROR]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.INTERRUPTED]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.CANCELLED]:new Set([r.PROCESSING,r.HOVERED,r.IDLE,r.DISMISSED]),[r.DISMISSED]:new Set};class xe{constructor(i=r.IDLE){this._state=i,this._payload=null,this._listeners=new Set}getState(){return this._state}getPayload(){return this._payload}isDismissed(){return this._state===r.DISMISSED}isVisible(){return this._state!==r.IDLE&&this._state!==r.DISMISSED}setState(i,e=null){if(this._state===r.DISMISSED)return!1;if(this._state===i)return this._payload=e,this._notify(this._state,this._state,e),!0;const n=ye[this._state];if(!n||!n.has(i))return console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${i}`),!1;const o=this._state;return this._state=i,this._payload=e,this._notify(this._state,o,e),!0}subscribe(i){return typeof i!="function"?()=>{}:(this._listeners.add(i),()=>{this._listeners.delete(i)})}_notify(i,e,n){for(const o of this._listeners)try{o(i,e,n)}catch(a){console.error("[X Video Tools] Error in toolbar state subscriber:",a)}}destroy(){this._listeners.clear(),this._payload=null}}function Ee(t){return new xe(t)}const ge="video.twimg.com";function pt(t){if(!t||typeof t!="string")return!1;const i=t.trim();if(!i||i.startsWith("blob:")||i.startsWith("data:")||i.startsWith("javascript:"))return!1;try{const e=new URL(i);if(e.protocol!=="https:"||e.hostname.toLowerCase()!==ge)return!1;const o=e.pathname;if(!o||o==="/"||o.trim()==="")return!1;const a=o.toLowerCase();return!(a.endsWith(".jpg")||a.endsWith(".jpeg")||a.endsWith(".png")||a.endsWith(".webp"))}catch{return!1}}function Se(t){if(!t||typeof t!="object")return null;function i(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("blob:")||n.startsWith("data:")||!pt(n))return null;try{const a=new URL(n).pathname.toLowerCase();return a.includes("_thumb")||a.endsWith(".jpg")||a.endsWith(".png")||a.endsWith(".webp")?null:a.endsWith(".mp4")||a.includes(".mp4")||a.includes("/vid/")||a.includes("/pu/vid/")?n:null}catch{return null}}try{const e=t.currentSrc,n=i(e);if(n)return n}catch{}try{const e=t.src||(typeof t.getAttribute=="function"?t.getAttribute("src"):null),n=i(e);if(n)return n}catch{}try{if(typeof t.querySelectorAll=="function"){const e=t.querySelectorAll("source");for(const n of e){const o=n.src||n.getAttribute("src"),a=i(o);if(a)return a}}}catch{}return null}function Pt(t){if(!t||typeof t!="string")return 0;const i=t.match(/\/(\d+)x(\d+)\//);if(!i)return 0;const e=Number(i[1]),n=Number(i[2]);return isNaN(e)||isNaN(n)||e<=0||n<=0?0:e*n}function Ht(t){var n,o,a,s;if(!t||typeof t!="object")return!1;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((o=t.dimensions)==null?void 0:o.width)),e=Number(t.height??((a=t.original_info)==null?void 0:a.height)??((s=t.dimensions)==null?void 0:s.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0||typeof t.resolution=="string"&&/^\d+x\d+$/.test(t.resolution))return!0;if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return!0}return!1}function bt(t){var n,o,a,s;if(!t||typeof t!="object")return 0;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((o=t.dimensions)==null?void 0:o.width)),e=Number(t.height??((a=t.original_info)==null?void 0:a.height)??((s=t.dimensions)==null?void 0:s.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0)return i*e;if(typeof t.resolution=="string"){const u=t.resolution.match(/^(\d+)x(\d+)$/);if(u){const c=Number(u[1]),m=Number(u[2]);if(c>0&&m>0)return c*m}}else if(t.resolution&&typeof t.resolution=="object"){const u=Number(t.resolution.width),c=Number(t.resolution.height);if(!isNaN(u)&&!isNaN(c)&&u>0&&c>0)return u*c}return t.url&&typeof t.url=="string"?Pt(t.url):0}function ve(t,i){const e=Ht(t),n=Ht(i),o=bt(t),a=bt(i),s=Number(t.bitrate||0),u=Number(i.bitrate||0);if(e&&n)return o!==a?a-o:u-s;if(e&&!n){if(o>=a||o>0&&s>=u)return-1}else if(!e&&n&&(a>=o||a>0&&u>=s))return 1;return o>0&&a>0?o!==a?a-o:u-s:s!==u?u-s:a-o}function Ft(t){if(!Array.isArray(t)||t.length===0)return null;const i=t.filter(a=>!a||typeof a!="object"||a.content_type!=="video/mp4"||!a.url||typeof a.url!="string"?!1:pt(a.url));if(i.length===0)return null;let e=i[0];for(let a=1;a<i.length;a++){const s=i[a];ve(e,s)>0&&(e=s)}const n=bt(e),o=Number(e.bitrate||0);return{...e,url:e.url,isHls:!1,resolution:n,bitrate:o}}function Bt(t){if(!Array.isArray(t)||t.length===0)return null;const i=Ft(t);if(i)return i;const e=t.find(n=>{if(!n||typeof n!="object"||!n.url)return!1;const o=n.content_type==="application/x-mpegURL"||n.content_type==="application/vnd.apple.mpegurl",a=n.url.toLowerCase().includes(".m3u8");return(o||a)&&pt(n.url)});return e?{...e,url:e.url,isHls:!0,bitrate:Number(e.bitrate||0)}:null}function qt(t){var i;return!t||typeof t!="object"?!1:t.type==="video"||t.type==="animated_gif"||!!((i=t.video_info)!=null&&i.variants)}function Wt(t){var e;const i=[];if(!t)return i;if(t.id_str&&i.push(String(t.id_str)),t.media_url_https){const n=t.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);n&&i.push(n[1])}if(Array.isArray((e=t.video_info)==null?void 0:e.variants)){for(const n of t.video_info.variants)if(n.url){const o=n.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);o&&i.push(o[1])}}return i}function _t(t,i={},e=null){var u;if(!Array.isArray(t)||t.length===0)return{media:null,ambiguous:!1,candidates:[]};const n=t.filter(qt);if(n.length===0)return{media:null,ambiguous:!1,candidates:[]};const o=i.mediaIndex,a=Number(o);if(!isNaN(a)&&a>0){const c=t[a-1];if(c&&qt(c))return{media:c,ambiguous:!1,candidates:n}}let s=i.mediaFingerprint;if(!s&&e&&(s=dt(e),!s)){const c=((u=e.getAttribute)==null?void 0:u.call(e,"poster"))||e.poster;if(c){const m=c.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);m&&(s=m[1])}}if(s&&typeof s=="string"){const c=s.trim(),m=n.filter(g=>Wt(g).some(_=>_===c));if(m.length===1)return{media:m[0],ambiguous:!1,candidates:n};if(m.length===0){const g=n.filter(v=>Wt(v).some(b=>c.includes(b)||b.includes(c)));if(g.length===1)return{media:g[0],ambiguous:!1,candidates:n}}}return n.length===1?{media:n[0],ambiguous:!1,candidates:n}:{media:null,ambiguous:!0,candidates:n}}const N=Object.freeze({NO_TWEET_INFO:"ERR_NO_TWEET_INFO",TWEET_INACCESSIBLE:"ERR_TWEET_INACCESSIBLE",RATE_LIMITED:"ERR_RATE_LIMITED",NETWORK_TIMEOUT:"ERR_NETWORK_TIMEOUT",NO_MEDIA:"ERR_NO_MEDIA",NO_SUPPORTED_VARIANT:"ERR_NO_SUPPORTED_VARIANT",AMBIGUOUS_MEDIA:"ERR_AMBIGUOUS_MEDIA",INVALID_URL:"ERR_INVALID_URL",TAB_CREATE_FAILED:"ERR_TAB_CREATE_FAILED",NETWORK_ERROR:"ERR_NETWORK_ERROR"}),j=Object.freeze({[N.NO_TWEET_INFO]:"Không tìm thấy thông tin bài viết",[N.TWEET_INACCESSIBLE]:"Tweet không tồn tại hoặc bị giới hạn quyền riêng tư",[N.RATE_LIMITED]:"Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau",[N.NETWORK_TIMEOUT]:"Lỗi kết nối mạng hoặc yêu cầu quá thời gian",[N.NO_MEDIA]:"Không tìm thấy video trong bài viết",[N.NO_SUPPORTED_VARIANT]:"Không tìm thấy định dạng video tương thích",[N.AMBIGUOUS_MEDIA]:"Có nhiều video. Vui lòng chọn video cần mở",[N.INVALID_URL]:"URL CDN không hợp lệ hoặc không an toàn",[N.TAB_CREATE_FAILED]:"Không thể mở tab mới",[N.NETWORK_ERROR]:"Lỗi kết nối mạng"});function At(t){return new Promise(i=>{let e=!1;function n(o){e||(e=!0,i(o))}try{const o=chrome.runtime.sendMessage(t,a=>{chrome.runtime.lastError?n({success:!1,error:"NETWORK_ERROR",message:chrome.runtime.lastError.message}):n(a||{success:!0})});o&&typeof o.then=="function"&&o.then(a=>n(a||{success:!0})).catch(a=>{n({success:!1,error:"NETWORK_ERROR",message:(a==null?void 0:a.message)||"Message error"})})}catch(o){n({success:!1,error:"NETWORK_ERROR",message:o.message})}})}async function Re(t,i={},e={}){var u,c,m,g,v,_;const n=!!(e.shiftKey||e.isShiftClick),o=(t==null?void 0:t.src)||(typeof(t==null?void 0:t.getAttribute)=="function"?t.getAttribute("src"):null);if(o&&typeof o=="string"&&!o.startsWith("blob:")&&o.trim()!==""&&!pt(o))return{success:!1,code:N.INVALID_URL,error:j[N.INVALID_URL]};const a=Se(t),s=(i==null?void 0:i.tweetId)||((u=t==null?void 0:t.dataset)==null?void 0:u.xvtTweetId)||((g=(m=(c=t==null?void 0:t.closest)==null?void 0:c.call(t,"article"))==null?void 0:m.id)==null?void 0:g.replace("tweet-",""))||null;if(a){const b=Pt(a)||(t!=null&&t.videoWidth&&(t!=null&&t.videoHeight)?t.videoWidth*t.videoHeight:0);if(s&&b<3840*2160)try{const T=await At({action:"FETCH_SYNDICATION",payload:{tweetId:s}});if(T!=null&&T.success&&(T!=null&&T.data)){const O=T.data.mediaDetails||[];let I=null;const y=_t(O,i,t);if(y.media)I=y.media;else if(y.ambiguous){const S=a.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);if(S){const d=S[1];I=y.candidates.find(p=>{var x,E;return p.id_str===d?!0:(E=(x=p.video_info)==null?void 0:x.variants)==null?void 0:E.some(l=>l.url&&l.url.includes(`/${d}/`))})}}if(I){const S=Ft((v=I.video_info)==null?void 0:v.variants);if(S){const d=S.resolution??bt(S);if(b>0&&d>b||b===0&&d>0)return yt(S.url,!1,n)}}}}catch{}return yt(a,!1,n)}if(s)try{const b=await At({action:"FETCH_SYNDICATION",payload:{tweetId:s}});if(b.success&&b.data){const O=b.data.mediaDetails||[],I=_t(O,i,t);if(I.ambiguous)return typeof e.onAmbiguous=="function"&&e.onAmbiguous(I.candidates,async y=>{var d;const S=Bt((d=y==null?void 0:y.video_info)==null?void 0:d.variants);return S?yt(S.url,!!S.isHls,n):{success:!1,code:N.NO_SUPPORTED_VARIANT,error:j[N.NO_SUPPORTED_VARIANT]}}),{success:!1,isAmbiguous:!0,code:N.AMBIGUOUS_MEDIA,error:j[N.AMBIGUOUS_MEDIA],candidates:I.candidates};if(I.media){const y=Bt((_=I.media.video_info)==null?void 0:_.variants);return y?yt(y.url,!!y.isHls,n):{success:!1,code:N.NO_SUPPORTED_VARIANT,error:j[N.NO_SUPPORTED_VARIANT]}}return{success:!1,code:N.NO_MEDIA,error:j[N.NO_MEDIA]}}const T=Te(b.error);return{success:!1,code:T,error:j[T]||b.message||"Lỗi kết nối máy chủ X"}}catch(b){return{success:!1,code:N.NETWORK_ERROR,error:b.message||j[N.NETWORK_ERROR]}}return{success:!1,code:N.NO_TWEET_INFO,error:j[N.NO_TWEET_INFO]}}async function yt(t,i,e){var n;if(!pt(t))return{success:!1,code:N.INVALID_URL,error:j[N.INVALID_URL]};if(e)try{if(typeof navigator<"u"&&((n=navigator.clipboard)!=null&&n.writeText))return await navigator.clipboard.writeText(t),{success:!0,url:t,isHls:i,copied:!0}}catch{}try{const o=await At({action:"OPEN_CDN",payload:{url:t}});return o&&o.success===!1?{success:!1,code:N.TAB_CREATE_FAILED,error:o.message||j[N.TAB_CREATE_FAILED]}:{success:!0,url:t,isHls:i,tabOpened:!0}}catch(o){return{success:!1,code:N.TAB_CREATE_FAILED,error:o.message||j[N.TAB_CREATE_FAILED]}}}function Te(t){switch(t){case"API_RATE_LIMIT":case"RATE_LIMIT":case"ERR_RATE_LIMITED":return N.RATE_LIMITED;case"TWEET_INACCESSIBLE":case"NOT_FOUND":case"ERR_TWEET_NOT_FOUND":case"ERR_AGE_RESTRICTED":return N.TWEET_INACCESSIBLE;case"API_TIMEOUT":case"TIMEOUT":case"ERR_NETWORK_TIMEOUT":return N.NETWORK_TIMEOUT;case"NO_MEDIA":case"ERR_NO_MEDIA":return N.NO_MEDIA;default:return N.NETWORK_ERROR}}const Ie=`
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
`;function De(t){var e;if(!t||typeof t!="object")return null;if(t.resolution){const n=String(t.resolution).trim();if(n.length>0)return n}const i=(e=t.video_info)==null?void 0:e.variants;if(Array.isArray(i)&&i.length>0){let n=0,o=0;for(const a of i){if(!a||typeof a.url!="string")continue;const s=a.url.match(/\/(\d+)x(\d+)\//);if(s){const u=Number(s[1]),c=Number(s[2]);!isNaN(u)&&!isNaN(c)&&u*c>o*n&&(o=u,n=c)}}if(n>0)return`${n}p`}return null}function Kt(t,i=[],{onSelect:e,onCancel:n}={}){if(!t)return{destroy:()=>{}};const o=t.querySelector(".xvt-picker-popover");o&&o.remove();let a=t.querySelector("#xvt-picker-styles");a||(a=document.createElement("style"),a.id="xvt-picker-styles",a.textContent=Ie,t.appendChild(a));const s=document.createElement("div");s.className="xvt-picker-popover",s.setAttribute("role","dialog"),s.setAttribute("aria-label","Chọn video để mở");const u=document.createElement("div");u.className="xvt-picker-header";const c=document.createElement("span");c.className="xvt-picker-title",c.textContent="Chọn video";const m=document.createElement("button");m.className="xvt-picker-close",m.setAttribute("aria-label","Đóng"),m.innerHTML="&times;",u.appendChild(c),u.appendChild(m),s.appendChild(u);const g=document.createElement("div");g.className="xvt-picker-list",g.setAttribute("role","menu"),i.forEach((y,S)=>{var M;const d=document.createElement("div");if(d.className="xvt-picker-item",d.setAttribute("role","menuitem"),d.setAttribute("tabindex","0"),y.media_url_https){const w=document.createElement("img");w.className="xvt-picker-thumb",w.src=y.media_url_https,w.alt=`Thumbnail Video ${S+1}`,d.appendChild(w)}const p=document.createElement("div");p.className="xvt-picker-info";const x=document.createElement("span");x.className="xvt-picker-label",x.textContent=`Video ${S+1}`;const E=document.createElement("span");E.className="xvt-picker-meta";let l=null;if((M=y.video_info)!=null&&M.aspect_ratio){const[w,R]=y.video_info.aspect_ratio;l=`${w}:${R}`}const D=De(y);l&&D?E.textContent=`${l} • ${D}`:l?E.textContent=l:D?E.textContent=D:E.textContent=y.type||"MP4",p.appendChild(x),p.appendChild(E),d.appendChild(p);const U=w=>{w.stopPropagation(),w.preventDefault(),_(),typeof e=="function"&&e(y,S)};d.addEventListener("click",U),d.addEventListener("keydown",w=>{(w.key==="Enter"||w.key===" ")&&U(w)}),g.appendChild(d)}),s.appendChild(g);let v=null;function _(){v!==null&&(clearTimeout(v),v=null),document.removeEventListener("click",O,!0),document.removeEventListener("keydown",T),s.parentNode&&s.parentNode.removeChild(s)}function b(y){y&&(y.stopPropagation(),y.preventDefault()),_(),typeof n=="function"&&n()}function T(y){y.key==="Escape"&&b(y)}function O(y){(typeof y.composedPath=="function"?y.composedPath():[]).includes(s)||s.contains&&s.contains(y.target)||b(y)}return m.addEventListener("click",b),document.addEventListener("keydown",T),v=setTimeout(()=>{document.addEventListener("click",O,!0)},0),(t.querySelector(".xvt-toolbar-container")||t).appendChild(s),{destroy:_}}function _e(t,i={}){if(!Array.isArray(t)||t.length===0)return null;const e=u=>!!(u&&(u.type==="video"||u.type==="gif"||u.type==="animated_gif"||!u.type)),n=t.filter(e),o=n.length>0?n:t,a=i==null?void 0:i.mediaIndex;if(typeof a=="number"&&a>0){const u=t[a-1];if(u&&u.url&&e(u))return u;const c=n[a-1];if(c&&c.url)return c}const s=i==null?void 0:i.mediaFingerprint;if(s&&typeof s=="string"){const u=s.trim();if(u.length>0){const c=o.filter(m=>{const g=m.thumb?String(m.thumb):"",v=m.url?String(m.url):"";return g.includes(u)||v.includes(u)});if(c.length===1)return c[0]}}return o.length===1&&o[0].url?o[0]:null}const Ae=300,L=2500,Gt=250;function Ne({host:t,wrapper:i,video:e,stateManager:n,toolbarController:o,stateStore:a,tweetInfo:s={},options:u={}}){var Qt,Yt,Zt,Jt,te,ee,ie,ne,oe,re,se,ae,ce,ue;let c=!1,m=!1,g=!1,v=null,_=0,b=null;const T=s.tweetId||((Qt=e==null?void 0:e.dataset)==null?void 0:Qt.xvtTweetId)||((Jt=(Zt=(Yt=e==null?void 0:e.closest)==null?void 0:Yt.call(e,"article"))==null?void 0:Zt.id)==null?void 0:Jt.replace("tweet-",""))||typeof window<"u"&&((ie=(ee=(te=window.location)==null?void 0:te.href)==null?void 0:ee.match(/\/status\/(\d+)/))==null?void 0:ie[1])||null,O=s.permalink||(T?`https://x.com/i/status/${T}`:null)||(typeof window<"u"&&((oe=(ne=window.location)==null?void 0:ne.href)!=null&&oe.includes("/status/"))?window.location.href:null),I=s.videoKey||((re=e==null?void 0:e.dataset)==null?void 0:re.xvtVideoKey)||(T?ft(T,s.mediaIndex,s.mediaFingerprint||e):null);function y(){var f;if(s.mediaIndex!==void 0&&s.mediaIndex!==null)return s.mediaIndex;if(e&&typeof e.closest=="function"){const h=e.closest('a[href*="/status/"], a[href*="/statuses/"]');if(h){const H=h.getAttribute("href")||h.href,B=mt(H);if(B)return B}const K=xt(e);if(K){const H=(f=K.querySelector)==null?void 0:f.call(K,'a[href*="/video/"]');if(H){const B=H.getAttribute("href")||H.href,$=mt(B);if($)return $}}}return s.mediaIndex}function S(f){if(!f||f.type!=="DOWNLOAD_STATUS_CHANGED")return;const h=I&&f.videoKey&&f.videoKey===I,K=b&&f.downloadId&&f.downloadId===b;!h&&!K||(f.state==="complete"?(n.setState(r.COMPLETED,{action:"download",downloadId:f.downloadId}),o.showNotice("Đã tải xong video",L),setTimeout(()=>{const H=n.getState();(H===r.COMPLETED||H===r.SUCCESS)&&n.setState(c||m?r.HOVERED:r.IDLE)},L)):f.state==="cancelled"?(n.setState(r.CANCELLED,{action:"download"}),o.showNotice("Đã hủy tải xuống",L),setTimeout(()=>{n.getState()===r.CANCELLED&&n.setState(c||m?r.HOVERED:r.IDLE)},L)):f.state==="interrupted"&&(n.setState(r.INTERRUPTED,{action:"download",error:f.error}),o.showNotice(f.message||"Tải xuống bị gián đoạn",L),setTimeout(()=>{const H=n.getState();(H===r.INTERRUPTED||H===r.ERROR)&&n.setState(c||m?r.HOVERED:r.IDLE)},L)))}typeof chrome<"u"&&((ae=(se=chrome.runtime)==null?void 0:se.onMessage)!=null&&ae.addListener)&&chrome.runtime.onMessage.addListener(S);function d(){v!==null&&(clearTimeout(v),v=null)}function p(){d(),v=setTimeout(()=>{const f=n.getState();!c&&!m&&!g&&!n.isDismissed()&&f!==r.AMBIGUOUS&&f!==r.PICKER&&f!==r.DOWNLOADING&&o.hide(),v=null},Ae)}function x(f){if(!f||!f.target)return!0;const h=f.target;if(h===e||typeof e.contains=="function"&&e.contains(h)||h===t||typeof t.contains=="function"&&t.contains(h)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(h))return!0;if(i&&i.querySelectorAll("video").length===1)return!!(h===i||typeof i.contains=="function"&&i.contains(h));if(i&&i.querySelectorAll("video").length>1){const K=i.querySelectorAll("video");for(let B=0;B<K.length;B++){const $=K[B];if($===e)continue;if(h===$||typeof $.contains=="function"&&$.contains(h))return!1;let G=h;for(;G&&G!==i&&G!==document.body;){if(G.contains($)&&!G.contains(e))return!1;G=G.parentElement}}let H=h;for(;H&&H!==i&&H!==document.body;){if(H.contains(e))return!0;H=H.parentElement}if(h!==i){const $=`${h.id||""} ${h.className||""}`.match(/[_-](\d+)\b/),G=y();if($){const A=Number($[1]);if(G&&A===Number(G))return!0;if(G&&A!==Number(G))return!1}if(typeof h.getBoundingClientRect=="function"&&typeof e.getBoundingClientRect=="function")try{const A=h.getBoundingClientRect(),k=e.getBoundingClientRect();if(A.width>0&&A.height>0&&k.width>0&&k.height>0){const F=A.left+A.width/2,it=A.top+A.height/2;if(F>=k.left&&F<=k.right&&it>=k.top&&it<=k.bottom)return!0}}catch{}if(h.previousElementSibling===e)return!0}return!1}return!1}function E(f){var h;n.isDismissed()||x(f)&&(c=!0,d(),(h=o.updatePosition)==null||h.call(o),o.show())}function l(f){var K;if(n.isDismissed())return;if(!x(f)){c&&(c=!1,p());return}c||(c=!0,d(),(K=o.updatePosition)==null||K.call(o),o.show())}function D(f){if(n.isDismissed())return;const h=f==null?void 0:f.relatedTarget;h&&(h===t||typeof t.contains=="function"&&t.contains(h)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(h))||h&&(h===e||typeof e.contains=="function"&&e.contains(h))||i&&i.querySelectorAll("video").length>1&&h&&x({target:h})||(c=!1,p())}function U(){n.isDismissed()||(m=!0,d(),o.show())}function M(){n.isDismissed()||m||(m=!0,d(),o.show())}function w(f){if(n.isDismissed())return;const h=f==null?void 0:f.relatedTarget;h&&(h===t||typeof t.contains=="function"&&t.contains(h)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(h)||h===e||typeof e.contains=="function"&&e.contains(h)||(h===i||typeof i.contains=="function"&&i.contains(h))&&x({target:h}))||(m=!1,p())}function R(){n.isDismissed()||(g=!0,d(),o.show())}function q(f){if(n.isDismissed())return;const h=f==null?void 0:f.relatedTarget;h&&(h===t||typeof t.contains=="function"&&t.contains(h)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(h))||(g=!1,p())}function W(f){f.stopPropagation()}function C(f){if(f.stopPropagation(),f.preventDefault(),n.isDismissed())return;const h=n.getState();if(h===r.PROCESSING||h===r.DOWNLOADING||h===r.SUCCESS||h===r.COMPLETED)return;const K=Date.now();if(K-_<Gt)return;if(_=K,!!!(u.enableDownload===!0||u.cobaltUrl||le())){const k="Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";o.showNotice(k,L),n.setState(r.UNCONFIGURED,{message:k}),setTimeout(()=>{n.getState()===r.UNCONFIGURED&&n.setState(c||m?r.HOVERED:r.IDLE)},L);return}n.setState(r.PROCESSING,{action:"download"});const B=y(),$=`${I||T||"vid"}_${Date.now()}`,G={tweetId:T,permalink:O,username:s.username,mediaIndex:B,mediaFingerprint:s.mediaFingerprint||dt(e),videoKey:I,correlationId:$};function A(k={}){try{chrome.runtime.sendMessage({action:"COBALT_DOWNLOAD",payload:{...G,...k}},F=>{var it,nt,Nt;if((it=chrome.runtime)!=null&&it.lastError||!F){n.setState(r.ERROR,{action:"download"}),o.showNotice(((Nt=(nt=chrome.runtime)==null?void 0:nt.lastError)==null?void 0:Nt.message)||"Không nhận được phản hồi từ tiện ích.",L),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||m?r.HOVERED:r.IDLE)},L);return}if(F.status==="picker"||F.type==="PICKER"){const Q=F.items||F.picker||[],Ve=y(),wt=_e(Q,{mediaIndex:Ve,mediaFingerprint:s.mediaFingerprint||dt(e)});if(wt&&wt.url){n.setState(r.PROCESSING,{action:"download"}),A({selectedUrl:wt.url});return}n.setState(r.PICKER,{items:Q}),Kt(o.shadowRoot,Q,{onSelect:Pe=>{n.setState(r.PROCESSING,{action:"download"}),A({selectedUrl:Pe.url})},onCancel:()=>{n.setState(c||m?r.HOVERED:r.IDLE)}});return}if(F.success)b=F.downloadId,n.setState(r.DOWNLOADING,{action:"download",downloadId:F.downloadId}),o.showNotice("Đang tải video...",L);else if(F.error==="UNCONFIGURED"){const Q=F.message||"Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";o.showNotice(Q,L),n.setState(r.UNCONFIGURED,{message:Q}),setTimeout(()=>{n.getState()===r.UNCONFIGURED&&n.setState(c||m?r.HOVERED:r.IDLE)},L)}else n.setState(r.ERROR,{action:"download",error:F.error}),o.showNotice(F.message||"Lỗi khi tải video",L),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||m?r.HOVERED:r.IDLE)},L)})}catch(F){n.setState(r.ERROR,{action:"download",error:F.message}),o.showNotice(F.message||"Lỗi kết nối nền",L),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||m?r.HOVERED:r.IDLE)},L)}}A()}function X(f){if(f.stopPropagation(),f.preventDefault(),n.isDismissed()||n.getState()===r.PROCESSING)return;const h=Date.now();if(h-_<Gt)return;if(_=h,u.enableCdnResolver===!1){const A="Tính năng Mở CDN sẽ được tích hợp ở Phase 3.";o.showNotice(A,L),n.setState(r.UNCONFIGURED,{message:A});return}const K=!!f.shiftKey;n.setState(r.PROCESSING,{action:"cdn"});const H=u.cdnResolver||Re;function B(A){if(A){if(A.isAmbiguous){n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:A.candidates});return}A.success?(n.setState(r.SUCCESS,{action:"cdn"}),A.copied?o.showNotice("Đã sao chép liên kết CDN",L):A.isHls?o.showNotice("Đang mở luồng HLS (.m3u8)",L):o.showNotice("Đã mở tab CDN",L),setTimeout(()=>{n.getState()===r.SUCCESS&&n.setState(c||m?r.HOVERED:r.IDLE)},L)):(n.setState(r.ERROR,{action:"cdn",error:A.code||A.error}),o.showNotice(A.error||"Lỗi khi mở CDN",L),setTimeout(()=>{n.getState()===r.ERROR&&n.setState(c||m?r.HOVERED:r.IDLE)},L))}}const $=y(),G={...s,mediaIndex:$};try{const A=H(e,G,{shiftKey:K,onAmbiguous:(k,F)=>{const it=_t(k,G,e);if(it.media){F(it.media).then(B).catch(nt=>{B({success:!1,error:(nt==null?void 0:nt.message)||"Lỗi xử lý video"})});return}n.setState(r.AMBIGUOUS,{candidates:k}),Kt(o.shadowRoot,k,{onSelect:async(nt,Nt)=>{n.setState(r.PROCESSING,{action:"cdn"});try{const Q=await F(nt);B(Q)}catch(Q){B({success:!1,error:Q.message||"Lỗi xử lý video"})}},onCancel:()=>{n.setState(c||m?r.HOVERED:r.IDLE)}})}});A&&typeof A.then=="function"?A.then(k=>{if(k!=null&&k.isAmbiguous){n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:k.candidates});return}B(k)}).catch(k=>{B({success:!1,error:k.message||"Lỗi kết nối máy chủ X"})}):A!=null&&A.isAmbiguous?n.getState()!==r.AMBIGUOUS&&n.setState(r.AMBIGUOUS,{candidates:A.candidates}):B(A)}catch(A){B({success:!1,error:A.message||"Lỗi kết nối máy chủ X"})}}function at(f){f.stopPropagation(),f.preventDefault(),d(),o.dismiss()}function et(f,h){(f.key==="Enter"||f.key===" ")&&(f.preventDefault(),h(f))}i&&(i.addEventListener("mouseenter",E),i.addEventListener("mousemove",l),i.addEventListener("mouseleave",D));const V=(ce=e==null?void 0:e.closest)==null?void 0:ce.call(e,'[data-testid="videoPlayer"]');if(V&&V!==i&&(!V.querySelectorAll||V.querySelectorAll("video").length===1)&&(V.addEventListener("mouseenter",E),V.addEventListener("mousemove",l)),e&&e!==i&&e!==V&&(e.addEventListener("mouseenter",E),e.addEventListener("mousemove",l)),t&&(t.addEventListener("mouseenter",U),t.addEventListener("mousemove",M),t.addEventListener("mouseleave",w),t.addEventListener("focusin",R),t.addEventListener("focusout",q),t.addEventListener("click",W),t.addEventListener("mousedown",W),t.addEventListener("mouseup",W)),typeof(i==null?void 0:i.matches)=="function")try{(i.matches(":hover")||V&&V.matches(":hover")||e&&((ue=e.matches)!=null&&ue.call(e,":hover")))&&(c=!0,o.show())}catch{}const Et=t.shadowRoot;let ot=null,rt=null,st=null,gt=null,St=null,vt=null;Et&&(ot=Et.querySelector(".xvt-btn-download"),rt=Et.querySelector(".xvt-btn-cdn"),st=Et.querySelector(".xvt-btn-dismiss"),ot&&(ot.addEventListener("click",C),gt=f=>et(f,C),ot.addEventListener("keydown",gt)),rt&&(rt.addEventListener("click",X),St=f=>et(f,X),rt.addEventListener("keydown",St)),st&&(st.addEventListener("click",at),vt=f=>et(f,at),st.addEventListener("keydown",vt)));function Me(){var f,h;d(),i&&(i.removeEventListener("mouseenter",E),i.removeEventListener("mousemove",l),i.removeEventListener("mouseleave",D)),V&&V!==i&&(!V.querySelectorAll||V.querySelectorAll("video").length===1)&&(V.removeEventListener("mouseenter",E),V.removeEventListener("mousemove",l)),e&&e!==i&&e!==V&&(e.removeEventListener("mouseenter",E),e.removeEventListener("mousemove",l)),t&&(t.removeEventListener("mouseenter",U),t.removeEventListener("mousemove",M),t.removeEventListener("mouseleave",w),t.removeEventListener("focusin",R),t.removeEventListener("focusout",q),t.removeEventListener("click",W),t.removeEventListener("mousedown",W),t.removeEventListener("mouseup",W)),ot&&(ot.removeEventListener("click",C),gt&&ot.removeEventListener("keydown",gt)),rt&&(rt.removeEventListener("click",X),St&&rt.removeEventListener("keydown",St)),st&&(st.removeEventListener("click",at),vt&&st.removeEventListener("keydown",vt)),typeof chrome<"u"&&((h=(f=chrome.runtime)==null?void 0:f.onMessage)!=null&&h.removeListener)&&chrome.runtime.onMessage.removeListener(S)}return{cleanup:Me,cancelHideTimer:d,isHoveringVideo:()=>c,isHoveringToolbar:()=>m,getHideTimer:()=>v}}const we=150;function xt(t){var u,c,m,g;if(!t||typeof t!="object")return null;const i=(u=t.closest)==null?void 0:u.call(t,'[data-testid="quoteTweet"], [data-testid="tweetQuote"]'),e=(c=t.closest)==null?void 0:c.call(t,'article[data-testid="tweet"], article'),n=i||e||document.body,o=(m=t.closest)==null?void 0:m.call(t,'[data-testid="videoComponent"]'),a=(g=t.closest)==null?void 0:g.call(t,'[data-testid="videoPlayer"]');if(o&&(!i||i.contains(o))&&o.querySelectorAll("video").length===1)return o;if(a&&(!i||i.contains(a))&&a.querySelectorAll("video").length===1)return a;let s=t.parentElement;for(;s&&s!==n&&s!==document.body;){if(s.querySelectorAll("video").length===1)return s;s=s.parentElement}return o||a||t.parentElement||null}function Oe(t,i={},e={}){const n=e.stateStore||ht,o=xt(t);if(!o)return console.warn("[X Video Tools] Cannot attach toolbar: no valid video wrapper found."),null;if(typeof window<"u")try{const R=window.getComputedStyle(o).position;if((R==="static"||!R)&&(o.style.position="relative"),o.style.setProperty("overflow","visible","important"),o.parentElement&&o.parentElement.tagName!=="ARTICLE"&&o.parentElement!==document.body){const q=window.getComputedStyle(o.parentElement).overflow;(q==="hidden"||q==="clip")&&o.parentElement.style.setProperty("overflow","visible","important")}}catch{o.style.position="relative",o.style.setProperty("overflow","visible","important")}else(!o.style.position||o.style.position==="static")&&(o.style.position="relative");const a=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?ft(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null);a&&t.dataset&&(t.dataset.xvtVideoKey=a);const s=document.createElement("div");s.className="xvt-toolbar-host",s.setAttribute("data-xvt-mounted","true"),a&&(s.setAttribute("data-xvt-video-key",a),s.dataset.xvtVideoKey=a),s.style.position="absolute",s.style.top="10px",s.style.left="10px",s.style.zIndex="9999";function u(){let R=10,q=10;o.querySelectorAll("video").length>1&&(R=(t.offsetTop||0)+10,q=(t.offsetLeft||0)+10),s.style.top=`${R}px`,s.style.left=`${q}px`,s.style.right="auto",s.style.transform="none"}u();const c=s.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=be,c.appendChild(m);const g=document.createElement("div");g.className="xvt-toolbar-container xvt-idle",g.innerHTML=`
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${z.DOWNLOAD}</span>
        <div class="xvt-tooltip" role="tooltip">Tải</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${z.CDN}</span>
        <div class="xvt-tooltip" role="tooltip">Link</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${z.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `,c.appendChild(g);const v=c.querySelector(".xvt-notice"),_=c.querySelector(".xvt-btn-download .xvt-btn-icon"),b=c.querySelector(".xvt-btn-download"),T=c.querySelector(".xvt-btn-cdn"),O=c.querySelector(".xvt-btn-cdn .xvt-btn-icon"),I=Ee(r.IDLE);let y=null,S=null;I.subscribe((R,q,W)=>{g.classList.remove("xvt-idle","xvt-hovered","xvt-processing","xvt-downloading","xvt-completed","xvt-ambiguous","xvt-picker","xvt-success","xvt-error","xvt-interrupted","xvt-cancelled","xvt-unconfigured","xvt-dismissing"),g.classList.add(`xvt-${R}`);const C=(W==null?void 0:W.action)==="cdn";R===r.PROCESSING||R===r.DOWNLOADING?C?(O&&(O.innerHTML=z.SPINNER),T&&T.setAttribute("aria-busy","true")):(_&&(_.innerHTML=z.SPINNER),b&&b.setAttribute("aria-busy","true")):R===r.SUCCESS||R===r.COMPLETED?C?(O&&(O.innerHTML=z.CHECKMARK),T&&T.removeAttribute("aria-busy")):(_&&(_.innerHTML=z.CHECKMARK),b&&b.removeAttribute("aria-busy")):R===r.ERROR||R===r.INTERRUPTED?C?(O&&(O.innerHTML=z.ERROR),T&&T.removeAttribute("aria-busy")):(_&&(_.innerHTML=z.ERROR),b&&b.removeAttribute("aria-busy")):(_&&(_.innerHTML=z.DOWNLOAD),b&&b.removeAttribute("aria-busy"),O&&(O.innerHTML=z.CDN),T&&T.removeAttribute("aria-busy"))});function d(R,q=2500){v&&(y!==null&&(clearTimeout(y),y=null),v.textContent=R,g.classList.add("xvt-has-notice"),v.classList.add("xvt-notice-visible"),y=setTimeout(()=>{p()},q))}function p(){y!==null&&(clearTimeout(y),y=null),g&&g.classList.remove("xvt-has-notice"),v&&v.classList.remove("xvt-notice-visible")}function x(){I.isDismissed()||I.setState(r.HOVERED)}function E(){I.isDismissed()||I.getState()===r.AMBIGUOUS||I.getState()===r.PICKER||I.getState()===r.DOWNLOADING||I.setState(r.IDLE)}function l(){I.isDismissed()||(I.setState(r.DISMISSED),n.dismiss(a,t),g.classList.remove("xvt-hovered","xvt-idle","xvt-unconfigured"),g.classList.add("xvt-dismissing"),S=setTimeout(()=>{U()},we))}const D=e.onDestroy;function U(){if(y!==null&&(clearTimeout(y),y=null),S!==null&&(clearTimeout(S),S=null),w&&w.cleanup(),s.parentNode&&s.parentNode.removeChild(s),I.destroy(),typeof D=="function")try{D()}catch(R){console.error("[X Video Tools] Error in onDestroy callback:",R)}}o.appendChild(s);const M={host:s,shadowRoot:c,wrapper:o,video:t,stateManager:I,show:x,hide:E,dismiss:l,showNotice:d,hideNotice:p,updatePosition:u,updateState:(R,q)=>I.setState(R,q),destroy:U},w=Ne({host:s,wrapper:o,video:t,stateManager:I,toolbarController:M,stateStore:n,tweetInfo:i,options:e});return M.eventController=w,M}const J=new WeakMap;function Le(t,i={},e={}){var u;if(!t||t.nodeType!==1||t.tagName!=="VIDEO")return null;const n=e.stateStore||ht,o=i.videoKey||((u=t.dataset)==null?void 0:u.xvtVideoKey)||(i.tweetId?ft(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):ft("tweet",i.mediaIndex,i.mediaFingerprint||t));if(n.isDismissed(o,t))return null;if(J.has(t))return J.get(t);const a=xt(t);if(a){const c=a.querySelectorAll(".xvt-toolbar-host");for(let m=0;m<c.length;m++){const g=c[m],v=g.getAttribute("data-xvt-video-key");if(i.tweetId&&v&&!v.startsWith(i.tweetId)){if(Array.from(a.querySelectorAll("video")).find(b=>{var T,O;return b!==t&&(((T=b.dataset)==null?void 0:T.xvtVideoKey)===v||!((O=b.dataset)!=null&&O.xvtVideoKey))}))return null;g.remove();continue}if(a.querySelectorAll("video").length===1){if(v===o)return J.get(t)||null;g.remove();continue}if(o&&v===o)return J.get(t)||null}}const s=Oe(t,{...i,videoKey:o},{...e,stateStore:n,onDestroy:()=>{J.delete(t)}});return s?(J.set(t,s),s):null}function Ce(t){var e;if(!t)return!1;const i=J.get(t);if(!i){const n=xt(t),o=(e=t.dataset)==null?void 0:e.xvtVideoKey;let a=null;return o&&n&&(a=n.querySelector(`.xvt-toolbar-host[data-xvt-video-key="${o}"]`)),!a&&(n==null?void 0:n.querySelectorAll("video").length)===1&&(a=n.querySelector(".xvt-toolbar-host")),a&&a.parentNode?(a.parentNode.removeChild(a),!0):!1}return J.delete(t),i.destroy(),!0}console.log("[X Video Tools] Content Script khởi tạo thành công trên",typeof window<"u"?window.location.hostname:"unknown"),console.log("[X Video Tools] Storage key tham chiếu:",ct.SETTINGS),Lt().catch(()=>{});function ke(t,i){console.log("[X Video Tools] Đã nhận diện video hợp lệ:",{tweetId:i.tweetId,permalink:i.permalink,mediaIndex:i.mediaIndex,isQuoted:i.isQuoted}),Le(t,i,{stateStore:ht})}function Ue(t){Ce(t)}const tt=me({root:typeof document<"u"?document.body:null,stateStore:ht,detectVideos:kt,findTweetContainer:It,extractTweetInfo:Mt,onVideoDetected:ke,onVideoRemoved:Ue});if(typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{tt.start()}):tt.start()),typeof window<"u"){window.addEventListener("pagehide",()=>{tt.stop()}),window.addEventListener("popstate",()=>{tt.scan()});let t=null;if(window.addEventListener("scroll",()=>{t===null&&(t=setTimeout(()=>{t=null,tt.scan()},250))},{passive:!0}),typeof history<"u"){const i=history.pushState;typeof i=="function"&&(history.pushState=function(...n){const o=i.apply(this,n);return setTimeout(()=>tt.scan(),0),o});const e=history.replaceState;typeof e=="function"&&(history.replaceState=function(...n){const o=e.apply(this,n);return setTimeout(()=>tt.scan(),0),o})}}Ot.observer=tt,Object.defineProperty(Ot,Symbol.toStringTag,{value:"Module"})})(this.XVideoToolsContent=this.XVideoToolsContent||{});

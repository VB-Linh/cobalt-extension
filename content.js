(function(Ft){"use strict";var ne,oe,re,se;const ht=Object.freeze({SETTINGS:"xvt_settings",JWT_SESSION:"cobalt_jwt_session"}),mt=Object.freeze({cobaltUrl:"",videoQuality:"1080",apiKey:""});let st={...mt};function xe(){return!!(st!=null&&st.cobaltUrl&&st.cobaltUrl.trim())}async function Wt(){var t,i;try{if(typeof chrome<"u"&&((i=(t=chrome==null?void 0:chrome.storage)==null?void 0:t.local)!=null&&i.get)){const e=await chrome.storage.local.get(ht.SETTINGS),n=e==null?void 0:e[ht.SETTINGS],r={...mt,...n||{}};return st=r,r}return{...st}}catch(e){return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:",e),st={...mt},{...mt}}}typeof chrome<"u"&&((oe=(ne=chrome==null?void 0:chrome.storage)==null?void 0:ne.local)!=null&&oe.get)&&(Wt().catch(()=>{}),(se=(re=chrome==null?void 0:chrome.storage)==null?void 0:re.onChanged)!=null&&se.addListener&&chrome.storage.onChanged.addListener((t,i)=>{if(i==="local"&&t[ht.SETTINGS]){const e=t[ht.SETTINGS].newValue;st={...mt,...e||{}}}}));const P=Object.freeze({TWEET_ARTICLE:'article[data-testid="tweet"]',TIME_ELEMENT:"time",STATUS_ANCHOR:'a[href*="/status/"], a[href*="/statuses/"]',VIDEO_TAG:"video",VIDEO_PLAYER:'[data-testid="videoPlayer"], [data-testid="videoComponent"]',QUOTE_CONTAINER:'[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',EXCLUDED_COMPOSER:'[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',EXCLUDED_SIDEBAR:'[data-testid="sidebarColumn"], aside',EXCLUDED_DM:'[data-testid="messageEntry"]'}),kt=Object.freeze({TWEET_ID:/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,MEDIA_INDEX:/(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,STATUS_URL:/^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,NUMERIC_ID:/^\d+$/});function Kt(t){return!t||typeof t.closest!="function"?!0:!!(t.closest(P.EXCLUDED_COMPOSER)||t.closest(P.EXCLUDED_SIDEBAR)||t.closest(P.EXCLUDED_DM))}function Ut(t,i=null){if(!t||typeof t.closest!="function")return null;if(i&&bt(i))return i;const e=t.closest(P.QUOTE_CONTAINER);if(e&&bt(e)&&(!i||i.contains(e)&&e!==i||e===i))return e;let n=t.parentElement;for(;n&&n!==i&&n!==document.body;){if(bt(n))return n;n=n.parentElement}return null}function bt(t){var i;return!t||typeof t.getAttribute!="function"?!1:!!(t.getAttribute("data-testid")==="quoteTweet"||t.getAttribute("data-testid")==="tweetQuote"||t.getAttribute("role")==="link"&&((i=t.querySelector)!=null&&i.call(t,'time, a[href*="/status/"], a[href*="/statuses/"]')))}function Re(t,i){return i?t&&bt(t)?!0:!!Ut(i,t):!1}function Mt(t){if(!t||typeof t.closest!="function"||Kt(t))return null;const i=t.closest(P.QUOTE_CONTAINER);if(i&&bt(i))return i;const e=t.closest(P.TWEET_ARTICLE);if(e)return Ut(t,e)||e;const n=t.closest('div[aria-modal="true"], div[role="dialog"]');if(n)return n.querySelector(P.TWEET_ARTICLE)||n;const r=t.closest('main[role="main"], [data-testid="primaryColumn"]');return r&&typeof window<"u"&&window.location&&(window.location.pathname||window.location.href||"").includes("/status/")?r:null}function ve(t){return!t||typeof t.closest!="function"||t.isConnected===!1||Kt(t)?!1:!!Mt(t)}function qt(t=document){if(!t||typeof t.querySelectorAll!="function")return[];const i=t.querySelectorAll(P.VIDEO_TAG),e=[];for(let n=0;n<i.length;n++){const r=i[n];ve(r)&&e.push(r)}return e}function yt(t){var l,u,m,x,I,N,b,S,O,T,E;if(!t||typeof t.getAttribute!="function")return null;const i=((l=t.dataset)==null?void 0:l.mediaId)||t.getAttribute("data-media-id");if(i&&typeof i=="string"&&i.trim())return i.trim();const e=t.getAttribute("poster")||t.poster;if(e&&typeof e=="string"){const g=e.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);if(g&&g[1])return g[1];const p=e.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);if(p&&p[1])return p[1];const h=e.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);if(h&&h[1])return h[1];try{const R=new URL(e,"https://x.com").pathname.split("/").filter(Boolean);if(R.length>0){const d=R[R.length-1].replace(/\.[^.]+$/,"");if(d&&d!=="img")return d;if(R.length>1)return R[R.length-2]}}catch{}}const n=t.currentSrc||t.getAttribute("src")||t.src||((m=(u=t.querySelector)==null?void 0:u.call(t,"source"))==null?void 0:m.getAttribute("src"));if(n&&typeof n=="string"){const g=n.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);if(g&&g[1])return g[1];const p=n.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);if(p&&p[1])return p[1];const h=n.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);if(h&&h[1])return`blob_${h[1]}`}const r=(x=t.closest)==null?void 0:x.call(t,"[data-media-id]");if(r&&(!r.querySelectorAll||r.querySelectorAll("video").length===1)){const g=r.getAttribute("data-media-id");if(g&&g.trim())return g.trim()}const a=((I=t.closest)==null?void 0:I.call(t,'[data-testid="quoteTweet"], [data-testid="tweetQuote"], article[data-testid="tweet"]'))||document.body;let s=t.parentElement;for(;s&&s!==a&&s!==document.body;){if(typeof s.querySelectorAll=="function"&&s.querySelectorAll("video").length===1){const g=(N=s.querySelector)==null?void 0:N.call(s,'img[src*="media"], img[src*="thumb"], img[src*="amplify_video"], img[src*="ext_tw_video"]');if(g){const h=((b=g.getAttribute)==null?void 0:b.call(g,"src"))||g.src;if(h&&typeof h=="string"){const y=h.match(/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|media)\/([a-zA-Z0-9_-]+)/i);if(y&&y[1])return y[1]}}const p=(S=s.querySelectorAll)==null?void 0:S.call(s,'[style*="background"], [style*="url("]');if(p)for(let h=0;h<p.length;h++){const R=(((T=(O=p[h]).getAttribute)==null?void 0:T.call(O,"style"))||((E=p[h].style)==null?void 0:E.backgroundImage)||"").match(/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|media)\/([a-zA-Z0-9_-]+)/i);if(R&&R[1])return R[1]}}s=s.parentElement}return null}function Et(t,i=null,e=null){var r,a;const n=i??null;if(n!==null)return`${t}_media_${n}`;if(typeof e=="string"&&e.trim().length>0)return`${t}_media_fp_${e.trim()}`;if(e&&typeof e=="object"){const s=yt(e);if(s)return`${t}_media_fp_${s}`;const l=((r=e.closest)==null?void 0:r.call(e,'article, [data-testid="tweet"]'))||e.parentElement,u=(a=l==null?void 0:l.querySelectorAll)==null?void 0:a.call(l,"video");if(u&&u.length>1)return e.dataset||(e.dataset={}),e.dataset.xvtToken||(e.dataset.xvtToken=Math.random().toString(36).slice(2,10)),`${t}_media_tok_${e.dataset.xvtToken}`}return`${t}_media_null`}function et(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(kt.TWEET_ID);return e?e[1]:null}function vt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(kt.MEDIA_INDEX);if(!e)return null;const n=parseInt(e[1],10);return Number.isInteger(n)&&n>0?n:null}function Vt(t){if(!t||typeof t!="string")return null;const e=t.trim().split(/[?#]/)[0].match(kt.STATUS_URL);if(!e)return null;const n=e[1];return n?n.trim():null}function zt(t,i={}){const e=et(t);if(!e)return null;let r=`https://x.com/${i.username||Vt(t)||"i"}/status/${e}`;const a=i.mediaIndex!==void 0?i.mediaIndex:vt(t);return a!=null&&Number.isInteger(Number(a))&&Number(a)>0&&(r+=`/video/${Number(a)}`),r}function $t(t,i){var u,m,x,I,N,b,S,O,T,E,g;const e={tweetId:null,permalink:null,mediaIndex:null,mediaFingerprint:null,isQuoted:!1,username:null,container:t||null};if(!i)return e;e.mediaFingerprint=yt(i);let n=typeof i.closest=="function"?i.closest('a[href*="/status/"], a[href*="/statuses/"]'):null;if(!n&&typeof i.closest=="function"){const p=((u=i.closest)==null?void 0:u.call(i,'[data-testid="quoteTweet"], [data-testid="tweetQuote"], article[data-testid="tweet"]'))||document.body;let h=i.parentElement;for(;h&&h!==p&&h!==document.body;){if(h.querySelectorAll("video").length===1){const y=(m=h.querySelector)==null?void 0:m.call(h,'a[href*="/video/"]');if(y){n=y;break}}h=h.parentElement}if(!n){const y=i.closest('[data-testid="videoComponent"], [data-testid="videoPlayer"]')||i.parentElement;y&&y.querySelectorAll("video").length===1&&(n=(x=y.querySelector)==null?void 0:x.call(y,'a[href*="/video/"]'))}}if(n){const p=n.getAttribute("href")||n.href||"";e.mediaIndex=vt(p)}const r=Ut(i,t);if(!!r||Re(t,i)){e.isQuoted=!0;const p=r||t;e.container=p;let h=null;if(p){if(typeof p.getAttribute=="function"){const y=p.getAttribute("href");y&&et(y)&&(h=y)}if(!h&&(typeof p.querySelectorAll=="function"||typeof p.querySelector=="function")){const y=typeof p.querySelectorAll=="function"?p.querySelectorAll(P.TIME_ELEMENT):[p.querySelector(P.TIME_ELEMENT)].filter(Boolean);for(const R of y){const d=(I=R.closest)==null?void 0:I.call(R,P.STATUS_ANCHOR);if(d){const D=d.getAttribute("href")||d.href;if(D&&et(D)){h=D;break}}}if(!h){const R=typeof p.querySelectorAll=="function"?p.querySelectorAll(P.STATUS_ANCHOR):[p.querySelector(P.STATUS_ANCHOR)].filter(Boolean);for(const d of R){const D=d.getAttribute("href")||d.href;if(D&&et(D)){h=D;break}}}}}if(h){const y=et(h);if(y)return e.tweetId=y,e.username=Vt(h),e.permalink=zt(h,{mediaIndex:e.mediaIndex,username:e.username}),e}}const s=t||(typeof i.closest=="function"?i.closest(P.TWEET_ARTICLE):null);e.container=s;let l=null;if(s&&(typeof s.querySelectorAll=="function"||typeof s.querySelector=="function")){const p=typeof s.querySelectorAll=="function"?s.querySelectorAll(P.TIME_ELEMENT):[s.querySelector(P.TIME_ELEMENT)].filter(Boolean);for(const h of p){const y=(N=h.closest)==null?void 0:N.call(h,P.QUOTE_CONTAINER);if(y&&(((b=y.getAttribute)==null?void 0:b.call(y,"data-testid"))==="quoteTweet"||((S=y.getAttribute)==null?void 0:S.call(y,"data-testid"))==="tweetQuote"))continue;const R=(O=h.closest)==null?void 0:O.call(h,P.STATUS_ANCHOR);if(R){const d=R.getAttribute("href")||R.href;if(d&&et(d)){l=d;break}}}if(!l){const h=typeof s.querySelectorAll=="function"?s.querySelectorAll(P.STATUS_ANCHOR):[s.querySelector(P.STATUS_ANCHOR)].filter(Boolean);for(const y of h){const R=(T=y.closest)==null?void 0:T.call(y,P.QUOTE_CONTAINER);if(R&&(((E=R.getAttribute)==null?void 0:E.call(R,"data-testid"))==="quoteTweet"||((g=R.getAttribute)==null?void 0:g.call(R,"data-testid"))==="tweetQuote"))continue;const d=y.getAttribute("href")||y.href;if(d&&et(d)){l=d;break}}}}if(!l&&typeof window<"u"&&window.location){const p=window.location.pathname||window.location.href||"";et(p)&&(l=p)}if(l){const p=et(l);p&&(e.tweetId=p,e.username=Vt(l),e.permalink=zt(l,{mediaIndex:e.mediaIndex,username:e.username}))}return e}class Te{constructor(){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,this._dismissedKeys=new Set}isDismissed(i,e){var r;if(e&&e.dataset&&e.dataset.xvtDismissed==="true"||e&&this._dismissedElements.has(e))return!0;const n=i||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);return n&&typeof n=="string"&&this._dismissedKeys.has(n)?(e&&(e.dataset&&(e.dataset.xvtDismissed="true"),this._dismissedElements.add(e)),!0):!1}dismiss(i,e){var r;const n=i||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);e&&e.dataset&&(e.dataset.xvtDismissed="true",delete e.dataset.xvtMounted),e&&(this._dismissedElements.add(e),this._mountedElements.delete(e)),n&&typeof n=="string"&&this._dismissedKeys.add(n)}undismiss(i,e){var r;const n=i||((r=e==null?void 0:e.dataset)==null?void 0:r.xvtVideoKey);e&&e.dataset&&delete e.dataset.xvtDismissed,e&&this._dismissedElements.delete(e),n&&typeof n=="string"&&this._dismissedKeys.delete(n)}isMounted(i){return i?i.dataset&&i.dataset.xvtMounted==="true"?!0:this._mountedElements.has(i):!1}markMounted(i,e){i&&(i.dataset&&(i.dataset.xvtMounted="true",e&&(i.dataset.xvtVideoKey=e)),this._mountedElements.add(i))}unmarkMounted(i){i&&(i.dataset&&(delete i.dataset.xvtMounted,delete i.dataset.xvtVideoKey),this._mountedElements.delete(i))}getPerVideoData(i){if(i)return this._perVideoData.get(i)}setPerVideoData(i,e){if(!i||!e)return;const n=this._perVideoData.get(i)||{};this._perVideoData.set(i,{...n,...e})}reset(i=!0){this._mountedElements=new WeakSet,this._dismissedElements=new WeakSet,this._perVideoData=new WeakMap,i&&this._dismissedKeys.clear()}getDismissedCount(){return this._dismissedKeys.size}}function Ie(){return new Te}const St=Ie();function jt(t,i){if(!(!t||t.nodeType!==1)){if(t.tagName==="VIDEO"){i.add(t);return}if(typeof t.querySelectorAll=="function")try{const e=t.querySelectorAll("video");for(let n=0;n<e.length;n++)i.add(e[n])}catch{}}}function De(t={}){const{onVideoDetected:i,onVideoRemoved:e,root:n=typeof document<"u"?document.body:null,stateStore:r=St,detectVideos:a=qt,findTweetContainer:s=Mt,extractTweetInfo:l=$t,scheduler:u=typeof requestAnimationFrame=="function"?requestAnimationFrame:d=>setTimeout(d,16),canceler:m=typeof cancelAnimationFrame=="function"?cancelAnimationFrame:d=>clearTimeout(d)}=t;let x=null,I=!1,N=null;const b=new Set;function S(d){var A;if(!d||d.isConnected===!1||r.isMounted(d)||r.isDismissed(void 0,d))return;const D=s(d);if(!D)return;const C=l(D,d);if(!C||!C.tweetId)return;const M=Et(C.tweetId,C.mediaIndex,C.mediaFingerprint||d);if(!r.isDismissed(M,d)){if(!d.getAttribute("src")&&!d.src&&!((A=d.querySelector)!=null&&A.call(d,"source"))&&!d.getAttribute("poster")){const v=()=>{d.removeEventListener("loadedmetadata",v),d.removeEventListener("loadstart",v),!r.isMounted(d)&&!r.isDismissed(void 0,d)&&(b.add(d),T())};d.addEventListener("loadedmetadata",v,{once:!0}),d.addEventListener("loadstart",v,{once:!0})}if(r.markMounted(d,M),r.setPerVideoData(d,{videoKey:M,...C,detectedAt:Date.now()}),typeof i=="function")try{i(d,{...C,videoKey:M})}catch(v){console.error("[X Video Tools] Error in onVideoDetected callback:",v)}}}function O(){if(N=null,b.size===0)return;const d=Array.from(b);b.clear();for(let D=0;D<d.length;D++)S(d[D])}function T(){N===null&&(N=u(()=>{O()}))}function E(d){var C;if(!I)return;let D=!1;for(let M=0;M<d.length;M++){const A=d[M];if(A.type==="attributes"){const v=A.target;v&&v.tagName==="VIDEO"&&!r.isMounted(v)&&!r.isDismissed(void 0,v)&&(b.add(v),D=!0);continue}if(A.type==="childList"){A.target&&A.target.tagName==="VIDEO"&&!r.isMounted(A.target)&&!r.isDismissed(void 0,A.target)&&(b.add(A.target),D=!0);const v=A.removedNodes;if(v&&v.length>0){const z=new Set;for(let V=0;V<v.length;V++){const W=v[V];W.nodeType===1&&jt(W,z)}for(const V of z)if(r.unmarkMounted(V),typeof e=="function")try{e(V)}catch(W){console.error("[X Video Tools] Error in onVideoRemoved callback:",W)}}const G=A.addedNodes;if(!G||G.length===0)continue;for(let z=0;z<G.length;z++){const V=G[z];if(V.nodeType===1){const W=b.size;if(jt(V,b),b.size>W&&(D=!0),V.tagName==="TIME"||typeof V.querySelector=="function"&&V.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]')){const pt=(C=V.closest)==null?void 0:C.call(V,'article[data-testid="tweet"]');if(pt){const it=pt.querySelectorAll("video");for(let tt=0;tt<it.length;tt++)!r.isMounted(it[tt])&&!r.isDismissed(void 0,it[tt])&&(b.add(it[tt]),D=!0)}}}}}}D&&T()}function g(d){const D=d||n||(typeof document<"u"?document.body:null);if(!D)return;const C=a(D);for(let M=0;M<C.length;M++)b.add(C[M]);b.size>0&&O()}function p(d){if(I)return;const D=d||n||(typeof document<"u"?document.body:null);if(!D){console.warn("[X Video Tools] No valid root found to start VideoObserver.");return}if(typeof MutationObserver>"u"){console.warn("[X Video Tools] MutationObserver is not supported in this environment.");return}x=new MutationObserver(E),x.observe(D,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","poster","data-media-id"],characterData:!1}),I=!0,g(D)}function h(){x&&(x.disconnect(),x=null),N!==null&&(m(N),N=null),b.clear(),I=!1}function y(d=!1){h(),d&&r&&r.reset()}function R(){return I}return{start:p,stop:h,scan:g,reset:y,isActive:R,isRunning:R,_getPendingSize:()=>b.size}}const Ne=`
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
  pointer-events: auto;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

/* Ensure inner icons and SVG elements do not steal pointer events from the button */
.xvt-btn-icon,
.xvt-btn svg,
.xvt-btn path {
  pointer-events: none;
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
`,Q={DOWNLOAD:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',CDN:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',CLOSE:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',SPINNER:'<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>',CHECKMARK:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',ERROR:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'},o=Object.freeze({IDLE:"idle",HOVERED:"hovered",PROCESSING:"processing",DOWNLOADING:"downloading",COMPLETED:"completed",AMBIGUOUS:"ambiguous",PICKER:"picker",SUCCESS:"success",ERROR:"error",UNCONFIGURED:"unconfigured",INTERRUPTED:"interrupted",CANCELLED:"cancelled",DISMISSED:"dismissed"}),Ae={[o.IDLE]:new Set([o.HOVERED,o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.COMPLETED,o.ERROR,o.INTERRUPTED,o.CANCELLED,o.UNCONFIGURED,o.DISMISSED]),[o.HOVERED]:new Set([o.IDLE,o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.COMPLETED,o.ERROR,o.INTERRUPTED,o.CANCELLED,o.AMBIGUOUS,o.PICKER,o.UNCONFIGURED,o.DISMISSED]),[o.UNCONFIGURED]:new Set([o.HOVERED,o.IDLE,o.PROCESSING,o.DISMISSED]),[o.PROCESSING]:new Set([o.DOWNLOADING,o.SUCCESS,o.COMPLETED,o.ERROR,o.AMBIGUOUS,o.PICKER,o.CANCELLED,o.INTERRUPTED,o.UNCONFIGURED,o.DISMISSED]),[o.DOWNLOADING]:new Set([o.COMPLETED,o.SUCCESS,o.ERROR,o.INTERRUPTED,o.CANCELLED,o.DISMISSED]),[o.AMBIGUOUS]:new Set([o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.ERROR,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.PICKER]:new Set([o.PROCESSING,o.DOWNLOADING,o.SUCCESS,o.ERROR,o.CANCELLED,o.HOVERED,o.IDLE,o.DISMISSED]),[o.SUCCESS]:new Set([o.HOVERED,o.IDLE,o.DISMISSED,o.PROCESSING]),[o.COMPLETED]:new Set([o.HOVERED,o.IDLE,o.DISMISSED,o.PROCESSING]),[o.ERROR]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.INTERRUPTED]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.CANCELLED]:new Set([o.PROCESSING,o.HOVERED,o.IDLE,o.DISMISSED]),[o.DISMISSED]:new Set};class _e{constructor(i=o.IDLE){this._state=i,this._payload=null,this._listeners=new Set}getState(){return this._state}getPayload(){return this._payload}isDismissed(){return this._state===o.DISMISSED}isVisible(){return this._state!==o.IDLE&&this._state!==o.DISMISSED}setState(i,e=null){if(this._state===o.DISMISSED)return!1;if(this._state===i)return this._payload=e,this._notify(this._state,this._state,e),!0;const n=Ae[this._state];if(!n||!n.has(i))return console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${i}`),!1;const r=this._state;return this._state=i,this._payload=e,this._notify(this._state,r,e),!0}subscribe(i){return typeof i!="function"?()=>{}:(this._listeners.add(i),()=>{this._listeners.delete(i)})}_notify(i,e,n){for(const r of this._listeners)try{r(i,e,n)}catch(a){console.error("[X Video Tools] Error in toolbar state subscriber:",a)}}destroy(){this._listeners.clear(),this._payload=null}}function we(t){return new _e(t)}const Oe="video.twimg.com";function gt(t){if(!t||typeof t!="string")return!1;const i=t.trim();if(!i||i.startsWith("blob:")||i.startsWith("data:")||i.startsWith("javascript:"))return!1;try{const e=new URL(i);if(e.protocol!=="https:"||e.hostname.toLowerCase()!==Oe)return!1;const r=e.pathname;if(!r||r==="/"||r.trim()==="")return!1;const a=r.toLowerCase();return!(a.endsWith(".jpg")||a.endsWith(".jpeg")||a.endsWith(".png")||a.endsWith(".webp"))}catch{return!1}}function Le(t){if(!t||typeof t!="object")return null;function i(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("blob:")||n.startsWith("data:")||!gt(n))return null;try{const a=new URL(n).pathname.toLowerCase();return a.includes("_thumb")||a.endsWith(".jpg")||a.endsWith(".png")||a.endsWith(".webp")?null:a.endsWith(".mp4")||a.includes(".mp4")||a.includes("/vid/")||a.includes("/pu/vid/")?n:null}catch{return null}}try{const e=t.currentSrc,n=i(e);if(n)return n}catch{}try{const e=t.src||(typeof t.getAttribute=="function"?t.getAttribute("src"):null),n=i(e);if(n)return n}catch{}try{if(typeof t.querySelectorAll=="function"){const e=t.querySelectorAll("source");for(const n of e){const r=n.src||n.getAttribute("src"),a=i(r);if(a)return a}}}catch{}return null}function Xt(t){if(!t||typeof t!="string")return 0;const i=t.match(/\/(\d+)x(\d+)\//);if(!i)return 0;const e=Number(i[1]),n=Number(i[2]);return isNaN(e)||isNaN(n)||e<=0||n<=0?0:e*n}function Qt(t){var n,r,a,s;if(!t||typeof t!="object")return!1;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((r=t.dimensions)==null?void 0:r.width)),e=Number(t.height??((a=t.original_info)==null?void 0:a.height)??((s=t.dimensions)==null?void 0:s.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0||typeof t.resolution=="string"&&/^\d+x\d+$/.test(t.resolution))return!0;if(t.resolution&&typeof t.resolution=="object"){const l=Number(t.resolution.width),u=Number(t.resolution.height);if(!isNaN(l)&&!isNaN(u)&&l>0&&u>0)return!0}return!1}function Tt(t){var n,r,a,s;if(!t||typeof t!="object")return 0;const i=Number(t.width??((n=t.original_info)==null?void 0:n.width)??((r=t.dimensions)==null?void 0:r.width)),e=Number(t.height??((a=t.original_info)==null?void 0:a.height)??((s=t.dimensions)==null?void 0:s.height));if(!isNaN(i)&&!isNaN(e)&&i>0&&e>0)return i*e;if(typeof t.resolution=="string"){const l=t.resolution.match(/^(\d+)x(\d+)$/);if(l){const u=Number(l[1]),m=Number(l[2]);if(u>0&&m>0)return u*m}}else if(t.resolution&&typeof t.resolution=="object"){const l=Number(t.resolution.width),u=Number(t.resolution.height);if(!isNaN(l)&&!isNaN(u)&&l>0&&u>0)return l*u}return t.url&&typeof t.url=="string"?Xt(t.url):0}function Ce(t,i){const e=Qt(t),n=Qt(i),r=Tt(t),a=Tt(i),s=Number(t.bitrate||0),l=Number(i.bitrate||0);if(e&&n)return r!==a?a-r:l-s;if(e&&!n){if(r>=a||r>0&&s>=l)return-1}else if(!e&&n&&(a>=r||a>0&&l>=s))return 1;return r>0&&a>0?r!==a?a-r:l-s:s!==l?l-s:a-r}function Zt(t){if(!Array.isArray(t)||t.length===0)return null;const i=t.filter(a=>!a||typeof a!="object"||a.content_type!=="video/mp4"||!a.url||typeof a.url!="string"?!1:gt(a.url));if(i.length===0)return null;let e=i[0];for(let a=1;a<i.length;a++){const s=i[a];Ce(e,s)>0&&(e=s)}const n=Tt(e),r=Number(e.bitrate||0);return{...e,url:e.url,isHls:!1,resolution:n,bitrate:r}}function Yt(t){if(!Array.isArray(t)||t.length===0)return null;const i=Zt(t);if(i)return i;const e=t.find(n=>{if(!n||typeof n!="object"||!n.url)return!1;const r=n.content_type==="application/x-mpegURL"||n.content_type==="application/vnd.apple.mpegurl",a=n.url.toLowerCase().includes(".m3u8");return(r||a)&&gt(n.url)});return e?{...e,url:e.url,isHls:!0,bitrate:Number(e.bitrate||0)}:null}function Jt(t){var i;return!t||typeof t!="object"?!1:t.type==="video"||t.type==="animated_gif"||!!((i=t.video_info)!=null&&i.variants)}function te(t){var e;const i=[];if(!t)return i;if(t.id_str&&i.push(String(t.id_str)),t.media_url_https){const n=t.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);n&&i.push(n[1])}if(Array.isArray((e=t.video_info)==null?void 0:e.variants)){for(const n of t.video_info.variants)if(n.url){const r=n.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);r&&i.push(r[1])}}return i}function Pt(t,i={},e=null){var l;if(!Array.isArray(t)||t.length===0)return{media:null,ambiguous:!1,candidates:[]};const n=t.filter(Jt);if(n.length===0)return{media:null,ambiguous:!1,candidates:[]};const r=i.mediaIndex,a=Number(r);if(!isNaN(a)&&a>0){const u=t[a-1];if(u&&Jt(u))return{media:u,ambiguous:!1,candidates:n}}let s=i.mediaFingerprint;if(!s&&e&&(s=yt(e),!s)){const u=((l=e.getAttribute)==null?void 0:l.call(e,"poster"))||e.poster;if(u){const m=u.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);m&&(s=m[1])}}if(s&&typeof s=="string"){const u=s.trim(),m=n.filter(x=>te(x).some(N=>N===u));if(m.length===1)return{media:m[0],ambiguous:!1,candidates:n};if(m.length===0){const x=n.filter(I=>te(I).some(b=>u.includes(b)||b.includes(u)));if(x.length===1)return{media:x[0],ambiguous:!1,candidates:n}}}return n.length===1?{media:n[0],ambiguous:!1,candidates:n}:{media:null,ambiguous:!0,candidates:n}}const _=Object.freeze({NO_TWEET_INFO:"ERR_NO_TWEET_INFO",TWEET_INACCESSIBLE:"ERR_TWEET_INACCESSIBLE",RATE_LIMITED:"ERR_RATE_LIMITED",NETWORK_TIMEOUT:"ERR_NETWORK_TIMEOUT",NO_MEDIA:"ERR_NO_MEDIA",NO_SUPPORTED_VARIANT:"ERR_NO_SUPPORTED_VARIANT",AMBIGUOUS_MEDIA:"ERR_AMBIGUOUS_MEDIA",INVALID_URL:"ERR_INVALID_URL",TAB_CREATE_FAILED:"ERR_TAB_CREATE_FAILED",NETWORK_ERROR:"ERR_NETWORK_ERROR"}),Z=Object.freeze({[_.NO_TWEET_INFO]:"Không tìm thấy thông tin bài viết",[_.TWEET_INACCESSIBLE]:"Tweet không tồn tại hoặc bị giới hạn quyền riêng tư",[_.RATE_LIMITED]:"Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau",[_.NETWORK_TIMEOUT]:"Lỗi kết nối mạng hoặc yêu cầu quá thời gian",[_.NO_MEDIA]:"Không tìm thấy video trong bài viết",[_.NO_SUPPORTED_VARIANT]:"Không tìm thấy định dạng video tương thích",[_.AMBIGUOUS_MEDIA]:"Có nhiều video. Vui lòng chọn video cần mở",[_.INVALID_URL]:"URL CDN không hợp lệ hoặc không an toàn",[_.TAB_CREATE_FAILED]:"Không thể mở tab mới",[_.NETWORK_ERROR]:"Lỗi kết nối mạng"});function Bt(t){return new Promise(i=>{let e=!1;function n(r){e||(e=!0,i(r))}try{const r=chrome.runtime.sendMessage(t,a=>{chrome.runtime.lastError?n({success:!1,error:"NETWORK_ERROR",message:chrome.runtime.lastError.message}):n(a||{success:!0})});r&&typeof r.then=="function"&&r.then(a=>n(a||{success:!0})).catch(a=>{n({success:!1,error:"NETWORK_ERROR",message:(a==null?void 0:a.message)||"Message error"})})}catch(r){n({success:!1,error:"NETWORK_ERROR",message:r.message})}})}async function ke(t,i={},e={}){var l,u,m,x,I,N;const n=!!(e.shiftKey||e.isShiftClick),r=(t==null?void 0:t.src)||(typeof(t==null?void 0:t.getAttribute)=="function"?t.getAttribute("src"):null);if(r&&typeof r=="string"&&!r.startsWith("blob:")&&r.trim()!==""&&!gt(r))return{success:!1,code:_.INVALID_URL,error:Z[_.INVALID_URL]};const a=Le(t),s=(i==null?void 0:i.tweetId)||((l=t==null?void 0:t.dataset)==null?void 0:l.xvtTweetId)||((x=(m=(u=t==null?void 0:t.closest)==null?void 0:u.call(t,"article"))==null?void 0:m.id)==null?void 0:x.replace("tweet-",""))||null;if(a){const b=Xt(a)||(t!=null&&t.videoWidth&&(t!=null&&t.videoHeight)?t.videoWidth*t.videoHeight:0);if(s&&b<3840*2160)try{const S=await Bt({action:"FETCH_SYNDICATION",payload:{tweetId:s}});if(S!=null&&S.success&&(S!=null&&S.data)){const O=S.data.mediaDetails||[];let T=null;const E=Pt(O,i,t);if(E.media)T=E.media;else if(E.ambiguous){const g=a.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);if(g){const p=g[1];T=E.candidates.find(h=>{var y,R;return h.id_str===p?!0:(R=(y=h.video_info)==null?void 0:y.variants)==null?void 0:R.some(d=>d.url&&d.url.includes(`/${p}/`))})}}if(T){const g=Zt((I=T.video_info)==null?void 0:I.variants);if(g){const p=g.resolution??Tt(g);if(b>0&&p>b||b===0&&p>0)return It(g.url,!1,n)}}}}catch{}return It(a,!1,n)}if(s)try{const b=await Bt({action:"FETCH_SYNDICATION",payload:{tweetId:s}});if(b.success&&b.data){const O=b.data.mediaDetails||[],T=Pt(O,i,t);if(T.ambiguous)return typeof e.onAmbiguous=="function"&&e.onAmbiguous(T.candidates,async E=>{var p;const g=Yt((p=E==null?void 0:E.video_info)==null?void 0:p.variants);return g?It(g.url,!!g.isHls,n):{success:!1,code:_.NO_SUPPORTED_VARIANT,error:Z[_.NO_SUPPORTED_VARIANT]}}),{success:!1,isAmbiguous:!0,code:_.AMBIGUOUS_MEDIA,error:Z[_.AMBIGUOUS_MEDIA],candidates:T.candidates};if(T.media){const E=Yt((N=T.media.video_info)==null?void 0:N.variants);return E?It(E.url,!!E.isHls,n):{success:!1,code:_.NO_SUPPORTED_VARIANT,error:Z[_.NO_SUPPORTED_VARIANT]}}return{success:!1,code:_.NO_MEDIA,error:Z[_.NO_MEDIA]}}const S=Ue(b.error);return{success:!1,code:S,error:Z[S]||b.message||"Lỗi kết nối máy chủ X"}}catch(b){return{success:!1,code:_.NETWORK_ERROR,error:b.message||Z[_.NETWORK_ERROR]}}return{success:!1,code:_.NO_TWEET_INFO,error:Z[_.NO_TWEET_INFO]}}async function It(t,i,e){var n;if(!gt(t))return{success:!1,code:_.INVALID_URL,error:Z[_.INVALID_URL]};if(e)try{if(typeof navigator<"u"&&((n=navigator.clipboard)!=null&&n.writeText))return await navigator.clipboard.writeText(t),{success:!0,url:t,isHls:i,copied:!0}}catch{}try{const r=await Bt({action:"OPEN_CDN",payload:{url:t}});return r&&r.success===!1?{success:!1,code:_.TAB_CREATE_FAILED,error:r.message||Z[_.TAB_CREATE_FAILED]}:{success:!0,url:t,isHls:i,tabOpened:!0}}catch(r){return{success:!1,code:_.TAB_CREATE_FAILED,error:r.message||Z[_.TAB_CREATE_FAILED]}}}function Ue(t){switch(t){case"API_RATE_LIMIT":case"RATE_LIMIT":case"ERR_RATE_LIMITED":return _.RATE_LIMITED;case"TWEET_INACCESSIBLE":case"NOT_FOUND":case"ERR_TWEET_NOT_FOUND":case"ERR_AGE_RESTRICTED":return _.TWEET_INACCESSIBLE;case"API_TIMEOUT":case"TIMEOUT":case"ERR_NETWORK_TIMEOUT":return _.NETWORK_TIMEOUT;case"NO_MEDIA":case"ERR_NO_MEDIA":return _.NO_MEDIA;default:return _.NETWORK_ERROR}}const Me=`
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
`;function Ve(t){var e;if(!t||typeof t!="object")return null;if(t.resolution){const n=String(t.resolution).trim();if(n.length>0)return n}const i=(e=t.video_info)==null?void 0:e.variants;if(Array.isArray(i)&&i.length>0){let n=0,r=0;for(const a of i){if(!a||typeof a.url!="string")continue;const s=a.url.match(/\/(\d+)x(\d+)\//);if(s){const l=Number(s[1]),u=Number(s[2]);!isNaN(l)&&!isNaN(u)&&l*u>r*n&&(r=l,n=u)}}if(n>0)return`${n}p`}return null}function ee(t,i=[],{onSelect:e,onCancel:n}={}){if(!t)return{destroy:()=>{}};const r=t.querySelector(".xvt-picker-popover");r&&r.remove();let a=t.querySelector("#xvt-picker-styles");a||(a=document.createElement("style"),a.id="xvt-picker-styles",a.textContent=Me,t.appendChild(a));const s=document.createElement("div");s.className="xvt-picker-popover",s.setAttribute("role","dialog"),s.setAttribute("aria-label","Chọn video để mở");const l=document.createElement("div");l.className="xvt-picker-header";const u=document.createElement("span");u.className="xvt-picker-title",u.textContent="Chọn video";const m=document.createElement("button");m.className="xvt-picker-close",m.setAttribute("aria-label","Đóng"),m.innerHTML="&times;",l.appendChild(u),l.appendChild(m),s.appendChild(l);const x=document.createElement("div");x.className="xvt-picker-list",x.setAttribute("role","menu"),i.forEach((E,g)=>{var M;const p=document.createElement("div");if(p.className="xvt-picker-item",p.setAttribute("role","menuitem"),p.setAttribute("tabindex","0"),E.media_url_https){const A=document.createElement("img");A.className="xvt-picker-thumb",A.src=E.media_url_https,A.alt=`Thumbnail Video ${g+1}`,p.appendChild(A)}const h=document.createElement("div");h.className="xvt-picker-info";const y=document.createElement("span");y.className="xvt-picker-label",y.textContent=`Video ${g+1}`;const R=document.createElement("span");R.className="xvt-picker-meta";let d=null;if((M=E.video_info)!=null&&M.aspect_ratio){const[A,v]=E.video_info.aspect_ratio;d=`${A}:${v}`}const D=Ve(E);d&&D?R.textContent=`${d} • ${D}`:d?R.textContent=d:D?R.textContent=D:R.textContent=E.type||"MP4",h.appendChild(y),h.appendChild(R),p.appendChild(h);const C=A=>{A&&A.button!==void 0&&A.button!==0||(A.stopPropagation(),A.preventDefault(),N(),typeof e=="function"&&e(E,g))};p.addEventListener("pointerdown",C),p.addEventListener("click",C),p.addEventListener("keydown",A=>{(A.key==="Enter"||A.key===" ")&&C(A)}),x.appendChild(p)}),s.appendChild(x);let I=null;function N(){I!==null&&(clearTimeout(I),I=null),document.removeEventListener("click",O,!0),document.removeEventListener("keydown",S),s.parentNode&&s.parentNode.removeChild(s)}function b(E){E&&(E.stopPropagation(),E.preventDefault()),N(),typeof n=="function"&&n()}function S(E){E.key==="Escape"&&b(E)}function O(E){(typeof E.composedPath=="function"?E.composedPath():[]).includes(s)||s.contains&&s.contains(E.target)||b(E)}return m.addEventListener("pointerdown",E=>{E.button===0&&b(E)}),m.addEventListener("click",b),document.addEventListener("keydown",S),I=setTimeout(()=>{document.addEventListener("click",O,!0)},0),(t.querySelector(".xvt-toolbar-container")||t).appendChild(s),{destroy:N}}function Pe(t,i={}){if(!Array.isArray(t)||t.length===0)return null;const e=l=>!!(l&&(l.type==="video"||l.type==="gif"||l.type==="animated_gif"||!l.type)),n=t.filter(e),r=n.length>0?n:t,a=i==null?void 0:i.mediaIndex;if(typeof a=="number"&&a>0){const l=t[a-1];if(l&&l.url&&e(l))return l;const u=n[a-1];if(u&&u.url)return u}const s=i==null?void 0:i.mediaFingerprint;if(s&&typeof s=="string"){const l=s.trim();if(l.length>0){const u=r.filter(m=>{const x=m.thumb?String(m.thumb):"",I=m.url?String(m.url):"";return x.includes(l)||I.includes(l)});if(u.length===1)return u[0]}}return r.length===1&&r[0].url?r[0]:null}function J(t){return typeof t!="string"?t:t.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,"Bearer [REDACTED]").replace(/Api-Key\s+[A-Za-z0-9._~+/-]+=*/gi,"Api-Key [REDACTED]").replace(/\b(api[_-]?key|session[_-]?token|token|jwt|secret|password|auth)=([^&\s]+)/gi,"$1=[REDACTED]").replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*)?\b/g,"[REDACTED_JWT]")}function ft(t,i="Lỗi không xác định."){if(t==null||t==="")return i;if(typeof t=="string"){const e=t.trim();return J(e)||i}if(typeof t=="number"||typeof t=="boolean")return String(t);if(typeof t=="object"){if(typeof t.message=="string"&&t.message.trim())return J(t.message.trim());if(typeof t.error=="string"&&t.error.trim())return J(t.error.trim());if(t.error&&typeof t.error=="object"){if(typeof t.error.message=="string"&&t.error.message.trim())return J(t.error.message.trim());if(typeof t.error.code=="string"&&t.error.code.trim())return J(t.error.code.trim())}if(typeof t.code=="string"&&t.code.trim())return J(t.code.trim());if(typeof t.rawCode=="string"&&t.rawCode.trim())return J(t.rawCode.trim());if(typeof t.statusText=="string"&&t.statusText.trim())return J(t.statusText.trim());if(typeof t.details=="string"&&t.details.trim())return J(t.details.trim());try{if(Object.keys(t).length>0){const n={...t};for(const a of Object.keys(n)){const s=a.toLowerCase();(s.includes("key")||s.includes("token")||s.includes("secret")||s.includes("jwt")||s.includes("auth")||s.includes("pass"))&&delete n[a]}const r=JSON.stringify(n);if(r&&r!=="{}")return J(r)}}catch{}}return i}const Be=300,k=2500,ie=250;function Ge({host:t,wrapper:i,video:e,stateManager:n,toolbarController:r,stateStore:a,tweetInfo:s={},options:l={}}){var ae,ce,ue,le,de,fe,pe,he,me,be,ye,Ee,Se,ge;let u=!1,m=!1,x=!1,I=null,N=0,b=null,S=null;const O=n.subscribe(c=>{c!==o.AMBIGUOUS&&c!==o.PICKER&&S&&(S.destroy(),S=null)}),T=s.tweetId||((ae=e==null?void 0:e.dataset)==null?void 0:ae.xvtTweetId)||((le=(ue=(ce=e==null?void 0:e.closest)==null?void 0:ce.call(e,"article"))==null?void 0:ue.id)==null?void 0:le.replace("tweet-",""))||typeof window<"u"&&((pe=(fe=(de=window.location)==null?void 0:de.href)==null?void 0:fe.match(/\/status\/(\d+)/))==null?void 0:pe[1])||null,E=s.permalink||(T?`https://x.com/i/status/${T}`:null)||(typeof window<"u"&&((me=(he=window.location)==null?void 0:he.href)!=null&&me.includes("/status/"))?window.location.href:null),g=s.videoKey||((be=e==null?void 0:e.dataset)==null?void 0:be.xvtVideoKey)||(T?Et(T,s.mediaIndex,s.mediaFingerprint||e):null);function p(){var c;if(s.mediaIndex!==void 0&&s.mediaIndex!==null)return s.mediaIndex;if(e&&typeof e.closest=="function"){const f=e.closest('a[href*="/status/"], a[href*="/statuses/"]');if(f){const H=f.getAttribute("href")||f.href,q=vt(H);if(q)return q}const B=Dt(e);if(B){const H=(c=B.querySelector)==null?void 0:c.call(B,'a[href*="/video/"]');if(H){const q=H.getAttribute("href")||H.href,F=vt(q);if(F)return F}}}return s.mediaIndex}function h(c){if(!c||c.type!=="DOWNLOAD_STATUS_CHANGED")return;const f=g&&c.videoKey&&c.videoKey===g,B=b&&c.downloadId&&c.downloadId===b;if(!f&&!B)return;const H=n.getState();if(!(H!==o.DOWNLOADING&&H!==o.PROCESSING)){if(c.state==="complete")b=null,n.setState(o.COMPLETED,{action:"download",downloadId:c.downloadId}),r.showNotice("Đã tải xong video",k),setTimeout(()=>{const q=n.getState();(q===o.COMPLETED||q===o.SUCCESS)&&n.setState(u||m?o.HOVERED:o.IDLE)},k);else if(c.state==="cancelled")b=null,n.setState(o.CANCELLED,{action:"download"}),r.showNotice("Đã hủy tải xuống",k),setTimeout(()=>{n.getState()===o.CANCELLED&&n.setState(u||m?o.HOVERED:o.IDLE)},k);else if(c.state==="interrupted"){b=null,n.setState(o.INTERRUPTED,{action:"download",error:c.error});const q=ft(c.message||"Tải xuống bị gián đoạn");r.showNotice(q,k),setTimeout(()=>{const F=n.getState();(F===o.INTERRUPTED||F===o.ERROR)&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}}}typeof chrome<"u"&&((Ee=(ye=chrome.runtime)==null?void 0:ye.onMessage)!=null&&Ee.addListener)&&chrome.runtime.onMessage.addListener(h);function y(){I!==null&&(clearTimeout(I),I=null)}function R(){y(),I=setTimeout(()=>{const c=n.getState();!u&&!m&&!x&&!n.isDismissed()&&c!==o.AMBIGUOUS&&c!==o.PICKER&&c!==o.DOWNLOADING&&c!==o.PROCESSING&&r.hide(),I=null},Be)}function d(c){if(!c||!c.target)return!0;const f=c.target;if(f===e||typeof e.contains=="function"&&e.contains(f)||f===t||typeof t.contains=="function"&&t.contains(f)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(f))return!0;if(i&&i.querySelectorAll("video").length===1)return!!(f===i||typeof i.contains=="function"&&i.contains(f));if(i&&i.querySelectorAll("video").length>1){const B=i.querySelectorAll("video");for(let q=0;q<B.length;q++){const F=B[q];if(F===e)continue;if(f===F||typeof F.contains=="function"&&F.contains(f))return!1;let U=f;for(;U&&U!==i&&U!==document.body;){if(U.contains(F)&&!U.contains(e))return!1;U=U.parentElement}}let H=f;for(;H&&H!==i&&H!==document.body;){if(H.contains(e))return!0;H=H.parentElement}if(f!==i){const F=`${f.id||""} ${f.className||""}`.match(/[_-](\d+)\b/),U=p();if(F){const $=Number(F[1]);if(U&&$===Number(U))return!0;if(U&&$!==Number(U))return!1}if(typeof f.getBoundingClientRect=="function"&&typeof e.getBoundingClientRect=="function")try{const $=f.getBoundingClientRect(),j=e.getBoundingClientRect();if($.width>0&&$.height>0&&j.width>0&&j.height>0){const ut=$.left+$.width/2,lt=$.top+$.height/2;if(ut>=j.left&&ut<=j.right&&lt>=j.top&&lt<=j.bottom)return!0}}catch{}if(f.previousElementSibling===e)return!0}return!1}return!1}function D(c){var f;n.isDismissed()||d(c)&&(u=!0,y(),(f=r.updatePosition)==null||f.call(r),r.show())}function C(c){var B;if(n.isDismissed())return;if(!d(c)){u&&(u=!1,R());return}(!u||n.getState()===o.IDLE)&&(u=!0,y(),(B=r.updatePosition)==null||B.call(r),r.show())}function M(c){if(n.isDismissed())return;const f=c==null?void 0:c.relatedTarget;f&&(f===t||typeof t.contains=="function"&&t.contains(f)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(f))||f&&(f===e||typeof e.contains=="function"&&e.contains(f))||i&&i.querySelectorAll("video").length>1&&f&&d({target:f})||(u=!1,R())}function A(){n.isDismissed()||(m=!0,y(),r.show())}function v(){n.isDismissed()||(!m||n.getState()===o.IDLE)&&(m=!0,y(),r.show())}function G(c){if(n.isDismissed())return;const f=c==null?void 0:c.relatedTarget;f&&(f===t||typeof t.contains=="function"&&t.contains(f)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(f)||f===e||typeof e.contains=="function"&&e.contains(f)||(f===i||typeof i.contains=="function"&&i.contains(f))&&d({target:f}))||(m=!1,R())}function z(){n.isDismissed()||(x=!0,y(),r.show())}function V(c){if(n.isDismissed())return;const f=c==null?void 0:c.relatedTarget;f&&(f===t||typeof t.contains=="function"&&t.contains(f)||t.shadowRoot&&typeof t.shadowRoot.contains=="function"&&t.shadowRoot.contains(f))||(x=!1,R())}function W(c){c.stopPropagation()}function pt(c){var ut,lt;if(c&&c.button!==void 0&&c.button!==0||((ut=c==null?void 0:c.stopPropagation)==null||ut.call(c),(lt=c==null?void 0:c.preventDefault)==null||lt.call(c),n.isDismissed()))return;const f=n.getState();if(f===o.PROCESSING||f===o.DOWNLOADING||f===o.SUCCESS||f===o.COMPLETED)return;const B=Date.now();if(B-N<ie)return;if(N=B,!!!(l.enableDownload===!0||l.cobaltUrl||xe())){const L="Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.";r.showNotice(L,k),n.setState(o.UNCONFIGURED,{message:L}),setTimeout(()=>{n.getState()===o.UNCONFIGURED&&n.setState(u||m?o.HOVERED:o.IDLE)},k);return}if(!n.setState(o.PROCESSING,{action:"download"}))return;const F=p(),U=`${g||T||"vid"}_${Date.now()}`,$={tweetId:T,permalink:E,username:s.username,mediaIndex:F,mediaFingerprint:s.mediaFingerprint||yt(e),videoKey:g,correlationId:U};function j(L={}){try{chrome.runtime.sendMessage({action:"COBALT_DOWNLOAD",payload:{...$,...L}},w=>{var Y,xt,dt;if((Y=chrome.runtime)!=null&&Y.lastError||!w){if(n.getState()===o.PROCESSING){n.setState(o.ERROR,{action:"download"});const X=ft(((dt=(xt=chrome.runtime)==null?void 0:xt.lastError)==null?void 0:dt.message)||"Không nhận được phản hồi từ tiện ích.");r.showNotice(X,k),setTimeout(()=>{n.getState()===o.ERROR&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}return}if(w.status==="picker"||w.type==="PICKER"){const X=w.items||w.picker||[],Rt=p(),Ht=Pe(X,{mediaIndex:Rt,mediaFingerprint:s.mediaFingerprint||yt(e)});if(Ht&&Ht.url){n.setState(o.PROCESSING,{action:"download"}),j({selectedUrl:Ht.url});return}n.setState(o.PICKER,{items:X}),S&&(S.destroy(),S=null),S=ee(r.shadowRoot,X,{onSelect:je=>{S=null,n.setState(o.PROCESSING,{action:"download"}),j({selectedUrl:je.url})},onCancel:()=>{S=null,n.setState(u||m?o.HOVERED:o.IDLE)}});return}if(w.success)b=w.downloadId,n.getState()===o.PROCESSING&&(n.setState(o.DOWNLOADING,{action:"download",downloadId:w.downloadId}),r.showNotice("Đang tải video...",k));else if(n.getState()===o.PROCESSING)if(w.error==="UNCONFIGURED"){const X=ft(w.message||"Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.");r.showNotice(X,k),n.setState(o.UNCONFIGURED,{message:X}),setTimeout(()=>{n.getState()===o.UNCONFIGURED&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}else{const X=ft(w.message||w.error||"Lỗi khi tải video");n.setState(o.ERROR,{action:"download",error:typeof w.error=="string"?w.error:X}),r.showNotice(X,k),console.warn(`[X Video Tools] Cobalt API download notice: ${X}`),setTimeout(()=>{n.getState()===o.ERROR&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}})}catch(w){if(n.getState()===o.PROCESSING){const Y=ft((w==null?void 0:w.message)||w||"Lỗi kết nối nền");n.setState(o.ERROR,{action:"download",error:Y}),r.showNotice(Y,k),setTimeout(()=>{n.getState()===o.ERROR&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}}}j()}function it(c){var ut,lt;if(c&&c.button!==void 0&&c.button!==0||((ut=c==null?void 0:c.stopPropagation)==null||ut.call(c),(lt=c==null?void 0:c.preventDefault)==null||lt.call(c),n.isDismissed()))return;const f=n.getState();if(f===o.PROCESSING||f===o.DOWNLOADING||f===o.SUCCESS||f===o.COMPLETED)return;const B=Date.now();if(B-N<ie)return;if(N=B,l.enableCdnResolver===!1){const L="Tính năng Mở CDN sẽ được tích hợp ở Phase 3.";r.showNotice(L,k),n.setState(o.UNCONFIGURED,{message:L});return}const H=!!c.shiftKey;if(!n.setState(o.PROCESSING,{action:"cdn"}))return;const F=l.cdnResolver||ke;function U(L){if(!L)return;const w=n.getState();if(!(w!==o.PROCESSING&&w!==o.AMBIGUOUS)){if(L.isAmbiguous){w!==o.AMBIGUOUS&&n.setState(o.AMBIGUOUS,{candidates:L.candidates});return}if(L.success)n.setState(o.SUCCESS,{action:"cdn"}),L.copied?r.showNotice("Đã sao chép liên kết CDN",k):L.isHls?r.showNotice("Đang mở luồng HLS (.m3u8)",k):r.showNotice("Đã mở tab CDN",k),setTimeout(()=>{n.getState()===o.SUCCESS&&n.setState(u||m?o.HOVERED:o.IDLE)},k);else{const Y=ft(L.error||L.message||"Lỗi khi mở CDN");n.setState(o.ERROR,{action:"cdn",error:L.code||Y}),r.showNotice(Y,k),setTimeout(()=>{n.getState()===o.ERROR&&n.setState(u||m?o.HOVERED:o.IDLE)},k)}}}const $=p(),j={...s,mediaIndex:$};try{const L=F(e,j,{shiftKey:H,onAmbiguous:(w,Y)=>{const xt=Pt(w,j,e);if(xt.media){Y(xt.media).then(U).catch(dt=>{U({success:!1,error:(dt==null?void 0:dt.message)||"Lỗi xử lý video"})});return}n.setState(o.AMBIGUOUS,{candidates:w}),S&&(S.destroy(),S=null),S=ee(r.shadowRoot,w,{onSelect:async(dt,X)=>{S=null,n.setState(o.PROCESSING,{action:"cdn"});try{const Rt=await Y(dt);U(Rt)}catch(Rt){U({success:!1,error:Rt.message||"Lỗi xử lý video"})}},onCancel:()=>{S=null,n.setState(u||m?o.HOVERED:o.IDLE)}})}});L&&typeof L.then=="function"?L.then(w=>{if(w!=null&&w.isAmbiguous){n.getState()!==o.AMBIGUOUS&&n.setState(o.AMBIGUOUS,{candidates:w.candidates});return}U(w)}).catch(w=>{U({success:!1,error:w.message||"Lỗi kết nối máy chủ X"})}):L!=null&&L.isAmbiguous?n.getState()!==o.AMBIGUOUS&&n.setState(o.AMBIGUOUS,{candidates:L.candidates}):U(L)}catch(L){U({success:!1,error:L.message||"Lỗi kết nối máy chủ X"})}}function tt(c){var f,B;c&&c.button!==void 0&&c.button!==0||((f=c==null?void 0:c.stopPropagation)==null||f.call(c),(B=c==null?void 0:c.preventDefault)==null||B.call(c),y(),r.dismiss())}function Gt(c,f){(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),f(c))}i&&(i.addEventListener("mouseenter",D),i.addEventListener("mousemove",C),i.addEventListener("mouseleave",M));const K=(Se=e==null?void 0:e.closest)==null?void 0:Se.call(e,'[data-testid="videoPlayer"]');if(K&&K!==i&&(!K.querySelectorAll||K.querySelectorAll("video").length===1)&&(K.addEventListener("mouseenter",D),K.addEventListener("mousemove",C)),e&&e!==i&&e!==K&&(e.addEventListener("mouseenter",D),e.addEventListener("mousemove",C)),t&&(t.addEventListener("mouseenter",A),t.addEventListener("mousemove",v),t.addEventListener("mouseleave",G),t.addEventListener("focusin",z),t.addEventListener("focusout",V),t.addEventListener("click",W),t.addEventListener("mousedown",W),t.addEventListener("mouseup",W),t.addEventListener("pointerdown",W),t.addEventListener("pointerup",W)),typeof(i==null?void 0:i.matches)=="function")try{(i.matches(":hover")||K&&K.matches(":hover")||e&&((ge=e.matches)!=null&&ge.call(e,":hover")))&&(u=!0,r.show())}catch{}const Nt=t.shadowRoot;let nt=null,ot=null,rt=null,At=null,_t=null,wt=null,Ot=null,Lt=null,Ct=null;Nt&&(nt=Nt.querySelector(".xvt-btn-download"),ot=Nt.querySelector(".xvt-btn-cdn"),rt=Nt.querySelector(".xvt-btn-dismiss"),nt&&(At=c=>{c.button===0&&pt(c)},nt.addEventListener("pointerdown",At),nt.addEventListener("click",pt),Ot=c=>Gt(c,pt),nt.addEventListener("keydown",Ot)),ot&&(_t=c=>{c.button===0&&it(c)},ot.addEventListener("pointerdown",_t),ot.addEventListener("click",it),Lt=c=>Gt(c,it),ot.addEventListener("keydown",Lt)),rt&&(wt=c=>{c.button===0&&tt(c)},rt.addEventListener("pointerdown",wt),rt.addEventListener("click",tt),Ct=c=>Gt(c,tt),rt.addEventListener("keydown",Ct)));function $e(){var c,f;y(),i&&(i.removeEventListener("mouseenter",D),i.removeEventListener("mousemove",C),i.removeEventListener("mouseleave",M)),K&&K!==i&&(!K.querySelectorAll||K.querySelectorAll("video").length===1)&&(K.removeEventListener("mouseenter",D),K.removeEventListener("mousemove",C)),e&&e!==i&&e!==K&&(e.removeEventListener("mouseenter",D),e.removeEventListener("mousemove",C)),t&&(t.removeEventListener("mouseenter",A),t.removeEventListener("mousemove",v),t.removeEventListener("mouseleave",G),t.removeEventListener("focusin",z),t.removeEventListener("focusout",V),t.removeEventListener("click",W),t.removeEventListener("mousedown",W),t.removeEventListener("mouseup",W),t.removeEventListener("pointerdown",W),t.removeEventListener("pointerup",W)),nt&&(At&&nt.removeEventListener("pointerdown",At),nt.removeEventListener("click",pt),Ot&&nt.removeEventListener("keydown",Ot)),ot&&(_t&&ot.removeEventListener("pointerdown",_t),ot.removeEventListener("click",it),Lt&&ot.removeEventListener("keydown",Lt)),rt&&(wt&&rt.removeEventListener("pointerdown",wt),rt.removeEventListener("click",tt),Ct&&rt.removeEventListener("keydown",Ct)),typeof chrome<"u"&&((f=(c=chrome.runtime)==null?void 0:c.onMessage)!=null&&f.removeListener)&&chrome.runtime.onMessage.removeListener(h),typeof O=="function"&&O(),S&&(S.destroy(),S=null)}return{cleanup:$e,cancelHideTimer:y,isHoveringVideo:()=>u,isHoveringToolbar:()=>m,getHideTimer:()=>I}}const He=150;function Dt(t){var l,u,m,x;if(!t||typeof t!="object")return null;const i=(l=t.closest)==null?void 0:l.call(t,'[data-testid="quoteTweet"], [data-testid="tweetQuote"]'),e=(u=t.closest)==null?void 0:u.call(t,'article[data-testid="tweet"], article'),n=i||e||document.body,r=(m=t.closest)==null?void 0:m.call(t,'[data-testid="videoComponent"]'),a=(x=t.closest)==null?void 0:x.call(t,'[data-testid="videoPlayer"]');if(r&&(!i||i.contains(r))&&r.querySelectorAll("video").length===1)return r;if(a&&(!i||i.contains(a))&&a.querySelectorAll("video").length===1)return a;let s=t.parentElement;for(;s&&s!==n&&s!==document.body;){if(s.querySelectorAll("video").length===1)return s;s=s.parentElement}return r||a||t.parentElement||null}function Fe(t,i={},e={}){const n=e.stateStore||St,r=Dt(t);if(!r)return console.warn("[X Video Tools] Cannot attach toolbar: no valid video wrapper found."),null;if(typeof window<"u")try{const v=window.getComputedStyle(r).position;if((v==="static"||!v)&&(r.style.position="relative"),r.style.setProperty("overflow","visible","important"),r.parentElement&&r.parentElement.tagName!=="ARTICLE"&&r.parentElement!==document.body){const G=window.getComputedStyle(r.parentElement).overflow;(G==="hidden"||G==="clip")&&r.parentElement.style.setProperty("overflow","visible","important")}}catch{r.style.position="relative",r.style.setProperty("overflow","visible","important")}else(!r.style.position||r.style.position==="static")&&(r.style.position="relative");const a=i.videoKey||t.dataset.xvtVideoKey||(i.tweetId?Et(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):null);a&&t.dataset&&(t.dataset.xvtVideoKey=a);const s=document.createElement("div");s.className="xvt-toolbar-host",s.setAttribute("data-xvt-mounted","true"),a&&(s.setAttribute("data-xvt-video-key",a),s.dataset.xvtVideoKey=a),s.style.position="absolute",s.style.top="10px",s.style.left="10px",s.style.zIndex="9999",s.style.pointerEvents="auto";function l(){let v=10,G=10;r.querySelectorAll("video").length>1&&(v=(t.offsetTop||0)+10,G=(t.offsetLeft||0)+10),s.style.top=`${v}px`,s.style.left=`${G}px`,s.style.right="auto",s.style.transform="none"}l();const u=s.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=Ne,u.appendChild(m);const x=document.createElement("div");x.className="xvt-toolbar-container xvt-idle",x.innerHTML=`
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${Q.DOWNLOAD}</span>
        <span class="xvt-tooltip" role="tooltip">Tải</span>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${Q.CDN}</span>
        <span class="xvt-tooltip" role="tooltip">Link</span>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${Q.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `,u.appendChild(x);const I=u.querySelector(".xvt-notice"),N=u.querySelector(".xvt-btn-download .xvt-btn-icon"),b=u.querySelector(".xvt-btn-download"),S=u.querySelector(".xvt-btn-cdn"),O=u.querySelector(".xvt-btn-cdn .xvt-btn-icon"),T=we(o.IDLE);let E=null,g=null;T.subscribe((v,G,z)=>{x.classList.remove("xvt-idle","xvt-hovered","xvt-processing","xvt-downloading","xvt-completed","xvt-ambiguous","xvt-picker","xvt-success","xvt-error","xvt-interrupted","xvt-cancelled","xvt-unconfigured","xvt-dismissing"),x.classList.add(`xvt-${v}`);const V=(z==null?void 0:z.action)==="cdn";v===o.PROCESSING||v===o.DOWNLOADING?V?(O&&(O.innerHTML=Q.SPINNER),S&&S.setAttribute("aria-busy","true")):(N&&(N.innerHTML=Q.SPINNER),b&&b.setAttribute("aria-busy","true")):v===o.SUCCESS||v===o.COMPLETED?V?(O&&(O.innerHTML=Q.CHECKMARK),S&&S.removeAttribute("aria-busy")):(N&&(N.innerHTML=Q.CHECKMARK),b&&b.removeAttribute("aria-busy")):v===o.ERROR||v===o.INTERRUPTED?V?(O&&(O.innerHTML=Q.ERROR),S&&S.removeAttribute("aria-busy")):(N&&(N.innerHTML=Q.ERROR),b&&b.removeAttribute("aria-busy")):(N&&(N.innerHTML=Q.DOWNLOAD),b&&b.removeAttribute("aria-busy"),O&&(O.innerHTML=Q.CDN),S&&S.removeAttribute("aria-busy"))});function p(v,G=2500){if(!I)return;E!==null&&(clearTimeout(E),E=null);const z=ft(v);I.textContent=z,x.classList.add("xvt-has-notice"),I.classList.add("xvt-notice-visible"),E=setTimeout(()=>{h()},G)}function h(){E!==null&&(clearTimeout(E),E=null),x&&x.classList.remove("xvt-has-notice"),I&&I.classList.remove("xvt-notice-visible")}function y(){if(T.isDismissed())return;const v=T.getState();v===o.PROCESSING||v===o.DOWNLOADING||v===o.AMBIGUOUS||v===o.PICKER||T.setState(o.HOVERED)}function R(){T.isDismissed()||T.getState()===o.AMBIGUOUS||T.getState()===o.PICKER||T.getState()===o.DOWNLOADING||T.getState()===o.PROCESSING||T.setState(o.IDLE)}function d(){T.isDismissed()||(T.setState(o.DISMISSED),n.dismiss(a,t),x.classList.remove("xvt-hovered","xvt-idle","xvt-unconfigured"),x.classList.add("xvt-dismissing"),g=setTimeout(()=>{C()},He))}const D=e.onDestroy;function C(){if(E!==null&&(clearTimeout(E),E=null),g!==null&&(clearTimeout(g),g=null),A&&A.cleanup(),s.parentNode&&s.parentNode.removeChild(s),T.destroy(),typeof D=="function")try{D()}catch(v){console.error("[X Video Tools] Error in onDestroy callback:",v)}}r.appendChild(s);const M={host:s,shadowRoot:u,wrapper:r,video:t,stateManager:T,show:y,hide:R,dismiss:d,showNotice:p,hideNotice:h,updatePosition:l,updateState:(v,G)=>T.setState(v,G),destroy:C},A=Ge({host:s,wrapper:r,video:t,stateManager:T,toolbarController:M,stateStore:n,tweetInfo:i,options:e});return M.eventController=A,M}const at=new WeakMap;function We(t,i={},e={}){var l;if(!t||t.nodeType!==1||t.tagName!=="VIDEO")return null;const n=e.stateStore||St,r=i.videoKey||((l=t.dataset)==null?void 0:l.xvtVideoKey)||(i.tweetId?Et(i.tweetId,i.mediaIndex,i.mediaFingerprint||t):Et("tweet",i.mediaIndex,i.mediaFingerprint||t));if(n.isDismissed(r,t))return null;if(at.has(t))return at.get(t);const a=Dt(t);if(a){const u=a.querySelectorAll(".xvt-toolbar-host");for(let m=0;m<u.length;m++){const x=u[m],I=x.getAttribute("data-xvt-video-key");if(i.tweetId&&I&&!I.startsWith(i.tweetId)){if(Array.from(a.querySelectorAll("video")).find(b=>{var S,O;return b!==t&&(((S=b.dataset)==null?void 0:S.xvtVideoKey)===I||!((O=b.dataset)!=null&&O.xvtVideoKey))}))return null;x.remove();continue}if(a.querySelectorAll("video").length===1){if(I===r)return at.get(t)||null;x.remove();continue}if(r&&I===r)return at.get(t)||null}}const s=Fe(t,{...i,videoKey:r},{...e,stateStore:n,onDestroy:()=>{at.delete(t)}});return s?(at.set(t,s),s):null}function Ke(t){var e;if(!t)return!1;const i=at.get(t);if(!i){const n=Dt(t),r=(e=t.dataset)==null?void 0:e.xvtVideoKey;let a=null;return r&&n&&(a=n.querySelector(`.xvt-toolbar-host[data-xvt-video-key="${r}"]`)),!a&&(n==null?void 0:n.querySelectorAll("video").length)===1&&(a=n.querySelector(".xvt-toolbar-host")),a&&a.parentNode?(a.parentNode.removeChild(a),!0):!1}return at.delete(t),i.destroy(),!0}console.log("[X Video Tools] Content Script khởi tạo thành công trên",typeof window<"u"?window.location.hostname:"unknown"),console.log("[X Video Tools] Storage key tham chiếu:",ht.SETTINGS),Wt().catch(()=>{});function qe(t,i){console.log("[X Video Tools] Đã nhận diện video hợp lệ:",{tweetId:i.tweetId,permalink:i.permalink,mediaIndex:i.mediaIndex,isQuoted:i.isQuoted}),We(t,i,{stateStore:St})}function ze(t){Ke(t)}const ct=De({root:typeof document<"u"?document.body:null,stateStore:St,detectVideos:qt,findTweetContainer:Mt,extractTweetInfo:$t,onVideoDetected:qe,onVideoRemoved:ze});if(typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{ct.start()}):ct.start()),typeof window<"u"){window.addEventListener("pagehide",()=>{ct.stop()}),window.addEventListener("popstate",()=>{ct.scan()});let t=null;if(window.addEventListener("scroll",()=>{t===null&&(t=setTimeout(()=>{t=null,ct.scan()},250))},{passive:!0}),typeof history<"u"){const i=history.pushState;typeof i=="function"&&(history.pushState=function(...n){const r=i.apply(this,n);return setTimeout(()=>ct.scan(),0),r});const e=history.replaceState;typeof e=="function"&&(history.replaceState=function(...n){const r=e.apply(this,n);return setTimeout(()=>ct.scan(),0),r})}}Ft.observer=ct,Object.defineProperty(Ft,Symbol.toStringTag,{value:"Module"})})(this.XVideoToolsContent=this.XVideoToolsContent||{});

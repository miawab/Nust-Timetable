(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,r,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"warnOnce",{enumerable:!0,get:function(){return t}});let t=e=>{}},18967,(e,r,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0});var t={DecodeError:function(){return x},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return w},NormalizeError:function(){return y},PageNotFoundError:function(){return b},SP:function(){return g},ST:function(){return h},WEB_VITALS:function(){return i},execOnce:function(){return s},getDisplayName:function(){return d},getLocationOrigin:function(){return l},getURL:function(){return u},isAbsoluteUrl:function(){return c},isResSent:function(){return f},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return m},stringifyError:function(){return v}};for(var o in t)Object.defineProperty(n,o,{enumerable:!0,get:t[o]});let i=["CLS","FCP","FID","INP","LCP","TTFB"];function s(e){let r,n=!1;return(...t)=>(n||(n=!0,r=e(...t)),r)}let a=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,c=e=>a.test(e);function l(){let{protocol:e,hostname:r,port:n}=window.location;return`${e}//${r}${n?":"+n:""}`}function u(){let{href:e}=window.location,r=l();return e.substring(r.length)}function d(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function m(e){let r=e.split("?");return r[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(r[1]?`?${r.slice(1).join("?")}`:"")}async function p(e,r){let n=r.res||r.ctx&&r.ctx.res;if(!e.getInitialProps)return r.ctx&&r.Component?{pageProps:await p(r.Component,r.ctx)}:{};let t=await e.getInitialProps(r);if(n&&f(n))return t;if(!t)throw Object.defineProperty(Error(`"${d(e)}.getInitialProps()" should resolve to an object. But found "${t}" instead.`),"__NEXT_ERROR_CODE",{value:"E1025",enumerable:!1,configurable:!0});return t}let g="u">typeof performance,h=g&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class x extends Error{}class y extends Error{}class b extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class w extends Error{constructor(e,r){super(),this.message=`Failed to load static file for page: ${e} ${r}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function v(e){return JSON.stringify({message:e.message,stack:e.stack})}},98183,(e,r,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0});var t={assign:function(){return c},searchParamsToUrlQuery:function(){return i},urlQueryToSearchParams:function(){return a}};for(var o in t)Object.defineProperty(n,o,{enumerable:!0,get:t[o]});function i(e){let r={};for(let[n,t]of e.entries()){let e=r[n];void 0===e?r[n]=t:Array.isArray(e)?e.push(t):r[n]=[e,t]}return r}function s(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function a(e){let r=new URLSearchParams;for(let[n,t]of Object.entries(e))if(Array.isArray(t))for(let e of t)r.append(n,s(e));else r.set(n,s(t));return r}function c(e,...r){for(let n of r){for(let r of n.keys())e.delete(r);for(let[r,t]of n.entries())e.append(r,t)}return e}},53348,e=>{"use strict";var r=e.i(43476);e.s(["default",0,function({error:e}){let n=window.location.pathname;return console.error(e),(0,r.jsxs)("html",{children:[(0,r.jsx)("head",{children:(0,r.jsx)("style",{children:`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: ui-monospace, monospace;
            padding: 2rem;
            background: #fafafa;
            color: #171717;
            font-size: 14px;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
          }
          .error-container {
            width: 100%;
            max-width: 560px;
            min-width: 0;
          }
          .error-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .error-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #fef2f2;
            color: #b91c1c;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
            flex-shrink: 0;
          }
          .error-message {
            margin: 0;
            font-weight: 500;
            line-height: 1.5;
          }
          .error-message code {
            background: #e5e5e5;
            padding: 0.1em 0.3em;
          }
          .error-summary {
            margin: 0.25rem 0 0 2rem;
            padding: 0;
            font-size: 13px;
            color: #b91c1c;
            line-height: 1.5;
          }
          .error-details-wrapper {
            margin: 1rem 0 0 2rem;
          }
          .error-details summary {
            list-style: none;
            cursor: pointer;
            padding: 0;
            color: #737373;
            font-size: 12px;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .error-details summary::-webkit-details-marker {
            display: none;
          }
          .error-details summary .chevron {
            display: inline-flex;
            align-items: center;
            font-size: 0.6rem;
            transition: transform 0.2s ease;
            transform: rotate(-90deg);
          }
          .error-details[open] summary .chevron {
            transform: rotate(0deg);
          }
          .error-stack-slot {
            height: 320px;
            margin-top: 0.5rem;
          }
          .error-details-wrapper:not(:has(details[open])) .error-stack {
            visibility: hidden;
          }
          .error-stack {
            margin: 0;
            padding: 1rem;
            background: #f5f5f5;
            overflow: auto;
            max-width: 100%;
            min-width: 0;
            height: 100%;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.5;
          }
        `})}),(0,r.jsx)("body",{children:(0,r.jsxs)("div",{className:"error-container",children:[(0,r.jsxs)("div",{className:"error-header",children:[(0,r.jsx)("div",{className:"error-icon",children:"!"}),(0,r.jsx)("div",{children:(0,r.jsxs)("p",{className:"error-message",children:["An application error has occurred while loading"," ",(0,r.jsx)("code",{children:n||"/"})]})})]}),(0,r.jsx)("div",{className:"error-summary",children:e.message||"Unknown error"}),e.stack&&(0,r.jsxs)("div",{className:"error-details-wrapper",children:[(0,r.jsx)("details",{className:"error-details",children:(0,r.jsxs)("summary",{children:[(0,r.jsx)("span",{className:"chevron",children:"▼"}),"View full error trace"]})}),(0,r.jsx)("div",{className:"error-stack-slot",children:(0,r.jsx)("pre",{className:"error-stack",children:e.stack})})]})]})})]})}])}]);
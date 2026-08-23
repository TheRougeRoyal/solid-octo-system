import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MobileApp from "./MobileApp";
import "./index.css";

const MOBILE_PATH = "/mobile";
const DESKTOP_QUERY_PARAM = "desktop";

function isLikelyMobileDevice(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";
  const mobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrowViewport = window.innerWidth <= 900;
  return mobileUa || (coarsePointer && narrowViewport);
}

function isMobilePath(pathname: string): boolean {
  return pathname === MOBILE_PATH || pathname.startsWith(`${MOBILE_PATH}/`);
}

const url = new URL(window.location.href);
const forceDesktop = url.searchParams.get(DESKTOP_QUERY_PARAM) === "1";

if (isLikelyMobileDevice() && !forceDesktop && !isMobilePath(url.pathname)) {
  window.history.replaceState({}, "", `${MOBILE_PATH}${url.search}${url.hash}`);
}

const renderMobileUi = isMobilePath(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {renderMobileUi ? <MobileApp /> : <App />}
  </React.StrictMode>
);

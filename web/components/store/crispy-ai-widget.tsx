'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { legacyJs } from '@/lib/legacy-css';
import crispyCfg from '@/lib/data/crispy-ai-public.json';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import { legacyCss } from '@/lib/legacy-css';

export function CrispyAiWidget() {
  useEffect(() => {
    (
      window as unknown as {
        kkCrispyAiConfig: typeof crispyCfg;
      }
    ).kkCrispyAiConfig = crispyCfg;
  }, []);

  return (
    <>
      <link rel="stylesheet" href={legacyCss('crispy-ai.css')} />
      <div className="crispy-ai" id="crispyAiRoot" aria-live="polite">
        <button
          type="button"
          className="crispy-ai__launcher"
          id="crispyAiLauncher"
          aria-expanded="false"
          aria-controls="crispyAiPanel"
        >
          <img
            src={BRAND_LOGO_SRC}
            alt=""
            className="crispy-ai__launcher-img"
            width={32}
            height={32}
          />
          <span className="crispy-ai__launcher-label">Crispy AI</span>
        </button>

        <div className="crispy-ai__panel" id="crispyAiPanel" hidden>
          <header className="crispy-ai__head">
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              className="crispy-ai__avatar"
              width={36}
              height={36}
            />
            <div className="crispy-ai__head-text">
              <p className="crispy-ai__name">Crispy AI</p>
              <p className="crispy-ai__status">FAQ assistant</p>
            </div>
            <button
              type="button"
              className="crispy-ai__close"
              id="crispyAiClose"
              aria-label="Close chat"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </header>

          <div
            className="crispy-ai__messages"
            id="crispyAiMessages"
            role="log"
            aria-relevant="additions"
          />

          <div
            className="crispy-ai__chips"
            id="crispyAiChips"
            aria-label="Suggested questions"
          />

          <form className="crispy-ai__form" id="crispyAiForm">
            <label className="visually-hidden" htmlFor="crispyAiInput">
              Message Crispy AI
            </label>
            <input
              type="text"
              id="crispyAiInput"
              className="crispy-ai__input"
              placeholder="Ask about ordering, profile, delivery…"
              autoComplete="off"
              maxLength={280}
            />
            <button type="submit" className="crispy-ai__send" aria-label="Send">
              <i className="bi bi-send-fill" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
      <Script src={legacyJs("crispy-ai.js")} strategy="afterInteractive" />
    </>
  );
}

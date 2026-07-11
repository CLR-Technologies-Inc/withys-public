import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
      </body>
    </html>
  );
}

const serviceWorkerScript = `
  if ('serviceWorker' in navigator) {
    window.__SW_UPDATE_AVAILABLE = false;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then(
        (registration) => {
          console.log('[SW] Registration successful, scope:', registration.scope);

          // Check for waiting worker (update installed but not activated)
          if (registration.waiting) {
            window.__SW_UPDATE_AVAILABLE = true;
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }

          // Listen for new updates becoming available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed but waiting — update is available
                window.__SW_UPDATE_AVAILABLE = true;
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          });
        },
        (err) => {
          console.warn('[SW] Registration failed:', err);
        }
      );

      // Listen for SW activation messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[SW] New version activated:', event.data.version);
          window.__SW_UPDATE_AVAILABLE = true;
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });

      // When a new SW takes over, flag update
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed — new version active');
        window.__SW_UPDATE_AVAILABLE = true;
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      });
    });
  }
`;

const responsiveBackground = `
html, body, #root {
  background-color: #000;
  margin: 0;
  padding: 0;
  height: 100%;
  min-height: 100dvh;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Safe area insets for notch + home indicator on iOS */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Prevent iOS tap highlight and text size adjust */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
}
`;

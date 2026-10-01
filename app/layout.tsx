import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParcelProof — Delivered, but to whom?',
  description: 'An evidence-backed workspace for delivery disputes. Synthetic hackathon prototype.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origSetAttr = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, value) {
                    if (name === 'bis_skin_checked' || name === 'bis_register') {
                      return;
                    }
                    return origSetAttr.apply(this, arguments);
                  };
                  var clean = function() {
                    var els = document.querySelectorAll('[bis_skin_checked], [bis_register]');
                    for (var i = 0; i < els.length; i++) {
                      els[i].removeAttribute('bis_skin_checked');
                      els[i].removeAttribute('bis_register');
                    }
                  };
                  clean();
                  if (typeof MutationObserver !== 'undefined') {
                    new MutationObserver(function() {
                      clean();
                    }).observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked', 'bis_register']
                    });
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

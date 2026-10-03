import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Check, Info, TriangleAlert } from 'lucide-react';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/archivo/wdth.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yellowbird',
  description: 'Video processing pipeline',
};

const themeBootstrap = `(function(){try{var s=localStorage.getItem('yb:theme');var t=(s==='dark'||s==='light')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
        <Toaster
          position="top-right"
          visibleToasts={3}
          gap={10}
          offset={{ top: 70, right: 20 }}
          toastOptions={{
            classNames: {
              toast: 'yb-toast',
              title: 'yb-toast-title',
              description: 'yb-toast-desc',
              success: 'yb-toast is-success',
              error: 'yb-toast is-error',
              warning: 'yb-toast is-warning',
              info: 'yb-toast is-info',
            },
          }}
          icons={{
            success: <span className="yb-toast-ico is-ok"><Check size={15} strokeWidth={2.2} aria-hidden /></span>,
            error: <span className="yb-toast-ico is-error"><TriangleAlert size={15} strokeWidth={2} aria-hidden /></span>,
            info: <span className="yb-toast-ico is-info"><Info size={15} strokeWidth={2} aria-hidden /></span>,
          }}
        />
      </body>
    </html>
  );
}

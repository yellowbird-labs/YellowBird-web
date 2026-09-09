import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'Yellowbird',
  description: 'Video processing pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}<Toaster theme="dark" position="top-right" richColors visibleToasts={4} closeButton /></body>
    </html>
  );
}

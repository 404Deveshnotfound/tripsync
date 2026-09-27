import './globals.css';
import 'leaflet/dist/leaflet.css';
import Script from 'next/script';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'TripSync — Living Verified Travel Ledger & Dynamic Group Settlement',
  description: 'Multi-vendor group travel coordination, dynamic financial recalculation, and explainable UPI settlements.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-[#f2eee5] antialiased min-h-screen flex flex-col">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

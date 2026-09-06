import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hilal Oven | فرن هلال',
  description:
    'Explore the Hilal Oven menu. Manakish, croissants, soiree, pizza and cold drinks in Tripoli, Lebanon. قائمة فرن هلال، طرابلس، لبنان.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './global.css';
import { bebas, bitcount, mono } from './fonts';

export const metadata = {
  title: 'StudyForge',
  description: 'Simulados a partir do material do seu curso.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bitcount.variable} ${bebas.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

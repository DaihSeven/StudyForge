import { Bebas_Neue, Bitcount_Single, JetBrains_Mono } from 'next/font/google';

// Bitcount Single é variável (eixos CRSV, ELSH, ELXP, slnt, wght). Com `weight: '400'` o Next baixa
// uma instância estática e não é preciso declarar eixos.
export const bitcount = Bitcount_Single({ subsets: ['latin'], weight: '400', variable: '--font-bitcount', display: 'swap', adjustFontFallback: false });
export const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' });
export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

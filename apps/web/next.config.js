//@ts-check

/**
 * A tela do mentor chama a API por caminho relativo (`/api/draft-questions/...`) e o Next repassa a
 * requisição para a API (rewrites). Assim o navegador fala só com a origem do web: sem CORS e sem
 * mexer na API. Escolha registrada no PR 3 da Semana 11; o CLAUDE.md e o código existente não definiam outra.
 *
 * `API_PROXY_TARGET` é lida na subida/no build do Next (não é NEXT_PUBLIC: nunca vai para o navegador).
 * O stream SSE passa pelo proxy porque a API envia `Cache-Control: no-cache, no-transform`.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:3333';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/draft-questions/:path*',
        destination: `${apiProxyTarget}/api/draft-questions/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

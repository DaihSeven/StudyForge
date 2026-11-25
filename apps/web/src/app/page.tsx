import { redirect } from 'next/navigation';

/** A raiz não tem conteúdo próprio: a tela do mentor é a única do MVP até o Marco 3.2. */
export default function Index(): never {
  redirect('/rascunhos/novo');
}

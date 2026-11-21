import { AppHeader } from '../../../components/app-header';
import { GenerateDraftsScreen } from '../../../components/generate-drafts-screen';

export const metadata = { title: 'Novos rascunhos — StudyForge' };

/**
 * TEMPORÁRIO até o Marco 3.2 (autenticação): organização e mentor vêm de variáveis NEXT_PUBLIC_DEMO_*
 * (ver .env.example). Quando houver sessão, estes dois valores saem da identidade do usuário.
 */
export default function NewDraftsPage() {
  return (
    <>
      <AppHeader />
      <main>
        <GenerateDraftsScreen
          organizationId={process.env.NEXT_PUBLIC_DEMO_ORGANIZATION_ID || null}
          mentorId={process.env.NEXT_PUBLIC_DEMO_MENTOR_ID || null}
        />
      </main>
    </>
  );
}

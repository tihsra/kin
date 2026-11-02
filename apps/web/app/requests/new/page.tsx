import { PageHeader } from '@/components/page-header';
import { Protected } from '@/components/ui';
import { RequestForm } from '@/components/request-form';
export default function NewRequest() {
  return (
    <Protected>
      <main className="page">
        <PageHeader
          eyebrow="03 / REQUEST HELP"
          title="Start a"
          accent="connection."
          description="Share the collection details. Find people who can make the trip."
        />
        <RequestForm />
      </main>
    </Protected>
  );
}

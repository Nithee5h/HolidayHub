import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound({ title = 'This page took a detour', message = 'The page you’re looking for doesn’t exist or may have moved.' }) {
  useDocumentTitle('Page not found');
  return (
    <section className="page-offset section-tight">
      <div className="container">
        <EmptyState
          icon="signpost-split"
          title={title}
          headingLevel={1}
          actions={
            <>
              <Button to="/" variant="ocean" icon="house">
                Back to home
              </Button>
              <Button to="/packages" variant="outline">
                Browse packages
              </Button>
            </>
          }
        >
          <p>{message}</p>
        </EmptyState>
      </div>
    </section>
  );
}

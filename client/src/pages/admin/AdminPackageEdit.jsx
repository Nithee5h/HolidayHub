import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useToast } from '../../context/toastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { createPackage, getPackageAdmin, updatePackage } from '../../services/admin';
import DepartureManager from '../../components/admin/DepartureManager';
import PackageForm from '../../components/admin/PackageForm';
import { emptyPackage, toFormState } from '../../components/admin/packageFormModel';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

const fieldMap = (err) => Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]));

export default function AdminPackageEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  useDocumentTitle(isNew ? 'New package' : 'Edit package');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: pkg, error, reload } = useAsync(() => (isNew ? Promise.resolve(null) : getPackageAdmin(id)), [id]);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');

  const save = async (payload) => {
    setSubmitting(true);
    setServerErrors({});
    setFormError('');
    try {
      if (isNew) {
        const created = await createPackage(payload);
        toast({ tone: 'success', title: 'Package created', message: 'Now add departures so customers can book it.' });
        navigate(`/admin/packages/${created.id}`, { replace: true });
      } else {
        await updatePackage(id, payload);
        toast({ tone: 'success', title: 'Changes saved', message: payload.status === 'published' ? 'Live on the website.' : `Status: ${payload.status}` });
        reload();
      }
    } catch (err) {
      const fields = fieldMap(err);
      setServerErrors(fields);
      setFormError(Object.keys(fields).length ? 'Please fix the highlighted fields.' : err.message);
      const first = Object.keys(fields)[0];
      if (first) document.getElementById(`pkg-${first.replace(/\./g, '-')}`)?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <EmptyState icon={error.status === 404 ? 'question-circle' : 'wifi-off'} title={error.status === 404 ? 'Package not found' : 'Couldn’t load package'} actions={<Button to="/admin/packages" variant="ocean">Back to packages</Button>}>
        <p>{error.message}</p>
      </EmptyState>
    );
  }
  if (!isNew && !pkg) return <Skeleton height="480px" radius="var(--hh-radius-lg)" />;

  return (
    <>
      <div className="admin-page-title">
        <div>
          <p className="mb-1">
            <Link to="/admin/packages">← Packages</Link>
          </p>
          <h1 className="font-display">{isNew ? 'New package' : pkg.title}</h1>
          {!isNew && <p>Last updated {new Date(pkg.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
        </div>
        {!isNew && pkg.status === 'published' && (
          <Button href={`/packages/${pkg.slug}`} target="_blank" rel="noreferrer" variant="outline" icon="box-arrow-up-right">
            View on site
          </Button>
        )}
      </div>
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}
      <PackageForm
        key={pkg?.updatedAt ?? 'new'}
        initial={isNew ? emptyPackage : toFormState(pkg)}
        isNew={isNew}
        submitting={submitting}
        serverErrors={serverErrors}
        onSubmit={save}
        onCancel={() => navigate('/admin/packages')}
      />
      {!isNew && <DepartureManager pkg={pkg} />}
    </>
  );
}

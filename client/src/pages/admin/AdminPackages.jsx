import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToast } from '../../context/toastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { listPackagesAdmin, removePackage } from '../../services/admin';
import { formatPrice } from '../../utils/format';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import TableScroll from '../../components/ui/TableScroll';

export default function AdminPackages() {
  useDocumentTitle('Manage packages');
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const [query, setQuery] = useState(q);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, error, stale, reload } = useAsync(() => listPackagesAdmin({ q, status }), [q, status]);

  const setFilter = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const confirmRemove = async () => {
    setBusy(true);
    try {
      const result = await removePackage(target.id);
      toast({
        tone: 'success',
        title: result.archived ? 'Package archived' : 'Package deleted',
        message: result.archived ? 'Hidden from customers; booking history kept.' : `${target.title} was removed.`,
      });
      setTarget(null);
      reload();
    } catch (err) {
      toast({ tone: 'error', title: 'Could not remove package', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (error && !data) {
    body = <EmptyState icon="wifi-off" title="Couldn’t load packages" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>} />;
  } else if (!data) {
    body = <Skeleton height="320px" radius="var(--hh-radius-lg)" />;
  } else if (data.items.length === 0) {
    body = <EmptyState icon="collection" title="No packages match" actions={<Button to="/admin/packages/new" variant="primary" icon="plus-lg">Create a package</Button>} />;
  } else {
    body = (
      <TableScroll label="Packages table" className={`admin-panel p-0 packages-results ${stale ? 'is-stale' : ''}`}>
        <table className="table admin-table">
          <caption className="visually-hidden">Packages</caption>
          <thead>
            <tr>
              <th scope="col">Package</th>
              <th scope="col">Category</th>
              <th scope="col">From</th>
              <th scope="col">Status</th>
              <th scope="col">Departures</th>
              <th scope="col">Active bookings</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/admin/packages/${p.id}`} className="fw-semibold">
                    {p.title}
                  </Link>
                  <small>
                    {p.destination}, {p.country} · {p.durationDays} days{p.featured ? ' · Featured' : ''}
                  </small>
                </td>
                <td>{p.category}</td>
                <td>{formatPrice(p.basePrice, p.currency)}</td>
                <td>
                  <span className={`pkg-status pkg-status--${p.status}`}>{p.status}</span>
                </td>
                <td>{p.departureCount}</td>
                <td>{p.activeBookings}</td>
                <td>
                  <div className="row-actions">
                    <Button to={`/admin/packages/${p.id}`} variant="outline" size="sm" icon="pencil" aria-label={`Edit ${p.title}`}>
                      Edit
                    </Button>
                    {p.status !== 'archived' && (
                      <Button variant="ghost" size="sm" icon={p.activeBookings || p.departureCount ? 'archive' : 'trash'} onClick={() => setTarget(p)} aria-label={`Remove ${p.title} (archive or delete)`}>
                        Remove
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    );
  }

  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1 className="font-display">
            Packages {data && <span className="admin-count">{data.total}</span>}
          </h1>
          <p>Create, edit, publish and archive holiday packages.</p>
        </div>
        <Button to="/admin/packages/new" variant="primary" icon="plus-lg">
          New package
        </Button>
      </div>

      <form
        className="admin-filters"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter({ q: query.trim() });
        }}
      >
        <div className="admin-filters__search">
          <label htmlFor="pkg-q">Search</label>
          <input id="pkg-q" className="form-control" type="search" placeholder="Title, destination or slug" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pkg-status">Status</label>
          <select id="pkg-status" className="form-select" value={status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <Button type="submit" variant="ocean" icon="search">
          Search
        </Button>
      </form>

      {body}

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.activeBookings || target?.departureCount ? 'Archive this package?' : 'Delete this package?'}
        confirmLabel="Yes, remove"
        busy={busy}
        onConfirm={confirmRemove}
        onClose={() => setTarget(null)}
      >
        <p>
          <strong>{target?.title}</strong>
        </p>
        <p>
          If any bookings reference this package it will be <strong>archived</strong>: hidden from customers, with booking history kept. Otherwise it is{' '}
          <strong>permanently deleted</strong> together with its {target?.departureCount ?? 0} departure(s).
        </p>
      </ConfirmDialog>
    </>
  );
}

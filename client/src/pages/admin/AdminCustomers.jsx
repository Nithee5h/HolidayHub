import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { listCustomers } from '../../services/admin';
import { formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import TableScroll from '../../components/ui/TableScroll';

/* Customer accounts (basic, non-sensitive fields only). */
export default function AdminCustomers() {
  useDocumentTitle('Customers');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, stale, reload } = useAsync(() => listCustomers({ q: submitted, page }), [submitted, page]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    setSubmitted(query.trim());
  };

  let body;
  if (error && !data) {
    body = (
      <EmptyState icon="wifi-off" title="Couldn’t load customers" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}>
        <p>{error.message}</p>
      </EmptyState>
    );
  } else if (!data) {
    body = <Skeleton height="260px" radius="var(--hh-radius)" />;
  } else if (data.items.length === 0) {
    body = <EmptyState icon="people" title={submitted ? 'No customers match your search' : 'No customers yet'} />;
  } else {
    body = (
      <TableScroll label="Customers table" className={`packages-results ${stale ? 'is-stale' : ''}`} aria-busy={loading}>
        <table className="table admin-table">
          <caption className="visually-hidden">Customer accounts</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id}>
                <td className="fw-semibold">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone ?? <span className="text-muted-hh">—</span>}</td>
                <td>{formatDate(u.createdAt.slice(0, 10))}</td>
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
            Customers {data && <span className="admin-count">{data.total}</span>}
          </h1>
          <p>Registered customer accounts. Passwords are never exposed.</p>
        </div>
        <form className="admin-filters mb-0" role="search" onSubmit={search}>
          <div className="admin-filters__search">
            <label htmlFor="admin-q" className="visually-hidden">
              Search customers by name or email
            </label>
            <input id="admin-q" className="form-control" type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button type="submit" variant="ocean" icon="search">
            Search
          </Button>
        </form>
      </div>
      <div className="admin-panel p-0 overflow-hidden">{body}</div>
      {data && data.pages > 1 && (
        <nav className="d-flex justify-content-center gap-2 mt-4" aria-label="Customer pages">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="align-self-center text-muted-hh">
            Page {data.page} of {data.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </nav>
      )}
    </>
  );
}

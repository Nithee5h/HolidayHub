import { useState } from 'react';
import { useToast } from '../../context/toastContext';
import { useAsync } from '../../hooks/useAsync';
import { createDeparture, listDepartures, updateDeparture } from '../../services/admin';
import { addDays, todayIso } from '../../utils/dates';
import { formatDate, formatPrice } from '../../utils/format';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import TextField from '../ui/TextField';
import TableScroll from '../ui/TableScroll';

const detailsOf = (err) => Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]));

function DepartureRow({ dep, onSaved }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ capacity: String(dep.capacity), pricePerPerson: dep.pricePerPerson ? String(dep.pricePerPerson) : '', status: dep.status });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const past = dep.startDate <= todayIso();

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await updateDeparture(dep.id, {
        capacity: Number(form.capacity),
        pricePerPerson: form.pricePerPerson === '' ? null : Number(form.pricePerPerson),
        status: form.status,
      });
      toast({ tone: 'success', title: 'Departure updated', message: formatDate(dep.startDate) });
      setEditing(false);
      onSaved();
    } catch (err) {
      setErrors({ ...detailsOf(err), form: err.details?.length ? '' : err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <tr>
        <td>
          <span className="fw-semibold">{formatDate(dep.startDate)}</span>
          <small>to {formatDate(dep.endDate)}</small>
        </td>
        <td>{dep.pricePerPerson ? formatPrice(dep.pricePerPerson) : <span className="text-muted-hh">Base price</span>}</td>
        <td>
          {dep.bookedSeats} / {dep.capacity}
          <small>{dep.seatsRemaining} left</small>
        </td>
        <td>{dep.activeBookings}</td>
        <td>
          <span className={`pkg-status pkg-status--${dep.status}`}>{past ? 'past' : dep.status}</span>
        </td>
        <td>
          <div className="row-actions">
            <Button variant="outline" size="sm" icon="pencil" onClick={() => setEditing(true)} disabled={past} aria-label={`Edit departure ${formatDate(dep.startDate)}`}>
              Edit
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  const id = (k) => `dep-${dep.id}-${k}`;
  return (
    <tr className="dep-edit-row">
      <td colSpan={6}>
        <p className="fw-semibold mb-2">Edit departure on {formatDate(dep.startDate)}</p>
        {errors.form && (
          <div className="alert alert-danger py-2" role="alert">
            {errors.form}
          </div>
        )}
        <div className="row g-2 align-items-start">
          <div className="col-6 col-md-3">
            <TextField id={id('capacity')} label="Capacity" type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} error={errors.capacity} hint={`${dep.bookedSeats} booked`} />
          </div>
          <div className="col-6 col-md-3">
            <TextField id={id('price')} label="Price / person (₹)" type="number" min={0} placeholder="Base price" value={form.pricePerPerson} onChange={(e) => setForm((f) => ({ ...f, pricePerPerson: e.target.value }))} error={errors.pricePerPerson} hint="Blank = package price" />
          </div>
          <div className="col-md-3">
            <div className="hh-field">
              <label htmlFor={id('status')} className="form-label">
                Status
              </label>
              <select id={id('status')} className="form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="open">Open for booking</option>
                <option value="closed">Closed (no new bookings)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="col-md-3 d-flex gap-2 pt-md-4">
            <Button variant="primary" size="sm" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** List + edit + add departures for one package. Capacity rules are enforced by the API. */
export default function DepartureManager({ pkg }) {
  const { toast } = useToast();
  const { data, error, reload } = useAsync(() => listDepartures(pkg.id), [pkg.id]);
  const [form, setForm] = useState({ startDate: addDays(todayIso(), 30), capacity: '12', pricePerPerson: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await createDeparture({
        packageId: pkg.id,
        startDate: form.startDate,
        capacity: Number(form.capacity),
        ...(form.pricePerPerson ? { pricePerPerson: Number(form.pricePerPerson) } : {}),
      });
      toast({ tone: 'success', title: 'Departure added', message: `${formatDate(form.startDate)} · ${form.capacity} seats` });
      reload();
    } catch (err) {
      setErrors({ ...detailsOf(err), form: err.details?.length ? '' : err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel" aria-labelledby="departures-title">
      <h2 id="departures-title" className="admin-panel__title">
        Departures & capacity
      </h2>
      {pkg.status !== 'published' && (
        <p className="alert alert-warning py-2">This package is {pkg.status}; customers can’t see these departures until it is published.</p>
      )}
      {error ? (
        <p className="text-danger">{error.message}</p>
      ) : !data ? (
        <Skeleton height="120px" />
      ) : data.length === 0 ? (
        <p className="text-muted-hh">No departures yet. Add the first one below.</p>
      ) : (
        <TableScroll label="Departures table" className="mb-3">
          <table className="table admin-table">
            <caption className="visually-hidden">Departures for {pkg.title}</caption>
            <thead>
              <tr>
                <th scope="col">Dates</th>
                <th scope="col">Price</th>
                <th scope="col">Booked</th>
                <th scope="col">Active bookings</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <DepartureRow key={`${d.id}-${d.capacity}-${d.status}-${d.pricePerPerson ?? ''}`} dep={d} onSaved={reload} />
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}

      {pkg.status !== 'archived' && (
        <form className="dep-add" onSubmit={add} noValidate aria-labelledby="dep-add-title">
          <h3 id="dep-add-title" className="pkg-form__day-title mb-2">
            Add a departure
          </h3>
          {errors.form && (
            <div className="alert alert-danger py-2" role="alert">
              {errors.form}
            </div>
          )}
          <div className="row g-2 align-items-start">
            <div className="col-md-4">
              <TextField id="dep-new-start" label="Start date" type="date" min={addDays(todayIso(), 1)} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} error={errors.startDate} hint={`Ends ${formatDate(addDays(form.startDate || todayIso(), pkg.durationDays - 1))}`} />
            </div>
            <div className="col-6 col-md-3">
              <TextField id="dep-new-capacity" label="Capacity" type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} error={errors.capacity} />
            </div>
            <div className="col-6 col-md-3">
              <TextField id="dep-new-price" label="Price / person (₹)" type="number" min={0} placeholder={String(pkg.basePrice)} value={form.pricePerPerson} onChange={(e) => setForm((f) => ({ ...f, pricePerPerson: e.target.value }))} error={errors.pricePerPerson} hint="Optional" />
            </div>
            <div className="col-md-2 pt-md-4">
              <Button type="submit" variant="ocean" icon="plus-lg" disabled={busy} block>
                {busy ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

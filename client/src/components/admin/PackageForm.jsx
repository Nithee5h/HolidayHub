import { useState } from 'react';
import { categories } from '../../data/destinations';
import Button from '../ui/Button';
import SmartImage from '../ui/SmartImage';
import TextField from '../ui/TextField';
import { toPayload, validatePackage } from './packageFormModel';

const fid = (path) => `pkg-${path.replace(/\./g, '-')}`;

export default function PackageForm({ initial, isNew, submitting, serverErrors = {}, onSubmit, onCancel }) {
  const [v, setV] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);
  // Preview URLs update on blur so partially typed URLs never trigger requests.
  const [previews, setPreviews] = useState(() => initial.images.map((i) => i.url));
  const clientErrors = validatePackage(v);
  const err = (path) => serverErrors[path] ?? (showErrors ? clientErrors[path] : undefined);

  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setItem = (list, i, key) => (e) => setV((s) => ({ ...s, [list]: s[list].map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)) }));
  const addItem = (list, item) => {
    setV((s) => ({ ...s, [list]: [...s[list], item] }));
    if (list === 'images') setPreviews((p) => [...p, '']);
  };
  const removeItem = (list, i) => {
    setV((s) => ({ ...s, [list]: s[list].filter((_, j) => j !== i) }));
    if (list === 'images') setPreviews((p) => p.filter((_, j) => j !== i));
  };
  const swap = (arr, i, dir) => {
    const next = [...arr];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    return next;
  };
  const moveItem = (list, i, dir) => {
    setV((s) => ({ ...s, [list]: swap(s[list], i, dir) }));
    if (list === 'images') setPreviews((p) => swap(p, i, dir));
  };

  const submit = (e) => {
    e.preventDefault();
    const first = Object.keys(clientErrors)[0];
    if (first) {
      setShowErrors(true);
      document.getElementById(fid(first))?.focus();
      return;
    }
    onSubmit(toPayload(v, { includeSlug: isNew }));
  };

  const field = (path, label, props = {}) => <TextField id={fid(path)} label={label} value={v[path]} onChange={set(path)} error={err(path)} {...props} />;

  return (
    <form noValidate onSubmit={submit} className="pkg-form">
      {showErrors && Object.keys(clientErrors).length > 0 && (
        <div className="alert alert-danger" role="alert">
          Please fix the highlighted fields.
        </div>
      )}

      <fieldset className="admin-panel mb-3">
        <legend className="pkg-form__legend">
          <h2 className="admin-panel__title">Basics</h2>
        </legend>
        <div className="row g-3">
          <div className="col-md-8">{field('title', 'Title', { maxLength: 120 })}</div>
          <div className="col-md-4">
            {isNew ? (
              field('slug', 'URL slug (optional)', { maxLength: 80, hint: 'Leave blank to generate from the title. Fixed after creation.' })
            ) : (
              <TextField id={fid('slug')} label="URL slug" value={v.slug} disabled readOnly hint="Fixed so existing links keep working." />
            )}
          </div>
          <div className="col-md-4">{field('destination', 'Destination', { maxLength: 80 })}</div>
          <div className="col-md-4">{field('country', 'Country', { maxLength: 80 })}</div>
          <div className="col-md-4">
            <div className="hh-field">
              <label htmlFor={fid('category')} className="form-label">
                Category
              </label>
              <select id={fid('category')} className="form-select" value={v.category} onChange={set('category')}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-6 col-md-3">{field('durationDays', 'Duration (days)', { type: 'number', min: 1, max: 60, inputMode: 'numeric' })}</div>
          <div className="col-6 col-md-3">{field('basePrice', 'Base price / person (₹)', { type: 'number', min: 0, inputMode: 'numeric' })}</div>
          <div className="col-md-3">
            <div className="hh-field">
              <label htmlFor={fid('status')} className="form-label">
                Status
              </label>
              <select id={fid('status')} className="form-select" value={v.status} onChange={set('status')}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="col-md-3 d-flex align-items-center">
            <div className="form-check mt-md-3">
              <input id={fid('featured')} className="form-check-input" type="checkbox" checked={v.featured} onChange={set('featured')} />
              <label htmlFor={fid('featured')} className="form-check-label">
                Featured on homepage
              </label>
            </div>
          </div>
          <div className="col-12">{field('tags', 'Themes / tags', { hint: 'Comma-separated, e.g. tropical, romantic, culture, mountains' })}</div>
        </div>
      </fieldset>

      <fieldset className="admin-panel mb-3">
        <legend className="pkg-form__legend">
          <h2 className="admin-panel__title">Description</h2>
        </legend>
        {field('summary', 'Summary (card text)', { as: 'textarea', rows: 2, maxLength: 300 })}
        {field('description', 'Full description', { as: 'textarea', rows: 5, maxLength: 4000 })}
      </fieldset>

      <fieldset className="admin-panel mb-3">
        <legend className="pkg-form__legend">
          <h2 className="admin-panel__title">Gallery</h2>
        </legend>
        {err('images') && <p className="hh-field__error mb-2">{err('images')}</p>}
        {v.images.map((img, i) => (
          <div key={i} className="pkg-form__row">
            <div className="pkg-form__thumb" aria-hidden="true">
              {/^https:\/\/[^/\s]+\.[^/\s]+\/\S+/.test(previews[i] ?? '') ? <SmartImage key={previews[i]} src={previews[i]} alt="" width={240} sizes="96px" /> : <i className="bi bi-image" />}
            </div>
            <div className="flex-grow-1 row g-2">
              <div className="col-md-7">
                <TextField
                  id={fid(`images.${i}.url`)}
                  label={`Image ${i + 1} URL`}
                  type="url"
                  placeholder="https://…"
                  value={img.url}
                  onChange={setItem('images', i, 'url')}
                  onBlur={() => setPreviews((p) => v.images.map((im, j) => (j === i ? im.url.trim() : p[j])))}
                  error={err(`images.${i}.url`)}
                />
              </div>
              <div className="col-md-5">
                <TextField id={fid(`images.${i}.alt`)} label={`Image ${i + 1} alt text`} value={img.alt} onChange={setItem('images', i, 'alt')} error={err(`images.${i}.alt`)} maxLength={200} />
              </div>
            </div>
            <div className="pkg-form__row-actions">
              <button type="button" className="icon-btn" onClick={() => moveItem('images', i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} up`}>
                <i className="bi bi-arrow-up" aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => moveItem('images', i, 1)} disabled={i === v.images.length - 1} aria-label={`Move image ${i + 1} down`}>
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => removeItem('images', i)} disabled={v.images.length === 1} aria-label={`Remove image ${i + 1}`}>
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" icon="plus" onClick={() => addItem('images', { url: '', alt: '' })} disabled={v.images.length >= 12}>
          Add image
        </Button>
        <p className="form-text mb-0 mt-2">The first image is the cover. Use legally licensed images (e.g. Unsplash) over HTTPS.</p>
      </fieldset>

      <fieldset className="admin-panel mb-3">
        <legend className="pkg-form__legend">
          <h2 className="admin-panel__title">Day-by-day itinerary</h2>
        </legend>
        {err('itinerary') && <p className="hh-field__error mb-2">{err('itinerary')}</p>}
        {v.itinerary.map((day, i) => (
          <div key={i} className="pkg-form__day">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 className="pkg-form__day-title">Day {i + 1}</h3>
              <div className="pkg-form__row-actions">
                <button type="button" className="icon-btn" onClick={() => moveItem('itinerary', i, -1)} disabled={i === 0} aria-label={`Move day ${i + 1} up`}>
                  <i className="bi bi-arrow-up" aria-hidden="true" />
                </button>
                <button type="button" className="icon-btn" onClick={() => moveItem('itinerary', i, 1)} disabled={i === v.itinerary.length - 1} aria-label={`Move day ${i + 1} down`}>
                  <i className="bi bi-arrow-down" aria-hidden="true" />
                </button>
                <button type="button" className="icon-btn" onClick={() => removeItem('itinerary', i)} disabled={v.itinerary.length === 1} aria-label={`Remove day ${i + 1}`}>
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              </div>
            </div>
            <TextField id={fid(`itinerary.${i}.title`)} label={`Day ${i + 1} title`} value={day.title} onChange={setItem('itinerary', i, 'title')} error={err(`itinerary.${i}.title`)} maxLength={120} />
            <TextField id={fid(`itinerary.${i}.description`)} as="textarea" rows={2} label={`Day ${i + 1} description`} value={day.description} onChange={setItem('itinerary', i, 'description')} error={err(`itinerary.${i}.description`)} maxLength={1000} />
            <TextField id={fid(`itinerary.${i}.activities`)} label={`Day ${i + 1} activities (optional)`} hint="Comma-separated" value={day.activities} onChange={setItem('itinerary', i, 'activities')} />
          </div>
        ))}
        <Button variant="outline" size="sm" icon="plus" onClick={() => addItem('itinerary', { title: '', description: '', activities: '' })} disabled={v.itinerary.length >= Number(v.durationDays)}>
          Add day
        </Button>
      </fieldset>

      <fieldset className="admin-panel mb-3">
        <legend className="pkg-form__legend">
          <h2 className="admin-panel__title">Inclusions & exclusions</h2>
        </legend>
        <div className="row g-3">
          <div className="col-md-6">{field('inclusions', 'Included (one per line)', { as: 'textarea', rows: 5 })}</div>
          <div className="col-md-6">{field('exclusions', 'Not included (one per line)', { as: 'textarea', rows: 5 })}</div>
        </div>
      </fieldset>

      <div className="pkg-form__footer">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon="check2" disabled={submitting}>
          {submitting ? 'Saving…' : isNew ? 'Create package' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

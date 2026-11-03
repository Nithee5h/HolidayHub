import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

export function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

/** Render `ui` at `route`, plus a probe exposing the current URL. */
export function renderWithRouter(ui, { route = '/', path = '*' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path={path}
          element={
            <>
              {ui}
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

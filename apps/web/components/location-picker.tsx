'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icon';
import { Notice } from './ui';

export type Coordinates = { latitude: number; longitude: number };
function toPixel(latitude: number, longitude: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  const lat = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * size,
  };
}
function fromPixel(x: number, y: number, zoom: number): Coordinates {
  const size = 256 * 2 ** zoom;
  return {
    longitude: (((((x / size) * 360 + 180) % 360) + 360) % 360) - 180,
    latitude: Math.max(
      -85,
      Math.min(85, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI),
    ),
  };
}
function CoordinateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState('');
  const focused = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const message = `${label} must be a decimal between ${min} and ${max}.`;
  useEffect(() => {
    if (!focused.current) {
      setText(String(value));
      setError('');
      input.current?.setCustomValidity('');
    }
  }, [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        ref={input}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        required
        value={text}
        placeholder={label === 'Latitude' ? '12.123987' : '77.594600'}
        aria-invalid={!!error}
        onFocus={(event) => {
          focused.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const raw = event.target.value.trim();
          setText(raw);
          const valid =
            /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) &&
            Number.isFinite(Number(raw)) &&
            Number(raw) >= min &&
            Number(raw) <= max;
          event.currentTarget.setCustomValidity(valid ? '' : message);
          if (valid) {
            setError('');
            onChange(Number(raw));
          }
        }}
        onBlur={(event) => {
          focused.current = false;
          setError(event.currentTarget.validity.valid ? '' : message);
        }}
        onInvalid={() => setError(message)}
      />
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: Coordinates;
  onChange: (value: Coordinates) => void;
}) {
  const [error, setError] = useState('');
  const [map, setMap] = useState(false);
  const [zoom, setZoom] = useState(11);
  const [busy, setBusy] = useState(false);
  function locate() {
    if (!navigator.geolocation) {
      setError('Geolocation is unavailable. Enter coordinates or select the map instead.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setBusy(false);
        setError('');
      },
      () => {
        setError('Location could not be accessed. You can choose it manually.');
        setBusy(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
  const center = toPixel(value.latitude, value.longitude, zoom);
  const baseX = Math.floor(center.x / 256),
    baseY = Math.floor(center.y / 256);
  return (
    <div className="location-picker">
      <div className="button-row">
        <button className="button outline small" type="button" onClick={locate} disabled={busy}>
          <Icon name="pin" size={15} />
          {busy ? 'Locating…' : 'Use current location'}
        </button>
        <button type="button" className="text-button" onClick={() => setMap((v) => !v)}>
          {map ? 'Hide map' : 'Choose on a map'}
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="form-grid">
        <CoordinateInput
          label="Latitude"
          value={value.latitude}
          min={-90}
          max={90}
          onChange={(latitude) => onChange({ ...value, latitude })}
        />
        <CoordinateInput
          label="Longitude"
          value={value.longitude}
          min={-180}
          max={180}
          onChange={(longitude) => onChange({ ...value, longitude })}
        />
      </div>
      {map && (
        <>
          <div className="map-controls">
            <button
              type="button"
              className="icon-button"
              aria-label="Zoom out"
              disabled={zoom <= 3}
              onClick={() => setZoom((z) => z - 1)}
            >
              −
            </button>
            <span>Click to move the pin</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Zoom in"
              disabled={zoom >= 17}
              onClick={() => setZoom((z) => z + 1)}
            >
              +
            </button>
          </div>
          <div
            className="tile-map"
            role="group"
            aria-label="Location map. Click to position the pin or use coordinate inputs."
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onChange(
                fromPixel(
                  center.x + e.clientX - rect.left - rect.width / 2,
                  center.y + e.clientY - rect.top - rect.height / 2,
                  zoom,
                ),
              );
            }}
          >
            <div className="tile-origin">
              {Array.from({ length: 25 }, (_, i) => {
                const x = baseX + (i % 5) - 2,
                  y = baseY + Math.floor(i / 5) - 2;
                if (y < 0 || y >= 2 ** zoom) return null;
                return (
                  <img
                    alt=""
                    draggable={false}
                    key={`${zoom}/${x}/${y}`}
                    src={`https://tile.openstreetmap.org/${zoom}/${(x + 2 ** zoom) % 2 ** zoom}/${y}.png`}
                    width={256}
                    height={256}
                    style={{
                      position: 'absolute',
                      left: x * 256 - center.x,
                      top: y * 256 - center.y,
                    }}
                  />
                );
              })}
            </div>
            <span className="map-pin">
              <Icon name="pin" size={31} />
            </span>
            <a
              className="map-attribution"
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              © OpenStreetMap contributors
            </a>
          </div>
          <p>Map tiles are loaded from OpenStreetMap. Coordinates also work without the map.</p>
        </>
      )}
      <p>
        For a donor profile, choose an approximate point yourself. For a request, choose the
        collection destination. Coordinates are saved as selected.
      </p>
    </div>
  );
}

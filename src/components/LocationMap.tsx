import 'leaflet/dist/leaflet.css';
import { AimOutlined, DeleteOutlined, EnvironmentOutlined, FormOutlined } from '@ant-design/icons';
import { App, Button, Flex, Typography } from 'antd';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface LatLng { lat: number; lng: number }

/** Downtown Cairo — where an empty map opens. */
const CAIRO: LatLng = { lat: 30.0444, lng: 31.2357 };

// Leaflet's default marker images don't survive bundling; an inline SVG pin needs no assets.
const pin = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: '<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="#D92D20"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>',
});

const tiles = (
  <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    maxZoom={19}
  />
);

export const googleMapsUrl = (p: LatLng) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

/** Accepts the API's decimal strings or numbers; null when either part is missing. */
export function toLatLng(lat: unknown, lng: unknown): LatLng | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
}

function Recenter({ to, zoom }: { to: LatLng | null; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (to) map.setView([to.lat, to.lng], Math.max(map.getZoom(), zoom)); }, [to?.lat, to?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/**
 * Pick a point: click the map or drag the pin. `onFillAddress` (optional) fills the address fields from the pin.
 */
export function LocationPicker({ value, onChange, onFillAddress, height = 300 }: {
  value: LatLng | null;
  onChange: (p: LatLng | null) => void;
  onFillAddress?: (p: LatLng) => Promise<void>;
  height?: number;
}) {
  const { message } = App.useApp();
  const [filling, setFilling] = useState(false);
  const [locating, setLocating] = useState(false);

  const fill = async () => {
    if (!value || !onFillAddress) return;
    setFilling(true);
    try { await onFillAddress(value); } finally { setFilling(false); }
  };
  const myLocation = () => {
    if (!navigator.geolocation) return message.warning('المتصفح مش بيدعم تحديد الموقع');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setLocating(false); message.error('تعذّر تحديد موقعك، اسمح للمتصفح بالوصول للموقع'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <Flex vertical gap={8}>
      <div dir="ltr" style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        <MapContainer center={value ?? CAIRO} zoom={value ? 16 : 11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          {tiles}
          <ClickToPlace onPick={onChange} />
          <Recenter to={value} zoom={16} />
          {value && (
            <Marker
              position={value}
              icon={pin}
              draggable
              eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }); } }}
            />
          )}
        </MapContainer>
      </div>
      <Flex gap={8} wrap align="center">
        <Typography.Text type="secondary" style={{ fontSize: 12, flex: 1, minWidth: 200 }}>
          {value ? 'اسحب الدبوس أو اضغط على مكان تاني في الخريطة لتعديله.' : 'اضغط على الخريطة لتحديد مكان العميل.'}
        </Typography.Text>
        <Button size="small" icon={<AimOutlined />} loading={locating} onClick={myLocation}>موقعي الحالي</Button>
        {value && onFillAddress && <Button size="small" icon={<FormOutlined />} loading={filling} onClick={fill}>املأ العنوان من الخريطة</Button>}
        {value && <Button size="small" icon={<EnvironmentOutlined />} href={googleMapsUrl(value)} target="_blank">خرائط جوجل</Button>}
        {value && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onChange(null)}>إزالة الموقع</Button>}
      </Flex>
    </Flex>
  );
}

/** Read-only map with the pin and a link to Google Maps. */
export function LocationView({ point, height = 220 }: { point: LatLng; height?: number }) {
  return (
    <Flex vertical gap={8}>
      <div dir="ltr" style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        <MapContainer center={point} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          {tiles}
          <Recenter to={point} zoom={16} />
          <Marker position={point} icon={pin} />
        </MapContainer>
      </div>
      <Button size="small" icon={<EnvironmentOutlined />} href={googleMapsUrl(point)} target="_blank" style={{ alignSelf: 'flex-start' }}>
        فتح في خرائط جوجل
      </Button>
    </Flex>
  );
}

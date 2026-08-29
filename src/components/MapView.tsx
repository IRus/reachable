import {useEffect, useRef} from "react";
import {Circle, CircleMarker, MapContainer, Polygon, TileLayer, useMap} from "react-leaflet";
import type {LatLngBoundsExpression, LatLngExpression} from "leaflet";
import type {LatLon} from "../lib/geo";
import type {Zone} from "../hooks/useIsochrone";

interface Props {
  readonly position: (LatLon & {accuracy: number}) | null;
  readonly zone: Zone | null;
}

/** Карта следует за точкой, пока пользователь сам её не подвинул. */
function FollowPosition({position}: {position: LatLon | null}) {
  const map = useMap();
  const userMoved = useRef(false);

  useEffect(() => {
    const onDrag = () => {
      userMoved.current = true;
    };
    map.on("dragstart", onDrag);
    return () => {
      map.off("dragstart", onDrag);
    };
  }, [map]);

  useEffect(() => {
    if (!position || userMoved.current) return;
    map.setView([position.lat, position.lon], map.getZoom());
  }, [map, position?.lat, position?.lon]);

  return null;
}

/** Подгоняет масштаб под зону каждый раз, когда её форма меняется. */
function FitZone({zone}: {zone: Zone | null}) {
  const map = useMap();

  useEffect(() => {
    const outer = zone?.rings[0];
    if (!outer || outer.length < 3) return;

    let south = 90;
    let north = -90;
    let west = 180;
    let east = -180;
    for (const [lat, lon] of outer) {
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
    }

    const bounds: LatLngBoundsExpression = [
      [south, west],
      [north, east]
    ];
    map.fitBounds(bounds, {padding: [32, 32], animate: true});
  }, [map, zone]);

  return null;
}

export function MapView({position, zone}: Props) {
  const center: LatLngExpression = position
    ? [position.lat, position.lon]
    // Пока места нет, показываем мир целиком, а не случайный город.
    : [20, 0];

  return (
    <MapContainer
      className="map"
      center={center}
      zoom={position ? 15 : 2}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {zone && (
        <Polygon
          positions={zone.rings.map((ring) =>
            ring.map(([lat, lon]) => [lat, lon] as LatLngExpression)
          )}
          pathOptions={{
            color: zone.source === "streets" ? "#3ddc97" : "#f6c453",
            weight: 2,
            fillOpacity: 0.18,
            // Круг рисуем пунктиром, чтобы его нельзя было принять за настоящую
            // зону доступности.
            dashArray: zone.source === "circle" ? "6 6" : undefined
          }}
        />
      )}

      {position && (
        <>
          <Circle
            center={[position.lat, position.lon]}
            radius={position.accuracy}
            pathOptions={{color: "#5aa9ff", weight: 1, fillOpacity: 0.12}}
          />
          <CircleMarker
            center={[position.lat, position.lon]}
            radius={7}
            pathOptions={{color: "#ffffff", weight: 2, fillColor: "#5aa9ff", fillOpacity: 1}}
          />
        </>
      )}

      <FollowPosition position={position} />
      <FitZone zone={zone} />
    </MapContainer>
  );
}

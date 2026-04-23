/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Phone, SlidersHorizontal, Navigation, Radar } from 'lucide-react';
import { motion } from 'framer-motion';

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../lib/api';
import { formatDistance, toLeafletLatLng } from '../lib/geo';
import { useGeolocation } from '../hooks/useGeolocation';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), 13), { animate: true });
  }, [center, map]);
  return null;
}

const SearchDonors = () => {
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [pincode, setPincode] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const { position, error: geoError, isRunning, start, stop } = useGeolocation();
  const lastFetchRef = useRef(0);

  const filtered = useMemo(
    () => donors.filter((d) => selectedGroup === 'All' || d.bloodGroup === selectedGroup),
    [donors, selectedGroup]
  );

  const mapCenter = useMemo(() => {
    if (position) return [position.lat, position.lng];
    return [31.3260, 75.5762];
  }, [position]);

  const loadDonors = async ({ lat, lng }, opts = {}) => {
    const now = Date.now();
    if (!opts.force && now - lastFetchRef.current < 2500) return;
    lastFetchRef.current = now;

    setFetchError('');
    setIsLoading(true);
    try {
      const res = await api.get('/donors/nearby', {
        params: {
          lat,
          lng,
          maxDistance: Math.round(radiusKm * 1000),
          bloodGroup: selectedGroup === 'All' ? undefined : selectedGroup,
          pincode: pincode || undefined,
          availableOnly: true,
        },
      });
      const list = res.data?.data || [];
      setDonors(
        list.map((d) => ({
          id: d._id,
          name: d.name,
          bloodGroup: d.bloodGroup,
          available: Boolean(d.availability),
          location: toLeafletLatLng(d.location?.coordinates),
          distanceMeters: d.distanceMeters,
          pincode: d.location?.pincode,
          city: d.location?.city,
        }))
      );
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load donors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!position || !isRunning) return;
    loadDonors({ lat: position.lat, lng: position.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, isRunning, selectedGroup, radiusKm]);

  return (
    <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Find <span className="text-gradient">Donors</span></h1>
            <p className="text-slate-600 text-sm mt-1">
              {position ? 'Searching near your current location' : 'Turn on GPS for nearby results'}
            </p>
          </div>
          <span className="badge-green">{filtered.filter(d => d.available).length} donors available now</span>
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="panel rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </h3>
              
              {/* Pincode */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter pincode..."
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  className="input pl-10 py-3 text-sm"
                />
              </div>

              {/* Radius */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600 block">Radius</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={30}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs font-bold text-slate-700 w-12 text-right">{radiusKm}km</div>
                </div>
              </div>

              {/* Location controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => (isRunning ? stop() : start())}
                  className={`w-full justify-center text-sm !py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-all ${
                    isRunning ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/15' : 'btn-ghost'
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  {isRunning ? 'Live On' : 'Live Off'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!position) start();
                    if (position) loadDonors({ lat: position.lat, lng: position.lng }, { force: true });
                  }}
                  className="btn-primary w-full justify-center text-sm !py-3 !rounded-xl"
                >
                  <Navigation className="w-4 h-4" /> Near Me
                </button>
              </div>

              {(geoError || fetchError) && (
                <div className="panel-soft rounded-xl px-3 py-2 border border-red-200 bg-red-50 text-red-700 text-xs">
                  {geoError || fetchError}
                </div>
              )}

              {/* Blood group pills */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 block">Blood Group</label>
                <div className="flex flex-wrap gap-2">
                  {bloodGroups.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedGroup === g
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                          : 'panel-soft text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!position) start();
                  if (position) loadDonors({ lat: position.lat, lng: position.lng }, { force: true });
                }}
                className="btn-primary w-full justify-center text-sm"
                disabled={isLoading}
              >
                <Search className="w-4 h-4" /> {isLoading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* Donor list */}
            <div className="panel rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Nearby Donors</h3>
              </div>
              <div className="overflow-y-auto px-3 pb-3 space-y-2 max-h-[420px] lg:max-h-[640px]">
                {isLoading && donors.length === 0 && (
                  <div className="p-4 panel-soft rounded-2xl border border-slate-200 text-slate-700 text-sm">
                    Loading real-time donors…
                  </div>
                )}
                {filtered.map((donor) => (
                  <motion.div
                    key={donor.id}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 panel-soft rounded-2xl cursor-pointer transition-all border border-slate-200 ${
                      donor.available ? 'hover:border-emerald-300' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0">
                        {donor.bloodGroup}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{donor.name}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {formatDistance(donor.distanceMeters)}
                          <span className="mx-1">·</span>
                          <span className={donor.available ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            {donor.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      {donor.available && (
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <Phone className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <div className="p-4 panel-soft rounded-2xl border border-slate-200 text-slate-700 text-sm">
                    No donors found. Try expanding the radius or changing blood group.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="panel rounded-2xl overflow-hidden relative">
            <div className="h-[420px] md:h-[520px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
              <MapUpdater center={mapCenter} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {position && (
                <Marker position={[position.lat, position.lng]}>
                  <Popup>
                    <div className="font-semibold">You</div>
                    <div className="text-xs text-gray-500">Accuracy ±{Math.round(position.accuracy)}m</div>
                  </Popup>
                </Marker>
              )}
              {filtered.map(donor => (
                donor.location ? (
                <Marker key={donor.id} position={donor.location}>
                  <Popup>
                    <div className="font-semibold">{donor.name}</div>
                    <div className="text-red-600 font-black">{donor.bloodGroup}</div>
                    <div className="text-xs text-gray-500">{formatDistance(donor.distanceMeters)} away</div>
                  </Popup>
                </Marker>
                ) : null
              ))}
              </MapContainer>
            </div>

            {/* Map overlay tag */}
            <div className="absolute top-4 left-4 z-[1000] panel-soft rounded-xl px-3 py-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-xs font-bold text-slate-700">
                {position ? `Live Map · ${Math.round(radiusKm)}km` : 'Live Map · Enable GPS'}
              </span>
            </div>
          </div>
        </div>
    </div>
  );
};

export default SearchDonors;

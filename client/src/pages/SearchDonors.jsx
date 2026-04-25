import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Phone, SlidersHorizontal, Navigation, Radar } from 'lucide-react';
import { motion } from 'framer-motion';

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../lib/api';
import { formatDistance, toLeafletLatLng } from '../lib/geo';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext.jsx';
import { NearbyMedicalPlaces, RecenterMap, SatelliteMapLayers } from '../components/MapLayers.jsx';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SearchDonors = () => {
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [pincode, setPincode] = useState('');
  const [radiusKm, setRadiusKm] = useState(user?.settings?.donorSearch?.defaultRadiusKm || 10);
  const [donors, setDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const { position, error: geoError, isRunning, start, stop } = useGeolocation();
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!user?.settings?.donorSearch?.defaultRadiusKm) return;
    setRadiusKm(user.settings.donorSearch.defaultRadiusKm);
  }, [user?.settings?.donorSearch?.defaultRadiusKm]);

  const filtered = useMemo(
    () => donors.filter((d) => selectedGroup === 'All' || d.bloodGroup === selectedGroup),
    [donors, selectedGroup]
  );

  const mapCenter = useMemo(() => {
    if (position) return [position.lat, position.lng];
    const savedCoords = user?.location?.coordinates;
    if (Array.isArray(savedCoords) && savedCoords.length >= 2) {
      return [savedCoords[1], savedCoords[0]];
    }
    return [22.5937, 78.9629];
  }, [position, user?.location?.coordinates]);

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
          availableOnly: user?.settings?.donorSearch?.availableOnly ?? true,
        },
      });
      const list = res.data?.data || [];
      const shouldPrioritizeNearest = user?.settings?.donorSearch?.prioritizeNearest ?? true;
      const normalizedList = shouldPrioritizeNearest
        ? [...list].sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0))
        : list;
      setDonors(
        normalizedList.map((d) => ({
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
    if ((user?.settings?.donorSearch?.autoRefresh ?? true) === false) return;
    loadDonors({ lat: position.lat, lng: position.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, isRunning, selectedGroup, radiusKm, user?.settings?.donorSearch?.autoRefresh]);

  return (
    <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Find <span className="text-gradient">Donors</span></h1>
            <p className="text-slate-600 text-sm mt-1">
              {position ? 'Searching near your current location' : 'Turn on GPS for nearby results'}
            </p>
          </div>
          <span className="badge-green self-start md:self-auto">{filtered.filter(d => d.available).length} donors available now</span>
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              <div className="overflow-y-auto px-3 pb-3 space-y-2 max-h-[360px] sm:max-h-[420px] lg:max-h-[640px]">
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
                    <div className="flex items-start gap-3">
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
                        <button className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
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
            <div className="h-[320px] sm:h-[420px] md:h-[520px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
              <RecenterMap center={mapCenter} zoom={13} />
              <SatelliteMapLayers />
              <NearbyMedicalPlaces center={mapCenter} radiusMeters={Math.round(radiusKm * 1000)} />
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
            <div className="absolute left-3 right-3 top-3 z-[1000] flex items-center gap-2 rounded-xl panel-soft px-3 py-2 sm:left-4 sm:right-auto sm:top-4">
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

import React, { useState, useEffect } from 'react';
import { Search, MapPin, AlertCircle, Navigation, ChevronDown, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to update map view when coordinates change
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function App() {
  const [zipcode, setZipcode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      if (data.lastRefreshed) {
        setLastRefreshed(new Date(data.lastRefreshed).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setShowAuthModal(true);
  };

  const confirmRefresh = async () => {
    setShowAuthModal(false);
    setRefreshing(true);
    setRefreshMessage('');
    setError('');
    
    try {
      const response = await fetch('/api/refresh', { 
        method: 'POST',
        headers: {
          'x-admin-secret': adminKey
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh database');
      }
      
      setRefreshMessage(data.message || 'Database refreshed successfully');
      fetchStatus();
      setAdminKey('');
      setTimeout(() => setRefreshMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipcode) return;

    setLoading(true);
    setError('');
    setResult(null);
    setShowDirections(false);

    try {
      const response = await fetch(`/api/zipcode/${zipcode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Zipcode Locator</h1>
              <p className="text-sm text-neutral-500">Find coordinates for any US zipcode</p>
              {lastRefreshed && (
                <p className="text-xs text-neutral-400 mt-1">Last updated: {lastRefreshed}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Database"
            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </button>
        </div>

        {refreshMessage && (
          <div className="mb-6 bg-green-50 text-green-600 p-3 rounded-xl text-sm text-center font-medium">
            {refreshMessage}
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter 5-digit zipcode..."
              className="w-full pl-4 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-neutral-900 placeholder:text-neutral-400"
              maxLength={5}
            />
            <button
              type="submit"
              disabled={loading || zipcode.length < 5}
              className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Latitude</p>
                <p className="text-lg font-mono text-neutral-900">{result.latitude}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Longitude</p>
                <p className="text-lg font-mono text-neutral-900">{result.longitude}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-neutral-200 mb-6">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Location</p>
              <p className="text-neutral-900">{result.city}, {result.state} {result.zipcode}</p>
            </div>

            <div className="h-48 w-full rounded-xl overflow-hidden border border-neutral-200 relative z-0">
              <MapContainer 
                center={[result.latitude, result.longitude]} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[result.latitude, result.longitude]}>
                  <Popup>
                    {result.city}, {result.state} {result.zipcode}
                  </Popup>
                </Marker>
                <MapUpdater center={[result.latitude, result.longitude]} />
              </MapContainer>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setShowDirections(!showDirections)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
                <ChevronDown className={`w-4 h-4 transition-transform ${showDirections ? 'rotate-180' : ''}`} />
              </button>
              
              {showDirections && (
                <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <a 
                    href={`https://maps.apple.com/?daddr=${result.latitude},${result.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-500" />
                      Apple Maps
                    </div>
                  </a>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-green-500" />
                      Google Maps
                    </div>
                  </a>
                  <a 
                    href={`https://waze.com/ul?ll=${result.latitude},${result.longitude}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-cyan-500" />
                      Waze
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Admin Authentication</h2>
            <p className="text-sm text-neutral-500 mb-4">Please enter the admin secret key to refresh the database.</p>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin Secret Key"
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefresh}
                disabled={!adminKey}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

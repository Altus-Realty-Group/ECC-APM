// Genesis Grade Portfolio Google Map - Interactive Property Visualization

import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useDashboardData, type MapDataProperty } from '../hooks/useDashboardData';
import { Link } from 'wouter';

// Pin colors based on property status using design tokens
const getPinColor = (status: MapDataProperty['status']): string => {
  switch (status) {
    case 'occupied-current': return 'var(--good)'; 
    case 'vacant-ready': return 'var(--warn)'; 
    case 'vacant-down': return 'var(--bad)'; 
    case 'delinquent': return 'var(--bad)'; 
    default: return 'var(--neutral)'; 
  }
};

// Get status display text
const getStatusText = (status: MapDataProperty['status']): string => {
  switch (status) {
    case 'occupied-current': return 'Occupied';
    case 'vacant-ready': return 'Rent Ready';
    case 'vacant-down': return 'Vacant';
    case 'delinquent': return 'Delinquent';
    default: return 'Unknown';
  }
};

// Custom Pin Component
function PropertyPin({ status, onClick }: { 
  status: MapDataProperty['status']; 
  onClick?: () => void;
}) {
  const color = getPinColor(status);
  
  return (
    <div 
      onClick={onClick}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: color,
        border: '3px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    />
  );
}

export function PortfolioGoogleMap() {
  const { mapData, mapAvailable } = useDashboardData();
  const [selectedProperty, setSelectedProperty] = useState<MapDataProperty | null>(null);
  
  if (!mapAvailable) return <div className="map-fallback" role="status">Property locations are not available yet. Open Properties to review the loaded records.</div>;

  // Check for Google Maps API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return (
      <div className="map-fallback">
        <div className="map-fallback__icon">🗺️</div>
        <div className="map-fallback__title">Google Maps API Key is not configured.</div>
        <div className="map-fallback__subtitle">
          Configure your API key to view the interactive property map.
        </div>
      </div>
    );
  }

  // Filter to only valid coordinates
  const validPoints = mapData.filter(
    p => typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  );

  // Show empty state if no valid coordinates
  if (validPoints.length === 0) {
    return (
      <div className="map-fallback">
        <div className="map-fallback__icon">🗺️</div>
        <div className="map-fallback__title">No Properties with Coordinates</div>
        <div className="map-fallback__subtitle">
          Properties need to be geocoded before they can be displayed on the map.
        </div>
      </div>
    );
  }

  // Calculate center from properties if available
  const center = validPoints.length > 0 ? {
    lat: validPoints.reduce((sum, p) => sum + p.lat, 0) / validPoints.length,
    lng: validPoints.reduce((sum, p) => sum + p.lng, 0) / validPoints.length
  } : { lat: 41.8781, lng: -87.6298 };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <APIProvider apiKey={apiKey}>
        <Map
          center={center}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          styles={[
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]}
        >
          {validPoints.map((property) => (
            <AdvancedMarker
              key={property.id}
              position={{ lat: property.lat, lng: property.lng }}
              onClick={() => setSelectedProperty(property)}
            >
              <PropertyPin 
                status={property.status} 
                onClick={() => setSelectedProperty(property)}
              />
            </AdvancedMarker>
          ))}

          {selectedProperty && (
            <InfoWindow
              position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
              onCloseClick={() => setSelectedProperty(null)}
            >
              <div className="property-info-window">
                <h3 className="font-semibold text-sm mb-2">
                  {selectedProperty.address || `Property ${selectedProperty.id}`}
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: getPinColor(selectedProperty.status) }}
                    />
                    <span className="font-medium">{getStatusText(selectedProperty.status)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <Link 
                      href={`/portfolio/properties/${selectedProperty.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
import { useRoute } from "wouter";
// AssetCard removed - will be rebuilt

export default function PropertyDetailPage(){
  const [match, params] = useRoute<{ id: string }>("/portfolio/properties/:id");
  const id = params?.id;
  
  // Add null-check to prevent crashes
  if (!match || !id) {
    return (
      <div className="p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Property Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">The requested property could not be found.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h1>Property Detail</h1>
      <p>Property ID: {id}</p>
      <p>Asset card will be rebuilt</p>
    </div>
  );
}
import { FeaturedTripCard } from "@/components/ui/featured-trip-card";
import { Trip } from '@/types/trip';

interface TripMapViewProps {
  trips: Trip[];
  className?: string;
  isInWishlist?: (tripId: string) => boolean;
  onWishlistToggle?: (tripId: string, isCurrentlyWishlisted: boolean) => void;
}

export function TripMapView({ trips, className, isInWishlist, onWishlistToggle }: TripMapViewProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <FeaturedTripCard 
            key={trip.id}
            id={trip.id}
            title={trip.title}
            destination={trip.destination}
            description={trip.description || trip.title}
            price={trip.price}
            dates={trip.dates}
            groupSize={`${trip.max_participants} people max`}
            sensei={trip.sensei_profiles?.name || trip.sensei_name || ""}
            image={trip.image_url}
            theme={trip.theme}
            current_participants={trip.current_participants || 0}
            max_participants={trip.max_participants}
            difficulty_level={trip.difficulty_level}
            duration_days={trip.duration_days}
            rating={trip.rating || 0}
            review_count={0}
            sensei_image={trip.sensei_profiles?.image_url}
            sensei_specialties={trip.sensei_profiles?.specialties || []}
            sensei_location={trip.sensei_profiles?.location}
            sensei_id={trip.sensei_id}
            sensei_level={trip.sensei_profiles?.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei' | undefined}
            isWishlisted={isInWishlist?.(trip.id)}
            onWishlistToggle={onWishlistToggle}
          />
        ))}
      </div>
    </div>
  );
}

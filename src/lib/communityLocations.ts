export type CommunityLocation = {
  communityId: string;
  city: string;
  lat: number;
  lng: number;
};

export const COMMUNITY_LOCATIONS: readonly CommunityLocation[] = [
  { communityId: "tud", city: "Dublin", lat: 53.3377, lng: -6.2665 },
  { communityId: "trinity", city: "Dublin", lat: 53.3438, lng: -6.2546 },
  { communityId: "ucd", city: "Dublin", lat: 53.3077, lng: -6.2229 },
  { communityId: "ucc", city: "Cork", lat: 51.8922, lng: -8.4923 },
  { communityId: "galway", city: "Galway", lat: 53.277, lng: -9.0615 },
  { communityId: "ul", city: "Limerick", lat: 52.6739, lng: -8.571 },
  { communityId: "dcu", city: "Dublin", lat: 53.385, lng: -6.2573 },
  { communityId: "maynooth", city: "Maynooth", lat: 53.3813, lng: -6.592 },
  { communityId: "rcsi", city: "Dublin", lat: 53.3384, lng: -6.2657 },
  { communityId: "nci", city: "Dublin", lat: 53.348, lng: -6.2436 },
];

export const COMMUNITY_LOCATION_BY_ID = new Map(
  COMMUNITY_LOCATIONS.map((item) => [item.communityId, item])
);

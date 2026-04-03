import { describe, expect, it } from "vitest";
import {
  COMMUNITY_LOCATIONS,
  COMMUNITY_LOCATION_BY_ID,
} from "../../src/lib/communityLocations";

describe("communityLocations", () => {
  it("has unique communityIds", () => {
    const ids = COMMUNITY_LOCATIONS.map((c) => c.communityId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the map in sync with the list", () => {
    for (const loc of COMMUNITY_LOCATIONS) {
      expect(COMMUNITY_LOCATION_BY_ID.get(loc.communityId)).toEqual(loc);
    }
    expect(COMMUNITY_LOCATION_BY_ID.size).toBe(COMMUNITY_LOCATIONS.length);
  });
});

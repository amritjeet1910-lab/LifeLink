import axios from "axios";

const DEFAULT_HEADERS = {
  "User-Agent": "LifeLink/1.0 (deployment-ready blood network)",
  Accept: "application/json",
};

function normalizeLocale(value = "") {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(",");
}

function normalizePincode(value = "") {
  return String(value).trim();
}

function pickAddressPart(address = {}, keys = []) {
  for (const key of keys) {
    if (address[key]) return address[key];
  }
  return "";
}

function compactUnique(parts = []) {
  const seen = new Set();
  return parts.filter((part) => {
    const value = String(part || "").trim();
    if (!value) return false;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getPreferredCity(address = {}, { preferLocality = false } = {}) {
  const localityFirstKeys = [
    "town",
    "village",
    "hamlet",
    "suburb",
    "neighbourhood",
    "quarter",
    "municipality",
    "city",
    "city_district",
    "state_district",
    "county",
  ];

  const cityFirstKeys = [
    "city",
    "town",
    "village",
    "hamlet",
    "suburb",
    "neighbourhood",
    "quarter",
    "municipality",
    "city_district",
    "state_district",
    "county",
  ];

  return pickAddressPart(address, preferLocality ? localityFirstKeys : cityFirstKeys);
}

function buildReadableAddress(address = {}, fallbackDisplay = "") {
  const locality = pickAddressPart(address, [
    "road",
    "pedestrian",
    "residential",
    "suburb",
    "neighbourhood",
    "quarter",
    "hamlet",
    "village",
    "town",
    "city",
  ]);
  const adminArea = pickAddressPart(address, ["city", "town", "village", "city_district", "state_district", "county"]);
  const state = address.state || "";
  const postcode = address.postcode || "";
  const country = address.country || "";

  const parts = compactUnique([
    locality,
    adminArea,
    state,
    postcode,
    country,
  ]);

  return parts.length > 0 ? parts.join(", ") : fallbackDisplay || "";
}

function cleanPostOfficeName(name = "") {
  return String(name)
    .replace(/\s+(H\.?O\.?|S\.?O\.?|B\.?O\.?)$/i, "")
    .trim();
}

function chooseBestPostOffice(offices = []) {
  if (!Array.isArray(offices) || offices.length === 0) return null;

  const deliveryOffice =
    offices.find((office) => String(office?.DeliveryStatus || "").toLowerCase() === "delivery") ||
    offices[0];

  return deliveryOffice || null;
}

async function lookupIndianPincode(pincode) {
  const normalized = normalizePincode(pincode);
  if (!/^\d{6}$/.test(normalized)) return null;

  const { data } = await axios.get(`https://api.postalpincode.in/pincode/${normalized}`, {
    headers: DEFAULT_HEADERS,
    timeout: 12000,
  });

  const payload = Array.isArray(data) ? data[0] : null;
  const offices = Array.isArray(payload?.PostOffice) ? payload.PostOffice : [];
  const office = chooseBestPostOffice(offices);
  if (!office) return null;

  const locality = cleanPostOfficeName(office.Name || "");
  const district = String(office.District || "").trim();
  const state = String(office.State || "").trim();
  const country = String(office.Country || "India").trim();
  const city = locality || district;
  const address = compactUnique([locality, district, state, normalized, country]).join(", ");

  return {
    locality,
    district,
    state,
    country,
    city,
    address,
    pincode: normalized,
  };
}

function chooseBestGeocodeMatch(matches = [], { pincode, preferLocality = false } = {}) {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  const exactPostcodeMatches = pincode
    ? matches.filter((match) => String(match?.address?.postcode || "").trim() === String(pincode).trim())
    : matches;

  const pool = exactPostcodeMatches.length > 0 ? exactPostcodeMatches : matches;

  if (preferLocality) {
    const localityMatch = pool.find((match) =>
      Boolean(
        pickAddressPart(match?.address || {}, [
          "town",
          "village",
          "hamlet",
          "suburb",
          "neighbourhood",
          "quarter",
          "municipality",
        ])
      )
    );
    if (localityMatch) return localityMatch;
  }

  return pool[0];
}

async function searchNominatim(query, { limit = 1, locale } = {}) {
  if (!String(query || "").trim()) return [];

  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: query,
      format: "jsonv2",
      limit,
      addressdetails: 1,
      "accept-language": normalizeLocale(locale),
    },
    headers: DEFAULT_HEADERS,
    timeout: 12000,
  });

  return Array.isArray(data) ? data : [];
}

export function buildLocationPayload({
  coordinates,
  pincode,
  city,
  address,
  source = "manual",
  accuracy,
}) {
  const lng = Number(coordinates?.[0]);
  const lat = Number(coordinates?.[1]);

  return {
    type: "Point",
    coordinates: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : [0, 0],
    pincode: pincode || "",
    city: city || "",
    address: address || "",
    source,
    accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : undefined,
  };
}

export async function geocodeFromText({ address, pincode, city, locale }) {
  const normalizedPincode = normalizePincode(pincode);
  const query = [address, city, normalizedPincode].filter(Boolean).join(", ").trim();
  if (!query) {
    throw new Error("Address or pincode is required to estimate a location.");
  }

  const pincodeOnlyLookup = Boolean(normalizedPincode && !address && !city);
  const indiaPincodeDetails = pincodeOnlyLookup ? await lookupIndianPincode(normalizedPincode).catch(() => null) : null;

  const primaryQuery =
    pincodeOnlyLookup && indiaPincodeDetails
      ? compactUnique([
          indiaPincodeDetails.locality,
          indiaPincodeDetails.district,
          indiaPincodeDetails.state,
          indiaPincodeDetails.pincode,
          indiaPincodeDetails.country,
        ]).join(", ")
      : query;

  const fallbackQuery =
    pincodeOnlyLookup && indiaPincodeDetails
      ? compactUnique([
          indiaPincodeDetails.district,
          indiaPincodeDetails.state,
          indiaPincodeDetails.country,
        ]).join(", ")
      : "";

  const primaryMatches = await searchNominatim(primaryQuery, {
    limit: pincodeOnlyLookup ? 5 : 1,
    locale,
  });
  const matches =
    primaryMatches.length > 0
      ? primaryMatches
      : fallbackQuery
        ? await searchNominatim(fallbackQuery, { limit: 3, locale })
        : [];

  const match = chooseBestGeocodeMatch(matches, {
    pincode: normalizedPincode,
    preferLocality: pincodeOnlyLookup,
  });
  if (!match) {
    throw new Error("Could not estimate address from this pincode. Try another pincode or use GPS.");
  }

  const resolvedAddress = match.address || {};
  return {
    coordinates: [Number(match.lon), Number(match.lat)],
    city:
      city ||
      indiaPincodeDetails?.city ||
      getPreferredCity(resolvedAddress, { preferLocality: pincodeOnlyLookup }),
    pincode: normalizedPincode || resolvedAddress.postcode || indiaPincodeDetails?.pincode || "",
    address:
      address ||
      indiaPincodeDetails?.address ||
      buildReadableAddress(resolvedAddress, match.display_name || ""),
    source: "estimated",
    accuracy: 1500,
  };
}

export async function reverseGeocode({ lat, lng, locale }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Valid lat/lng are required for reverse geocoding.");
  }

  const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
    params: {
      lat: latitude,
      lon: longitude,
      format: "jsonv2",
      addressdetails: 1,
      "accept-language": normalizeLocale(locale),
    },
    headers: DEFAULT_HEADERS,
    timeout: 12000,
  });

  const address = data?.address || {};
  return {
    coordinates: [longitude, latitude],
    city: getPreferredCity(address),
    pincode: address.postcode || "",
    address: buildReadableAddress(address, data?.display_name || ""),
    source: "gps",
  };
}

export async function resolveLocationInput({
  coordinates,
  pincode,
  city,
  address,
  accuracy,
  locale,
}) {
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]));

  if (hasCoordinates) {
    const base = buildLocationPayload({
      coordinates,
      pincode,
      city,
      address,
      source: "gps",
      accuracy,
    });

    try {
      const reverse = await reverseGeocode({
        lng: coordinates[0],
        lat: coordinates[1],
        locale,
      });
      return buildLocationPayload({
        coordinates,
        pincode: pincode || reverse.pincode,
        city: city || reverse.city,
        address: address || reverse.address,
        source: "gps",
        accuracy,
      });
    } catch {
      return base;
    }
  }

  const estimated = await geocodeFromText({ address, pincode, city, locale });
  return buildLocationPayload(estimated);
}

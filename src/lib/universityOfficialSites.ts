/** Region keys match sidebar filters on the University Explorer page */
export type UniversityExplorerRegion = "dublin" | "galway" | "cork" | "limerick" | "other";

export type UniversityExplorerBadge = "popular" | "new";

export type UniversityOfficialSite = {
  id: string;
  shortName: string;
  name: string;
  officialUrl: string;
  region: UniversityExplorerRegion;
  description: string;
  badge?: UniversityExplorerBadge | null;
  storagePath: string;
  /** External URL only; if null, UI builds a public Storage URL from `storagePath` + `VITE_FIREBASE_STORAGE_BUCKET`. */
  imageUrl: string | null;
};

export const UNIVERSITY_OFFICIAL_SITES: readonly UniversityOfficialSite[] = [
  {
    id: "tcd",
    shortName: "TCD",
    name: "Trinity College Dublin",
    officialUrl: "https://www.tcd.ie",
    region: "dublin",
    description:
      "Ireland's highest ranked university, in the heart of Dublin. A historic hub of excellence since 1592.",
    badge: "popular",
    storagePath: "universities/Trinity_College_-_Great_Court_02.jpg",
    imageUrl: null,
  },
  {
    id: "ucd",
    shortName: "UCD",
    name: "University College Dublin",
    officialUrl: "https://www.ucd.ie",
    region: "dublin",
    description:
      "A global leader in research and education, with a vibrant campus and world-class facilities in Belfield.",
    badge: "new",
    storagePath: "universities/UCD-1000x500.jpg",
    imageUrl: null,
  },
  {
    id: "galway",
    shortName: "Galway",
    name: "University of Galway",
    officialUrl: "https://www.universityofgalway.ie",
    region: "galway",
    description:
      "Arts and sciences on the River Corrib, known for cultural heritage and a strong student community.",
    badge: "popular",
    storagePath: "universities/university_of_galway.png",
    imageUrl: null,
  },
  {
    id: "ucc",
    shortName: "UCC",
    name: "University College Cork",
    officialUrl: "https://www.ucc.ie",
    region: "cork",
    description:
      "Tradition and modernity together — renowned for sustainability, innovation, and the iconic quadrangle.",
    storagePath: "universities/university college cork.jpg",
    imageUrl: null,
  },
  {
    id: "ul",
    shortName: "UL",
    name: "University of Limerick",
    officialUrl: "https://www.ul.ie",
    region: "limerick",
    description:
      "A leader in cooperative education, with a striking campus on the banks of the Shannon.",
    badge: "new",
    storagePath: "universities/university_of_limerick.jpg",
    imageUrl: null,
  },
  {
    id: "dcu",
    shortName: "DCU",
    name: "Dublin City University",
    officialUrl: "https://www.dcu.ie",
    region: "dublin",
    description:
      "Ireland's university of enterprise — young, dynamic, and focused on innovation and societal impact.",
    storagePath: "universities/dcu.jpg",
    imageUrl: null,
  },
  {
    id: "mu",
    shortName: "MU",
    name: "Maynooth University",
    officialUrl: "https://www.maynoothuniversity.ie",
    region: "other",
    description:
      "One of Ireland's fastest-growing universities, combining research strength with a close-knit campus in Kildare.",
    storagePath: "universities/Maynooth-1000x500.jpg",
    imageUrl: null,
  },
  {
    id: "tud",
    shortName: "TU Dublin",
    name: "Technological University Dublin",
    officialUrl: "https://www.tudublin.ie",
    region: "dublin",
    description:
      "Ireland's first technological university, spanning city-centre and campus locations with industry-focused programmes.",
    storagePath:
      "universities/Technological_University_Dublin_Desktop_984x398_Header_Banner_936256a319.webp",
    imageUrl: null,
  },
  {
    id: "nci",
    shortName: "NCI",
    name: "National College of Ireland",
    officialUrl: "https://www.ncirl.ie",
    region: "dublin",
    description:
      "Career-focused degrees in the Dublin Docklands, strong links to business and technology sectors.",
    storagePath: "universities/NCI.jpg",
    imageUrl: null,
  },
  {
    id: "rcsi",
    shortName: "RCSI",
    name: "RCSI University of Medicine and Health Sciences",
    officialUrl: "https://www.rcsi.com",
    region: "dublin",
    description:
      "Specialist health sciences education and research, rooted in Dublin with a global outlook.",
    storagePath: "universities/rcsi.jpg",
    imageUrl: null,
  },
];

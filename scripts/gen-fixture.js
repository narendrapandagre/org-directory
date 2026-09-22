// Generates src/assets/data/organisations.json
// Starts from the EXACT 8 records given in the brief, then extends to ~140,
// deliberately re-using every quirk (blank/null name, mixed-case status,
// string/negative/null memberCount, missing owner, invalid email, bad date,
// duplicate id, unicode/emoji name, very long name) across the extra rows.
const fs = require('fs');
const path = require('path');

const seed = [
  { id: 1,  name: "Northwind Traders",     status: "active",
    memberCount: 42,   owner: { email: "ops@northwind.example" },
    createdAt: "2024-03-11T09:12:00Z" },
  { id: 2,  name: "",                       status: "ACTIVE",
    memberCount: "12", owner: { email: "a@b.example" },
    createdAt: 1710150720000 },
  { id: 3,  name: null,                     status: "Active",
    memberCount: -1,   createdAt: "2024-01-02T00:00:00Z" },
  { id: 42, name: "Globex Corporation",     status: "suspended",
    memberCount: 7,    owner: { email: "hq@globex.example" },
    createdAt: "2023-11-30T14:45:10Z" },
  { id: 42, name: "Globex Corporation Ltd", status: "actve",
    memberCount: 7,    owner: { email: "hq@globex.example" },
    createdAt: "2023-11-30T14:45:10Z" },
  { id: 6,  name: "شركة الأمل 🚀",           status: "active",
    memberCount: 3,    owner: { email: "info@amal.example" },
    createdAt: "2025-06-01T08:00:00Z" },
  { id: 7,  name: "The Very Long Organisation Name That Somebody Actually Typed Into The Field Because Nobody Validated It And It Keeps Going Well Past Any Reasonable Column Width And Still Has Not Stopped",
    status: "inactive", memberCount: 0,
    owner: { email: "long@example.com" },
    createdAt: "2024-07-19T16:20:00Z" },
  { id: 8,  name: "Initech",                status: null,
    memberCount: null, owner: { email: "not-an-email" },
    createdAt: "not a date" }
];

const statusVariants = ["active", "ACTIVE", "Active", "actve", "inactive", "Inactive", "suspended", "Suspended", null, ""];
const namePool = [
  "Acme Ltd", "Wonka Industries", "Stark Enterprises", "Wayne Holdings", "Umbrella Corp",
  "Hooli", "Pied Piper", "Soylent Corp", "Cyberdyne Systems", "Tyrell Corporation",
  "شركة النور", "北京科技有限公司", "Société Générale Test", "Café René & Cie",
  "O'Brien & Sons", "Müller GmbH", "Ánimo Studios", "e-Corp", "Los Pollos Hermanos",
  "Massive Dynamic", "Aperture Science", "Gekko & Co", "Dunder Mifflin", "Vandelay Industries"
];
const domainPool = ["example.com", "example.org", "example.net", "test.example", "mail.example"];

function randomDateish(i) {
  const formats = i % 7;
  const d = new Date(2022, i % 12, (i % 27) + 1, i % 24, (i * 3) % 60);
  switch (formats) {
    case 0: return d.toISOString();
    case 1: return d.getTime(); // epoch ms, like record 2
    case 2: return "not a date"; // like record 8
    case 3: return d.toISOString().slice(0, 10); // date-only string
    case 4: return ""; // blank
    case 5: return null;
    default: return d.toISOString();
  }
}

function randomMemberCount(i) {
  const m = i % 6;
  if (m === 0) return i * 3;
  if (m === 1) return String(i * 2); // stringly-typed, like record 2
  if (m === 2) return -1; // negative, like record 3
  if (m === 3) return null; // like record 8
  if (m === 4) return 0;
  return undefined;
}

function randomOwner(i) {
  const o = i % 5;
  const name = namePool[i % namePool.length].toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  if (o === 0) return { email: `${name}${i}@${domainPool[i % domainPool.length]}` };
  if (o === 1) return { email: "not-an-email" }; // invalid, like record 8
  if (o === 2) return undefined; // missing owner, like record 3
  if (o === 3) return { email: "" };
  return { email: `${name}${i}@${domainPool[i % domainPool.length]}` };
}

function randomName(i) {
  const n = i % 9;
  if (n === 0) return ""; // blank, like record 2
  if (n === 1) return null; // like record 3
  if (n === 8) return seed[6].name; // reuse the extremely long name occasionally
  const base = namePool[i % namePool.length];
  return n === 3 ? `${base} 🚀` : `${base}${i % 4 === 0 ? ` #${i}` : ''}`;
}

const rows = [...seed];
let nextId = 100;
const TARGET = 140;
let i = 0;
while (rows.length < TARGET) {
  i++;
  // Occasionally emit a duplicate id on purpose (like the Globex pair), ~1 in 20
  const makeDuplicate = i % 20 === 0 && rows.length > 1;
  const id = makeDuplicate ? rows[rows.length - 1].id : nextId++;
  rows.push({
    id,
    name: randomName(i),
    status: statusVariants[i % statusVariants.length],
    memberCount: randomMemberCount(i),
    owner: randomOwner(i),
    createdAt: randomDateish(i)
  });
}

const outPath = path.join(__dirname, '..', 'public', 'assets', 'data', 'organisations.json');
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} records to ${outPath}`);

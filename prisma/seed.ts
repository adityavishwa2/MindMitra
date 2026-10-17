import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const catalog: Record<string, [string, string[]]> = {
  SSC: [
    "Staff Selection Commission",
    [
      "SSC CGL",
      "SSC CHSL",
      "SSC MTS",
      "SSC CPO",
      "SSC GD Constable",
      "SSC JE",
      "SSC Stenographer",
      "SSC Selection Post",
    ],
  ],
  Railways: [
    "Railway Recruitment Boards",
    [
      "RRB NTPC",
      "RRB Group D",
      "RRB ALP",
      "RRB Technician",
      "RRB JE",
      "RRB Paramedical",
      "RPF Constable",
      "RPF SI",
    ],
  ],
  UPSC: [
    "Union Public Service Commission",
    [
      "UPSC Civil Services Prelims",
      "UPSC Civil Services Mains",
      "UPSC NDA",
      "UPSC CDS",
      "UPSC CAPF",
      "UPSC Engineering Services",
      "UPSC Combined Medical Services",
      "UPSC Indian Forest Service",
    ],
  ],
  Banking: [
    "Banking and Finance Recruitment",
    [
      "IBPS PO",
      "IBPS Clerk",
      "IBPS SO",
      "IBPS RRB PO",
      "IBPS RRB Office Assistant",
      "SBI PO",
      "SBI Clerk",
      "RBI Grade B",
      "RBI Assistant",
      "NABARD Grade A",
    ],
  ],
  Teaching: [
    "Teacher Recruitment Authorities",
    ["CTET", "UPTET", "KVS Recruitment", "NVS Recruitment", "DSSSB Teaching"],
  ],
  Entrance: [
    "Entrance Examination Authorities",
    ["JEE Main", "JEE Advanced", "NEET UG", "GATE", "CUET", "CLAT", "CAT"],
  ],
  State: [
    "State Public Service Commissions",
    ["UPPSC", "BPSC", "MPPSC", "RPSC", "MPSC", "WBPSC"],
  ],
};
const specific: Record<string, string> = {
  IBPS: "Institute of Banking Personnel Selection",
  SBI: "State Bank of India",
  RBI: "Reserve Bank of India",
  NABARD: "National Bank for Agriculture and Rural Development",
  CTET: "Central Board of Secondary Education",
  UPTET: "Examination Regulatory Authority, Uttar Pradesh",
  KVS: "Kendriya Vidyalaya Sangathan",
  NVS: "Navodaya Vidyalaya Samiti",
  DSSSB: "Delhi Subordinate Services Selection Board",
  "JEE Main": "National Testing Agency",
  "NEET UG": "National Testing Agency",
  CUET: "National Testing Agency",
  "JEE Advanced": "Joint Admission Board, Indian Institutes of Technology",
  GATE: "Indian Institutes of Technology / Indian Institute of Science",
  CLAT: "Consortium of National Law Universities",
  CAT: "Indian Institutes of Management",
  UPPSC: "Uttar Pradesh Public Service Commission",
  BPSC: "Bihar Public Service Commission",
  MPPSC: "Madhya Pradesh Public Service Commission",
  RPSC: "Rajasthan Public Service Commission",
  MPSC: "Maharashtra Public Service Commission",
  WBPSC: "West Bengal Public Service Commission",
  RPF: "Railway Protection Force Recruitment",
};
const states: Record<string, string> = {
  UPPSC: "Uttar Pradesh",
  BPSC: "Bihar",
  MPPSC: "Madhya Pradesh",
  RPSC: "Rajasthan",
  MPSC: "Maharashtra",
  WBPSC: "West Bengal",
  UPTET: "Uttar Pradesh",
};
async function main() {
  for (const [category, [defaultAuthority, names]] of Object.entries(catalog))
    for (const name of names) {
      const authority =
        Object.entries(specific).find(([prefix]) =>
          name.startsWith(prefix),
        )?.[1] ?? defaultAuthority;
      const a = await db.authority.upsert({
        where: { name: authority },
        create: { name: authority },
        update: {},
      });
      const subjects = name.startsWith("NEET")
        ? ["Physics", "Chemistry", "Biology"]
        : name.startsWith("JEE")
          ? ["Physics", "Chemistry", "Mathematics"]
          : category === "Teaching"
            ? [
                "Child development and pedagogy",
                "Languages",
                "Mathematics",
                "Environmental studies",
              ]
            : category === "UPSC"
              ? ["General studies", "Aptitude", "Examination-specific subjects"]
              : [
                  "General awareness",
                  "Quantitative aptitude",
                  "Reasoning",
                  "English",
                ];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = await db.exam.findUnique({
        where: { slug },
        include: { authority: true },
      });
      if (
        existing &&
        [
          "Banking and Finance Recruitment",
          "Teacher Recruitment Authorities",
          "Entrance Examination Authorities",
          "State Public Service Commissions",
        ].includes(existing.authority.name)
      )
        await db.exam.update({
          where: { id: existing.id },
          data: { authorityId: a.id, subjects, state: states[name] ?? null },
        });
      else
        await db.exam.upsert({
          where: { slug },
          create: {
            name,
            slug,
            category,
            authorityId: a.id,
            subjects,
            state: states[name] ?? null,
          },
          update: {},
        });
    }
  console.log(
    "Exam directory seeded. No questions or videos fabricated. Annual conducting arrangements must be checked when papers are imported.",
  );
}
main().finally(() => db.$disconnect());

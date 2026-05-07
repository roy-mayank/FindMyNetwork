/**
 * Canonical industry labels for data collection (entity nodes). Keeps graph clustering consistent.
 * "Other" is handled in the UI with a free-text follow-up field.
 */

export const INDUSTRY_OTHER_VALUE = "__other__" as const;

/** Curated presets (alphabetical). Extend as needed. */
export const INDUSTRY_PRESET_LABELS: readonly string[] = [
  "3D printing & additive manufacturing",
  "AdTech & marketing technology",
  "Aerospace & defense",
  "Agriculture & agribusiness",
  "Airlines & aviation",
  "Apparel & fashion",
  "Architecture & design services",
  "Asset management & mutual funds",
  "Automotive & mobility",
  "Batteries & energy storage",
  "Banking & credit unions",
  "Beauty & personal care",
  "Biotechnology",
  "Broadcasting & cable",
  "Cannabis & regulated adult-use industries",
  "Chemicals & specialty materials",
  "Childcare & early education",
  "Co-working & flexible workspace",
  "Construction & engineering",
  "Consumer electronics",
  "Consumer packaged goods (CPG)",
  "Cybersecurity",
  "Data, analytics & BI",
  "Defense technology",
  "Drones & unmanned systems",
  "E-commerce & online retail",
  "Education & training",
  "Elder & senior care services",
  "Electric vehicles & EV charging",
  "EdTech",
  "Electrical equipment & components",
  "Energy — oil & gas",
  "Engineering & R&D services",
  "Entertainment & live events",
  "Environmental services",
  "Event planning & rentals",
  "FinTech & digital payments",
  "Fitness technology & digital wellness",
  "Food & beverage manufacturing",
  "Food service & restaurants",
  "Forestry & paper products",
  "Funeral & memorial services",
  "Gaming & esports",
  "Government & public administration",
  "Health insurance & benefits",
  "Healthcare IT",
  "Healthcare providers & hospitals",
  "Home improvement & furniture",
  "Hospitality & hotels",
  "HR tech, staffing & recruiting",
  "Industrial automation & robotics",
  "Industrial machinery & equipment",
  "Insurance (life, P&C, specialty)",
  "Internet platforms & marketplaces",
  "Jewelry, watches & luxury goods",
  "Legal services",
  "Logistics & freight",
  "Management consulting",
  "Manufacturing — general",
  "Market research & consumer insights",
  "Maritime & shipping",
  "Media & publishing",
  "Medical devices & diagnostics",
  "Mining & metals",
  "Music, film & production",
  "Museums, arts & cultural institutions",
  "Non-profit & NGO",
  "Packaging & labeling",
  "Pet care & veterinary services",
  "Pharmaceuticals",
  "Printing & physical signage",
  "Private equity, venture capital & accelerators",
  "Professional services — accounting & tax",
  "Public relations & corporate communications",
  "Quantum computing & deep tech R&D",
  "Rail equipment & rolling stock",
  "Real estate & property development",
  "Religious & faith-based organizations",
  "Renewables & clean energy",
  "Retail — brick & mortar",
  "Scientific instruments & laboratory equipment",
  "Security & investigations",
  "Semiconductors",
  "Software — enterprise / B2B",
  "Software — consumer / prosumer",
  "Social networking & online communities",
  "Space & satellite",
  "Sports & fitness",
  "Telecommunications",
  "Testing, inspection & certification (TIC)",
  "Textiles & apparel manufacturing",
  "Toys, hobbies & collectibles",
  "Translation & localization services",
  "Transportation (transit, rail, trucking)",
  "Travel & tourism",
  "Utilities (electric, gas, water)",
  "Waste management & recycling",
  "Water technology & treatment",
  "Warehousing & supply chain",
  "Wealth management & private banking",
  "Wholesale & distribution",
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

export function resolveIndustryFromForm(
  presetValue: string,
  otherDetail: string,
): { industry: string } | { error: string } {
  const preset = presetValue.trim();
  if (!preset) {
    return { error: "Select an industry." };
  }
  if (preset === INDUSTRY_OTHER_VALUE) {
    const detail = otherDetail.trim();
    if (!detail) {
      return { error: 'Enter a short industry label for "Other".' };
    }
    return { industry: detail };
  }
  return { industry: preset };
}

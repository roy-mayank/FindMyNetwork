import type { NetworkData } from "@/lib/network-types";

/**
 * Edit this file to reflect your real network.
 * Topology: you (me) link to entities (e.g. university) and companies; companies link to people.
 */
export const sampleNetwork: NetworkData = {
  nodes: [
    { id: "me", label: "You", kind: "me" },
    {
      id: "uni-1",
      label: "Example University",
      kind: "entity",
      subtitle: "Alma mater",
    },
    {
      id: "co-1",
      label: "Acme Corp",
      kind: "company",
      subtitle: "Current team",
    },
    {
      id: "co-2",
      label: "Beta Labs",
      kind: "company",
      subtitle: "Past internship",
    },
    {
      id: "p-1",
      label: "Alex Chen",
      kind: "person",
      title: "Engineering Manager",
      linkedinUrl: "https://www.linkedin.com/in/example-achen/",
      alumniUrl:
        "https://www.linkedin.com/school/example-university/people/?keywords=Alex%20Chen",
    },
    {
      id: "p-2",
      label: "Jordan Lee",
      kind: "person",
      title: "Senior Software Engineer",
      linkedinUrl: "https://www.linkedin.com/in/example-jlee/",
      alumniUrl:
        "https://www.linkedin.com/school/example-university/people/?keywords=Jordan%20Lee",
    },
    {
      id: "p-3",
      label: "Sam Rivera",
      kind: "person",
      title: "Product Designer",
      linkedinUrl: "https://www.linkedin.com/in/example-srivera/",
      alumniUrl: "",
    },
  ],
  edges: [
    { source: "me", target: "uni-1" },
    { source: "me", target: "co-1" },
    { source: "me", target: "co-2" },
    { source: "co-1", target: "p-1" },
    { source: "co-1", target: "p-2" },
    { source: "co-2", target: "p-3" },
  ],
};

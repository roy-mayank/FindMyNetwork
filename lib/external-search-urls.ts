/** LinkedIn company search (requires login for full results). */
export function linkedinCompanySearchUrl(companyName: string): string {
  const q = companyName.trim();
  const params = new URLSearchParams({ keywords: q });
  return `https://www.linkedin.com/search/results/companies/?${params.toString()}`;
}

/** CareerShift contacts search SPA route (query is not in URL—paste company after opening). */
export function careershiftContactsSearchUrl(): string {
  return "https://www.careershift.com/App/Contacts/Search#contacts_search_results";
}

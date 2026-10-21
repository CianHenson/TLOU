export interface AuthUser {
  id: number; emp_no: string; name: string; username: string; role: 'owner' | 'employee'; can_expenses: boolean; must_change_pw: boolean;
}

export interface Page<T> { rows: T[]; total: number; page: number; pages: number }

export interface Service { id: number; name: string; type: string; description: string; icon: string; active: number; sort: number }

// Site settings: the raw key/value map plus lists derived by the API.
export interface Settings {
  business_name: string; tagline: string; location: string; phone: string; mobile: string; email: string; address: string; hours: string;
  facebook: string; facebook_name: string; instagram: string; about: string; mission: string; vision: string; values: string;
  fares_title: string; fares_note: string; privacy: string; retention_years: string;
  phones: string;
  fareList: { route: string; from: string; to: string; cents: number }[];
  whyList: { t: string; d: string }[];
  partnerList: string[];
  [key: string]: unknown;
}

export interface FieldDef {
  k: string; label: string; type: string; options?: string[]; required?: boolean; min?: number; max?: number; when?: string;
}
export interface FormSchema {
  groups: Record<string, { types: string[]; fields: FieldDef[] }>;
  serviceTypes: string[];
  contactMethods: string[];
}

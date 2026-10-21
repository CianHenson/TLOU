import { useQuery } from '@tanstack/react-query';
import { get } from './api';
import type { FormSchema, Service, Settings } from './types';

export interface Site { settings: Settings; services: Service[] }

/** Public business settings + active services (name, contact details, fares, ...). */
export const useSite = () => useQuery({ queryKey: ['site'], queryFn: () => get<Site>('/public/site'), staleTime: 60_000 });

/** Field definitions for the travel request form. */
export const useFormSchema = () => useQuery({ queryKey: ['form-schema'], queryFn: () => get<FormSchema>('/public/form-schema'), staleTime: Infinity });

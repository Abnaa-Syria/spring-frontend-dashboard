import type { ServiceKind, ServicePriority, ServiceStatus } from '../../lib/labels';

export interface Address {
  id: number;
  label: string | null;
  governorate: string;
  city: string;
  area: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  details: string | null;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean;
}

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  altPhone: string | null;
  legacyCustomerId: string | null;
  userId: number | null;
  createdAt: string;
  addresses: { governorate: string; city: string; area: string | null }[];
  _count: { devices: number; serviceRequests: number; orders: number };
}

export interface CustomerDetail {
  id: number;
  name: string;
  phone: string;
  altPhone: string | null;
  legacyCustomerId: string | null;
  nationalIdLast4: string | null;
  loyaltyPoints: number;
  userId: number | null;
  createdAt: string;
  addresses: Address[];
  devices: {
    id: number;
    modelName: string;
    serialNumber: string | null;
    installedAt: string | null;
    nextMaintenanceAt: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'REPLACED';
    addressId: number | null;
    product: { id: number; nameAr: string; sku: string } | null;
    cartridges: { id: number; stage: number; installedAt: string; nextDueAt: string | null; product: { nameAr: string } | null }[];
  }[];
  orders: { id: number; number: string; status: string; total: string; createdAt: string }[];
  invoices: {
    id: number; number: string; status: 'ISSUED' | 'VOID'; total: string; issuedAt: string;
    serviceRequestId: number | null; orderId: number | null;
  }[];
  serviceRequests: {
    id: number;
    number: string;
    kind: ServiceKind;
    status: ServiceStatus;
    priority: ServicePriority;
    scheduledAt: string | null;
    createdAt: string;
    technician: { id: number; user: { name: string } } | null;
  }[];
}

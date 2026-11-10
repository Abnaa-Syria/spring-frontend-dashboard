import type {
  RequestSource, ServiceKind, ServicePriority, ServiceStatus, Specialization,
} from '../../lib/labels';

export interface ServiceRequestRow {
  id: number;
  number: string;
  kind: ServiceKind;
  priority: ServicePriority;
  source: RequestSource;
  status: ServiceStatus;
  preferredDate: string | null;
  preferredSlot: string | null;
  scheduledAt: string | null;
  createdAt: string;
  customer: { id: number; name: string; phone: string };
  address: { governorate: string; city: string; area: string | null };
  technician: { id: number; code: string; user: { name: string } } | null;
}

export interface ServiceRequestDetail extends Omit<ServiceRequestRow, 'address' | 'technician' | 'customer'> {
  description: string | null;
  cancelReason: string | null;
  serviceFee: string | null;
  invoice?: { id: number } | null;
  requiredSpecialization: Specialization;
  customer: { id: number; name: string; phone: string; altPhone: string | null };
  address: {
    id: number; governorate: string; city: string; area: string | null; street: string | null;
    building: string | null; floor: string | null; apartment: string | null; details: string | null;
    latitude: string | null; longitude: string | null;
  };
  device: { id: number; modelName: string; serialNumber: string | null; product: { nameAr: string } | null } | null;
  technician: { id: number; code: string; user: { name: string; phone: string | null } } | null;
  createdBy: { name: string } | null;
  attachments: { fileId: number; file: { mimeType: string; createdAt: string } }[];
  statusHistory: {
    id: number; fromStatus: ServiceStatus | null; toStatus: ServiceStatus; note: string | null;
    createdAt: string; changedBy: { name: string } | null;
  }[];
  assignments: {
    id: number; reason: string | null; assignedAt: string; unassignedAt: string | null;
    technician: { user: { name: string } }; assignedBy: { name: string };
  }[];
}

export interface EligibleTechnicians {
  specialization: Specialization;
  day: string;
  governorate: string;
  area: string | null;
  technicians: {
    id: number; code: string; name: string; phone: string | null; serviceArea: string | null;
    governorates: string[]; coversArea: boolean; coversExactArea: boolean;
    specializations: Specialization[]; openTasks: number; tasksThatDay: number;
    scheduleThatDay: { number: string; scheduledAt: string; kind: ServiceKind }[];
  }[];
}

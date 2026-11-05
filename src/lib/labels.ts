// Arabic labels and tag colors for API enums.

export type ServiceStatus =
  | 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ServiceKind = 'INSTALLATION' | 'PERIODIC_MAINTENANCE' | 'CARTRIDGE_REPLACEMENT' | 'FAULT_REPORT';
export type ServicePriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';
export type Specialization = 'INSTALLATION' | 'MAINTENANCE' | 'EMERGENCY';
export type ProductType = 'DEVICE' | 'CARTRIDGE' | 'SPARE_PART' | 'ACCESSORY';
export type RequestSource = 'CUSTOMER_APP' | 'OFFICE' | 'TECHNICIAN' | 'LEGACY_IMPORT';

type Labeled<K extends string> = Record<K, { label: string; color?: string }>;

export const SERVICE_STATUS: Labeled<ServiceStatus> = {
  PENDING: { label: 'جديد', color: 'default' },
  SCHEDULED: { label: 'مجدول', color: 'blue' },
  ASSIGNED: { label: 'تم التعيين', color: 'geekblue' },
  ON_THE_WAY: { label: 'في الطريق', color: 'cyan' },
  ARRIVED: { label: 'وصل', color: 'cyan' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: 'orange' },
  COMPLETED: { label: 'مكتمل', color: 'green' },
  CANCELLED: { label: 'ملغي', color: 'red' },
};

export const SERVICE_KIND: Labeled<ServiceKind> = {
  INSTALLATION: { label: 'تركيب فلتر جديد' },
  PERIODIC_MAINTENANCE: { label: 'صيانة دورية' },
  CARTRIDGE_REPLACEMENT: { label: 'تغيير شمعات' },
  FAULT_REPORT: { label: 'إبلاغ عن عطل' },
};

export const PRIORITY: Labeled<ServicePriority> = {
  NORMAL: { label: 'عادي', color: 'default' },
  URGENT: { label: 'عاجل', color: 'orange' },
  EMERGENCY: { label: 'طوارئ', color: 'red' },
};

export const SPECIALIZATION: Labeled<Specialization> = {
  INSTALLATION: { label: 'تركيبات', color: 'blue' },
  MAINTENANCE: { label: 'صيانة', color: 'green' },
  EMERGENCY: { label: 'طوارئ', color: 'red' },
};

export const PRODUCT_TYPE: Labeled<ProductType> = {
  DEVICE: { label: 'جهاز / فلتر' },
  CARTRIDGE: { label: 'شمعة' },
  SPARE_PART: { label: 'قطعة غيار' },
  ACCESSORY: { label: 'إكسسوار' },
};

export const SOURCE: Labeled<RequestSource> = {
  CUSTOMER_APP: { label: 'تطبيق العميل' },
  OFFICE: { label: 'المكتب' },
  TECHNICIAN: { label: 'فني' },
  LEGACY_IMPORT: { label: 'النظام القديم' },
};

export type MovementType = 'RECEIPT' | 'TRANSFER' | 'SALE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
export const MOVEMENT_TYPE: Labeled<MovementType> = {
  RECEIPT: { label: 'استلام من مورد', color: 'green' },
  TRANSFER: { label: 'تحويل / صرف عهدة', color: 'blue' },
  SALE: { label: 'بيع (فاتورة)', color: 'orange' },
  ADJUSTMENT_IN: { label: 'تسوية بالزيادة', color: 'cyan' },
  ADJUSTMENT_OUT: { label: 'تسوية بالنقص', color: 'red' },
};

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';
export const PAYMENT_METHOD: Labeled<PaymentMethod> = {
  CASH: { label: 'نقدي' },
  BANK_TRANSFER: { label: 'تحويل إلكتروني' },
  CARD: { label: 'بطاقة' },
};

export type PaymentStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';
export const PAYMENT_STATUS: Labeled<PaymentStatus> = {
  PENDING_VERIFICATION: { label: 'بانتظار التحقق', color: 'orange' },
  CONFIRMED: { label: 'مؤكد', color: 'green' },
  REJECTED: { label: 'مرفوض', color: 'red' },
};

export type HandoverStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export const HANDOVER_STATUS: Labeled<HandoverStatus> = {
  SUBMITTED: { label: 'بانتظار المراجعة', color: 'orange' },
  APPROVED: { label: 'تم الاستلام', color: 'green' },
  REJECTED: { label: 'مرفوض', color: 'red' },
};

export const options =<K extends string>(m: Labeled<K>) =>
  (Object.keys(m) as K[]).map((value) => ({ value, label: m[value].label }));

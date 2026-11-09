import { App, Col, Form, Input, Row, Select } from 'antd';
import { LocationPicker, toLatLng, type LatLng } from '../../components/LocationMap';
import { api, errorMessage } from '../../lib/api';
import { EGYPT_GOVERNORATES } from '../../lib/governorates';

interface Reverse { governorate: string | null; city: string | null; area: string | null; street: string | null }

/** Address inputs with a map pin; pass `prefix` when nested inside a larger form. */
export function AddressFields({ prefix }: { prefix?: string }) {
  const n = (k: string) => (prefix ? [prefix, k] : k);
  const req = [{ required: true, message: 'مطلوب' }];
  const form = Form.useFormInstance();
  const { message } = App.useApp();
  const lat = Form.useWatch(n('latitude'), form);
  const lng = Form.useWatch(n('longitude'), form);
  const governorate = Form.useWatch(n('governorate'), form) as string | undefined;
  const point = toLatLng(lat, lng);

  const setPoint = (p: LatLng | null) => {
    form.setFieldValue(n('latitude'), p ? Number(p.lat.toFixed(7)) : null);
    form.setFieldValue(n('longitude'), p ? Number(p.lng.toFixed(7)) : null);
  };

  /** Fills only the empty fields, so nothing the user typed gets overwritten. */
  const fillFromMap = async (p: LatLng) => {
    try {
      const { data } = await api.get<Reverse>('/geo/reverse', { params: { lat: p.lat, lng: p.lng } });
      let filled = 0;
      for (const k of ['governorate', 'city', 'area', 'street'] as const) {
        if (data[k] && !form.getFieldValue(n(k))) { form.setFieldValue(n(k), data[k]); filled++; }
      }
      if (filled) message.success('اتملت بيانات العنوان من الخريطة، راجعها');
      else message.info('الخانات مليانة بالفعل، أو مفيش بيانات إضافية للمكان ده');
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  // Keeps a legacy free-text governorate selectable until it's corrected.
  const options = [...EGYPT_GOVERNORATES, ...(governorate && !EGYPT_GOVERNORATES.includes(governorate) ? [governorate] : [])]
    .map((g) => ({ value: g, label: g }));

  return (
    <Row gutter={12}>
      <Col xs={12} md={8}>
        <Form.Item name={n('governorate')} label="المحافظة" rules={req}>
          <Select showSearch options={options} placeholder="اختر المحافظة" optionFilterProp="label" />
        </Form.Item>
      </Col>
      <Col xs={12} md={8}><Form.Item name={n('city')} label="المدينة / الحي" rules={req}><Input /></Form.Item></Col>
      <Col xs={24} md={8}><Form.Item name={n('area')} label="المنطقة"><Input /></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item name={n('street')} label="الشارع"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('building')} label="العقار"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('floor')} label="الدور"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('apartment')} label="الشقة"><Input /></Form.Item></Col>
      <Col span={24}><Form.Item name={n('details')} label="علامة مميزة / تفاصيل"><Input /></Form.Item></Col>
      <Col span={24}>
        <Form.Item label="الموقع على الخريطة" extra="بيظهر للفني في التطبيق ويفتح معاه الملاحة مباشرة">
          <LocationPicker value={point} onChange={setPoint} onFillAddress={fillFromMap} />
        </Form.Item>
        <Form.Item name={n('latitude')} hidden><Input /></Form.Item>
        <Form.Item name={n('longitude')} hidden><Input /></Form.Item>
      </Col>
    </Row>
  );
}

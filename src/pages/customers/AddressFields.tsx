import { Col, Form, Input, Row } from 'antd';

/** Address inputs; pass `prefix` when nested inside a larger form. */
export function AddressFields({ prefix }: { prefix?: string }) {
  const n = (k: string) => (prefix ? [prefix, k] : k);
  const req = [{ required: true, message: 'مطلوب' }];
  return (
    <Row gutter={12}>
      <Col xs={12} md={8}><Form.Item name={n('governorate')} label="المحافظة" rules={req}><Input /></Form.Item></Col>
      <Col xs={12} md={8}><Form.Item name={n('city')} label="المدينة / الحي" rules={req}><Input /></Form.Item></Col>
      <Col xs={24} md={8}><Form.Item name={n('area')} label="المنطقة"><Input /></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item name={n('street')} label="الشارع"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('building')} label="العقار"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('floor')} label="الدور"><Input /></Form.Item></Col>
      <Col xs={8} md={4}><Form.Item name={n('apartment')} label="الشقة"><Input /></Form.Item></Col>
      <Col span={24}><Form.Item name={n('details')} label="علامة مميزة / تفاصيل"><Input /></Form.Item></Col>
    </Row>
  );
}

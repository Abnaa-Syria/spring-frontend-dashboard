import { CopyOutlined, ExportOutlined, UndoOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Col, Flex, Input, Popconfirm, Row, Segmented, Skeleton, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';

type Doc = 'terms' | 'privacy';
interface LegalSource { doc: Doc; title: string; body: string; updatedAt: string | null; isDefault: boolean }

const PUBLIC_BASE = api.defaults.baseURL ?? '';
const LINKS = [
  { label: 'الشروط والأحكام', url: `${PUBLIC_BASE}/legal/terms/page` },
  { label: 'سياسة الخصوصية', url: `${PUBLIC_BASE}/legal/privacy/page` },
  { label: 'صفحة حذف الحساب', url: `${PUBLIC_BASE}/legal/delete-account/page` },
];

/** Terms & privacy editor plus the public links the store listings need. */
export function LegalTab() {
  const [doc, setDoc] = useState<Doc>('terms');
  const { message } = App.useApp();

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={16}>
        <Segmented<Doc>
          value={doc}
          onChange={setDoc}
          options={[{ value: 'terms', label: 'الشروط والأحكام' }, { value: 'privacy', label: 'سياسة الخصوصية' }]}
          style={{ marginBottom: 16 }}
        />
        <Editor key={doc} doc={doc} />
      </Col>
      <Col xs={24} xl={8}>
        <Card size="small" title="الروابط العامة (للمتاجر)">
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            جوجل بلاي وآب ستور بيطلبوا رابط لسياسة الخصوصية ورابط لطريقة حذف الحساب. انسخ الروابط دي وحطها في صفحة التطبيق على المتجر.
          </Typography.Paragraph>
          <Flex vertical gap={12}>
            {LINKS.map((l) => (
              <div key={l.url}>
                <Typography.Text strong>{l.label}</Typography.Text>
                <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                  <Input value={l.url} readOnly dir="ltr" size="small" style={{ textAlign: 'left' }} onFocus={(e) => e.target.select()} />
                  <Button size="small" icon={<CopyOutlined />} aria-label="نسخ" onClick={() => navigator.clipboard.writeText(l.url).then(() => message.success('تم النسخ'))} />
                  <Button size="small" icon={<ExportOutlined />} aria-label="فتح" href={l.url} target="_blank" />
                </Space.Compact>
              </div>
            ))}
          </Flex>
        </Card>
      </Col>
    </Row>
  );
}

function Editor({ doc }: { doc: Doc }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['legal', doc],
    queryFn: async () => (await api.get<LegalSource>(`/legal/${doc}/source`)).data,
  });
  const [text, setText] = useState('');
  useEffect(() => { if (data) setText(data.body); }, [data]);

  const save = useMutation({
    mutationFn: (body: string) => api.put<LegalSource>(`/legal/${doc}`, { body }),
    onSuccess: ({ data: d }, body) => {
      message.success(body ? 'تم الحفظ، وظهر في التطبيق' : 'تم استرجاع النص الافتراضي');
      qc.setQueryData(['legal', doc], d);
      setText(d.body);
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !data) return <Skeleton active />;
  const dirty = text !== data.body;

  return (
    <Flex vertical gap={12}>
      <Flex gap={8} align="center" wrap>
        {data.isDefault ? <Tag>النص الافتراضي</Tag> : <Tag color="blue">نص معدّل</Tag>}
        {data.updatedAt && <Typography.Text type="secondary" style={{ fontSize: 12 }}>آخر تحديث: {fmtDateTime(data.updatedAt)}</Typography.Text>}
      </Flex>
      <Alert
        type="info"
        showIcon
        title="طريقة الكتابة"
        description={
          <>
            السطر اللي يبدأ بـ <code>## </code> عنوان، واللي يبدأ بـ <code>- </code> نقطة في قائمة، وسيب سطر فاضي بين الفقرات.
            {' '}<code>{'{{company}}'}</code> و<code>{'{{phone}}'}</code> و<code>{'{{whatsapp}}'}</code> و<code>{'{{email}}'}</code> بيتبدلوا تلقائياً ببيانات الشركة من "إعدادات النظام".
          </>
        }
      />
      <Input.TextArea value={text} onChange={(e) => setText(e.target.value)} autoSize={{ minRows: 18, maxRows: 40 }} maxLength={50_000} showCount style={{ lineHeight: 1.9 }} />
      <Flex gap={8} wrap>
        <Button type="primary" disabled={!dirty || !text.trim()} loading={save.isPending} onClick={() => save.mutate(text)}>حفظ</Button>
        <Button disabled={!dirty} onClick={() => setText(data.body)}>تجاهل التعديلات</Button>
        <Button href={`${PUBLIC_BASE}/legal/${doc}/page`} target="_blank" icon={<ExportOutlined />}>معاينة</Button>
        {!data.isDefault && (
          <Popconfirm title="استرجاع النص الافتراضي؟" description="هيتمسح النص المعدّل" okText="استرجاع" cancelText="رجوع" onConfirm={() => save.mutate('')}>
            <Button icon={<UndoOutlined />} danger>استرجاع النص الافتراضي</Button>
          </Popconfirm>
        )}
      </Flex>
    </Flex>
  );
}

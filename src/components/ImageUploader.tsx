import { PlusOutlined } from '@ant-design/icons';
import { App, Upload, type UploadFile } from 'antd';
import { api, errorMessage } from '../lib/api';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_MB = 5;

/** Product images: uploads each file to the API and exposes the list of public URLs as the form value. */
export function ImageUploader({ value = [], onChange, max = 6 }: {
  value?: string[];
  onChange?: (urls: string[]) => void;
  max?: number;
}) {
  const { message } = App.useApp();
  const fileList: UploadFile[] = value.map((url, i) => ({ uid: `${i}-${url}`, name: url.split('/').pop() ?? url, status: 'done', url }));

  return (
    <Upload
      listType="picture-card"
      accept={ACCEPT}
      multiple
      fileList={fileList}
      onRemove={(f) => onChange?.(value.filter((u) => u !== f.url))}
      beforeUpload={(file) => {
        if (file.size > MAX_MB * 1024 * 1024) {
          message.error(`الحد الأقصى ${MAX_MB} ميجا للصورة`);
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={async ({ file, onSuccess, onError }) => {
        const form = new FormData();
        form.append('file', file as Blob);
        form.append('purpose', 'product-image');
        try {
          const { data } = await api.post<{ url: string }>('/files', form);
          onChange?.([...value, data.url]);
          onSuccess?.(data);
        } catch (e) {
          message.error(errorMessage(e));
          onError?.(e as Error);
        }
      }}
    >
      {value.length >= max ? null : (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>رفع صورة</div>
        </div>
      )}
    </Upload>
  );
}

import { FileImageOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Image, Skeleton } from 'antd';
import { api, errorMessage } from '../lib/api';

interface SignedUrl { url: string; expiresAt: string | null }

const fetchUrl = async (id: number) => (await api.get<SignedUrl>(`/files/${id}/url`)).data.url;

/** Opens a private file (e.g. a transfer receipt) through a short-lived signed URL. */
export function FileButton({ fileId, label = 'عرض الإيصال' }: { fileId: number; label?: string }) {
  const { message } = App.useApp();
  return (
    <Button
      size="small"
      icon={<FileImageOutlined />}
      onClick={async () => {
        // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
        const tab = window.open('about:blank', '_blank');
        try {
          const url = await fetchUrl(fileId);
          if (tab) tab.location.href = url;
          else window.location.href = url;
        } catch (e) {
          tab?.close();
          message.error(errorMessage(e));
        }
      }}
    >
      {label}
    </Button>
  );
}

/** Thumbnail for a private image; the signed URL is refreshed before it expires. */
export function PrivateImage({ fileId, size = 96 }: { fileId: number; size?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['file-url', fileId],
    queryFn: () => fetchUrl(fileId),
    staleTime: 8 * 60_000,
  });
  if (isLoading || !data) return <Skeleton.Image active style={{ width: size, height: size }} />;
  return <Image src={data} width={size} height={size} style={{ objectFit: 'cover', borderRadius: 8 }} />;
}

import { useState } from 'react';
import { resumeApi } from '../api/resume';
import { getErrorMessage } from '../api/request';
import FileUploadCard from '../components/FileUploadCard';

interface UploadPageProps {
  onUploadComplete: (resumeId: number) => void;
}

export default function UploadPage({ onUploadComplete }: UploadPageProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const data = await resumeApi.uploadAndAnalyze(file);

      // 异步模式：只检查上传是否成功（storage 信息）
      if (!data.storage || !data.storage.resumeId) {
        throw new Error('上传失败，请重试');
      }

      // 上传成功，跳转到档案看板（分析在后台进行）
      onUploadComplete(data.storage.resumeId);
    } catch (err) {
      setError(getErrorMessage(err));
      setUploading(false);
    }
  };

  return (
    <FileUploadCard
      title="导入一份候选人档案，生成专属追问地图"
      subtitle="Interview OL 会抽取履历信号、项目线索和风险点，为后续演练准备更贴近真实面试的追问路径。"
      accept=".pdf,.doc,.docx,.txt"
      formatHint="支持 PDF, DOCX, TXT"
      maxSizeHint="最大 20MB"
      uploading={uploading}
      uploadButtonText="生成档案"
      error={error}
      onUpload={handleUpload}
    />
  );
}

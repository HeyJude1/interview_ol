import { useState } from 'react';
import { knowledgeBaseApi } from '../api/knowledgebase';
import type { UploadKnowledgeBaseResponse } from '../api/knowledgebase';
import FileUploadCard from '../components/FileUploadCard';

interface KnowledgeBaseUploadPageProps {
  onUploadComplete: (result: UploadKnowledgeBaseResponse) => void;
  onBack: () => void;
}

export default function KnowledgeBaseUploadPage({ onUploadComplete, onBack }: KnowledgeBaseUploadPageProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File, name?: string) => {
    setUploading(true);
    setError('');

    try {
      const data = await knowledgeBaseApi.uploadKnowledgeBase(file, name);
      onUploadComplete(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '上传失败，请重试';
      setError(errorMessage);
      setUploading(false);
    }
  };

  return (
    <FileUploadCard
      title="导入资料源"
      subtitle="上传技术文档、项目材料或面试题库，后续检索陪练会基于这些资料回答"
      accept=".pdf,.doc,.docx,.txt,.md"
      formatHint="支持 PDF、DOCX、DOC、TXT、MD"
      maxSizeHint="最大 50MB"
      uploading={uploading}
      uploadButtonText="开始上传"
      selectButtonText="选择资料"
      deckKicker="Knowledge Intake Deck"
      workflowSteps={[
        ['01', '选择资料', '导入文档原件'],
        ['02', '构建索引', '异步生成向量'],
        ['03', '进入实验台', '用于检索陪练'],
      ]}
      queueDescription="将资料源先放入索引队列，再从右侧启动上传和向量化任务。"
      currentFileHint="通过选择资料按钮装载参考材料"
      emptyStateDescription="使用右上角的选择资料按钮添加本地文档，装载后会在这里显示待索引任务。"
      routeTitle="索引路线"
      routeExitHint="完成后进入知识库资料架"
      launchDescription="文件装载后即可入库，向量索引会在后台继续构建。"
      showNameInput={true}
      nameLabel="资料源名称（可选）"
      namePlaceholder="留空则使用文件名"
      error={error}
      onUpload={handleUpload}
      onBack={onBack}
    />
  );
}

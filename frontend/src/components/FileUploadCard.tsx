import {ChangeEvent, useCallback, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Play,
  Route,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

export interface FileUploadCardProps {
  /** 标题 */
  title: string;
  /** 副标题 */
  subtitle: string;
  /** 接受的文件类型 */
  accept: string;
  /** 支持的格式说明 */
  formatHint: string;
  /** 最大文件大小说明 */
  maxSizeHint: string;
  /** 是否正在上传 */
  uploading?: boolean;
  /** 上传按钮文字 */
  uploadButtonText?: string;
  /** 选择按钮文字 */
  selectButtonText?: string;
  /** 顶部流程区标识 */
  deckKicker?: string;
  /** 上传流程步骤 */
  workflowSteps?: Array<[string, string, string]>;
  /** 导入队列说明 */
  queueDescription?: string;
  /** 当前文件说明 */
  currentFileHint?: string;
  /** 空状态说明 */
  emptyStateDescription?: string;
  /** 路由检查标题 */
  routeTitle?: string;
  /** 任务完成出口 */
  routeExitHint?: string;
  /** 启动面板说明 */
  launchDescription?: string;
  /** 是否显示名称输入框 */
  showNameInput?: boolean;
  /** 名称输入框占位符 */
  namePlaceholder?: string;
  /** 名称输入框标签 */
  nameLabel?: string;
  /** 错误信息 */
  error?: string;
  /** 文件选择回调 */
  onFileSelect?: (file: File) => void;
  /** 上传回调 */
  onUpload: (file: File, name?: string) => void;
  /** 返回回调 */
  onBack?: () => void;
}

export default function FileUploadCard({
  title,
  subtitle,
  accept,
  formatHint,
  maxSizeHint,
  uploading = false,
  uploadButtonText = '开始上传',
  selectButtonText = '上传文件',
  deckKicker = 'Resume Command Deck',
  workflowSteps = [
    ['01', '装载材料', '导入简历原件'],
    ['02', '后台解析', '抽取履历信号'],
    ['03', '看板追踪', '进入档案视图'],
  ],
  queueDescription = '将候选材料先装入队列，再从右侧启动解析任务。',
  currentFileHint = '通过上传按钮装载候选材料',
  emptyStateDescription = '使用右上角的上传文件按钮选择本地材料，装载后会在这里显示待解析任务。',
  routeTitle = '解析路线',
  routeExitHint = '完成后进入档案看板',
  launchDescription = '文件装载后即可生成档案，解析会在后台继续执行。',
  showNameInput = false,
  namePlaceholder = '留空则使用文件名',
  nameLabel = '名称（可选）',
  error,
  onFileSelect,
  onUpload,
  onBack,
}: FileUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect?.(files[0]);
    }
  }, [onFileSelect]);

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, name.trim() || undefined);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const openFilePicker = () => {
    document.getElementById('file-upload-input')?.click();
  };

  return (
    <motion.div
      className="mx-auto max-w-[1440px] pt-4 xl:pt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <section className="relative overflow-hidden rounded-[2.4rem] border border-slate-950 bg-slate-950 p-7 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] dark:border-white/10 md:p-9 xl:p-10">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/80 to-transparent" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="page-kicker text-primary-300">{deckKicker}</p>
            <motion.h1
              className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight md:text-5xl xl:text-[3.35rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {title}
            </motion.h1>
            <motion.p
              className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {workflowSteps.map(([step, label, hint]) => (
              <div key={step} className="grid min-h-[92px] grid-cols-[52px_minmax(0,1fr)] items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/6 px-5 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-300 text-sm font-black text-slate-950">
                  {step}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black text-white">{label}</div>
                  <div className="mt-1 text-sm text-slate-300">{hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <motion.div
          className="app-card relative min-h-[520px] overflow-hidden p-0 transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <input
            type="file"
            id="file-upload-input"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
          />

          <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col p-7 md:p-9">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="page-kicker">Intake Queue</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
                    导入队列
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                    {queueDescription}
                  </p>
                </div>
                <button
                  className="flex min-h-[56px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 font-black text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-primary-100"
                  onClick={openFilePicker}
                  disabled={uploading}
                >
                  <Upload className="h-5 w-5" />
                  {selectButtonText}
                </button>
              </div>

              <div className="mt-8 flex flex-1 flex-col rounded-[1.8rem] border border-slate-200 bg-slate-50/80 transition-all dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm dark:bg-slate-950 dark:text-primary-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">当前文件</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{currentFileHint}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    selectedFile
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  }`}>
                    {selectedFile ? 'READY' : 'EMPTY'}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {selectedFile ? (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="grid flex-1 gap-6 p-6 md:grid-cols-[96px_minmax(0,1fr)_44px] md:items-center"
                    >
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        <FileText className="h-11 w-11" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-2xl font-black text-slate-950 dark:text-white">{selectedFile.name}</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="rounded-2xl bg-white px-4 py-2 shadow-sm dark:bg-slate-950/60">
                            {formatFileSize(selectedFile.size)}
                          </span>
                          <span className="rounded-2xl bg-white px-4 py-2 shadow-sm dark:bg-slate-950/60">
                            已装载，等待解析
                          </span>
                        </div>
                      </div>
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        onClick={() => setSelectedFile(null)}
                        disabled={uploading}
                        title="移除文件"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-file"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex flex-1 items-center p-6"
                    >
                      <div className="w-full rounded-[1.6rem] border border-slate-200 bg-white/70 p-8 dark:border-white/15 dark:bg-slate-950/30">
                        <p className="text-2xl font-black text-slate-950 dark:text-white">等待装载材料</p>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-400">
                          {emptyStateDescription}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <aside className="border-t border-slate-200/80 bg-slate-950 p-7 text-white lg:border-l lg:border-t-0 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-primary-300">Route Check</p>
              <h3 className="mt-3 text-2xl font-black">{routeTitle}</h3>
              <div className="mt-6 space-y-4">
                {[
                  ['文件格式', formatHint, ShieldCheck],
                  ['容量限制', maxSizeHint, CheckCircle2],
                  ['任务出口', routeExitHint, Route],
                ].map(([label, value, Icon]) => (
                  <div key={label as string} className="flex gap-3 rounded-2xl border border-white/10 bg-white/6 p-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-300" />
                    <div>
                      <p className="text-sm font-black text-white">{label as string}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{value as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </motion.div>

        <motion.aside
          className="app-card flex min-h-[520px] flex-col justify-between p-7 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div>
            <p className="page-kicker">Launch Panel</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              启动面板
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">
              {launchDescription}
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-black text-slate-950 dark:text-white">任务状态</p>
              <div className="mt-4 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${selectedFile ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? '已准备解析' : '等待文件'}
                </span>
              </div>
            </div>

            {showNameInput && selectedFile && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{nameLabel}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  className="app-input w-full rounded-2xl px-4 py-3"
                  disabled={uploading}
                />
              </motion.div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 space-y-4">
            <motion.button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="app-button-primary flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black disabled:cursor-not-allowed disabled:opacity-50"
              whileTap={{ scale: uploading || !selectedFile ? 1 : 0.98 }}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {uploadButtonText}
                </>
              )}
            </motion.button>

            {onBack && (
              <motion.button
                onClick={onBack}
                className="app-button-secondary w-full rounded-2xl px-6 py-3 font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                返回
              </motion.button>
            )}
          </div>
        </motion.aside>
      </section>
    </motion.div>
  );
}

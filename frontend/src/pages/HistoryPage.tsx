import {useEffect, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {historyApi, ResumeListItem} from '../api/history';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import {formatDateOnly} from '../utils/date';
import {getScoreProgressColor} from '../utils/score';
import {ChevronRight, FileText, LibraryBig, Search, Trash2} from 'lucide-react';

interface HistoryListProps {
  onSelectResume: (id: number) => void;
}

export default function HistoryList({ onSelectResume }: HistoryListProps) {
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; filename: string } | null>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const data = await historyApi.getResumes();
      setResumes(data);
    } catch (err) {
      console.error('加载历史记录失败', err);
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteClick = (id: number, filename: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发行点击事件
    setDeleteConfirm({ id, filename });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    setDeletingId(id);
    try {
      await historyApi.deleteResume(id);
      // 重新加载列表
      await loadResumes();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredResumes = resumes.filter(resume =>
    resume.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* 头部 */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="page-kicker mb-3">Resume Library</p>
            <motion.h1
                className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-400 dark:text-slate-950">
              <LibraryBig className="h-6 w-6" />
            </span>
            档案看板
          </motion.h1>
            <motion.p
                className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            按候选材料追踪诊断状态、评分信号和后续演练
          </motion.p>
        </div>

          <motion.div
              className="app-input flex min-w-[280px] items-center gap-3 rounded-2xl px-4 py-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索档案..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        </motion.div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-20">
            <motion.div
                className="w-10 h-10 border-3 border-slate-200 dark:text-slate-200 border-t-primary-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
            <p className="text-slate-500 dark:text-slate-400">加载中...</p>
        </div>
      )}

      {/* 空状态 */}
      {!loading && filteredResumes.length === 0 && (
          <motion.div
              className="app-card py-20 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FileText className="mx-auto mb-6 h-16 w-16 text-primary-500" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">暂无候选档案</h3>
              <p className="text-slate-500 dark:text-slate-400">导入材料后，这里会生成第一份诊断档案</p>
        </motion.div>
      )}

      {/* 档案卡片流 */}
      {!loading && filteredResumes.length > 0 && (
        <motion.div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence>
            {filteredResumes.map((resume, index) => (
              <motion.article
                key={resume.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onSelectResume(resume.id)}
                className="group relative cursor-pointer overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/86 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.13)] dark:border-white/10 dark:bg-slate-900/70"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-amber-400 to-slate-950 dark:to-white/60" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-400 dark:text-slate-950">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{resume.filename}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">导入于 {formatDateOnly(resume.uploadedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(resume.id, resume.filename, e)}
                    disabled={deletingId === resume.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                    title="删除档案"
                  >
                    {deletingId === resume.id ? (
                      <motion.div
                        className="h-5 w-5 rounded-full border-2 border-red-500 border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Score</p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-3xl font-black text-slate-950 dark:text-white">
                        {resume.latestScore ?? '--'}
                      </span>
                      <span className="pb-1 text-xs text-slate-400">/100</span>
                    </div>
                    {resume.latestScore !== undefined && (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <motion.div
                          className={`h-full rounded-full ${getScoreProgressColor(resume.latestScore)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${resume.latestScore}%` }}
                          transition={{ duration: 0.7, delay: index * 0.04 }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-4 text-white dark:bg-primary-400 dark:text-slate-950">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">Drill</p>
                    <p className="mt-2 text-2xl font-black">{resume.interviewCount}</p>
                    <p className="mt-1 text-xs opacity-70">演练批次</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  {resume.interviewCount > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">已进入演练</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">待演练</span>
                  )}
                  <span className="flex items-center gap-1 text-sm font-bold text-primary-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-300">
                    查看档案 <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

          {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteConfirm !== null}
        item={deleteConfirm}
        itemType="档案"
        loading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        customMessage={
          deleteConfirm ? (
            <>
              <p className="mb-2">确定要删除档案 <strong>"{deleteConfirm.filename}"</strong> 吗？</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">删除后将同时删除：</p>
                <ul className="text-sm text-slate-500 dark:text-red-400 list-disc list-inside mb-2">
                <li>能力诊断记录</li>
                <li>所有模拟演练记录</li>
              </ul>
              <p className="text-sm font-semibold text-red-600">此操作不可恢复！</p>
            </>
          ) : undefined
        }
      />
    </motion.div>
  );
}

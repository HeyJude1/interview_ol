import {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {EvaluateStatus, historyApi, InterviewItem} from '../api/history';
import {formatDate} from '../utils/date';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

interface InterviewHistoryPageProps {
  onBack: () => void;
  onViewInterview: (sessionId: string, resumeId?: number) => void;
}

interface InterviewWithResume extends InterviewItem {
  resumeId: number;
  resumeFilename: string;
  evaluateStatus?: EvaluateStatus;
  evaluateError?: string;
}

interface InterviewStats {
  totalCount: number;
  completedCount: number;
  averageScore: number;
}

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-card p-6"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {value}{suffix &&
                <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// 判断是否为已完成状态（包括 COMPLETED 和 EVALUATED）
function isCompletedStatus(status: string): boolean {
  return status === 'COMPLETED' || status === 'EVALUATED';
}

// 判断评估是否完成
function isEvaluateCompleted(interview: InterviewWithResume): boolean {
  // 如果 evaluateStatus 存在且为 COMPLETED，则评估已完成
  if (interview.evaluateStatus === 'COMPLETED') return true;
  // 向后兼容：如果 status 为 EVALUATED，也认为评估已完成
  if (interview.status === 'EVALUATED') return true;
  return false;
}

// 判断是否正在评估中
function isEvaluating(interview: InterviewWithResume): boolean {
  return interview.evaluateStatus === 'PENDING' || interview.evaluateStatus === 'PROCESSING';
}

// 判断评估是否失败
function isEvaluateFailed(interview: InterviewWithResume): boolean {
  return interview.evaluateStatus === 'FAILED';
}

// 状态图标
function StatusIcon({ interview }: { interview: InterviewWithResume }) {
  // 评估失败
  if (isEvaluateFailed(interview)) {
      return <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400"/>;
  }
  // 正在评估
  if (isEvaluating(interview)) {
      return <RefreshCw className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin"/>;
  }
  // 评估完成
  if (isEvaluateCompleted(interview)) {
      return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400"/>;
  }
  // 面试进行中
  if (interview.status === 'IN_PROGRESS') {
      return <PlayCircle className="w-4 h-4 text-blue-500 dark:text-blue-400"/>;
  }
  // 面试已完成但评估未开始
  if (isCompletedStatus(interview.status)) {
      return <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-400"/>;
  }
  // 已创建
    return <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-400"/>;
}

// 状态文本
function getStatusText(interview: InterviewWithResume): string {
  // 评估失败
  if (isEvaluateFailed(interview)) {
    return '评估失败';
  }
  // 正在评估
  if (isEvaluating(interview)) {
    return interview.evaluateStatus === 'PROCESSING' ? '评估中' : '等待评估';
  }
  // 评估完成
  if (isEvaluateCompleted(interview)) {
    return '已完成';
  }
  // 面试进行中
  if (interview.status === 'IN_PROGRESS') {
    return '进行中';
  }
  // 面试已完成但评估未开始
  if (isCompletedStatus(interview.status)) {
    return '已提交';
  }
  return '已创建';
}

// 获取分数颜色
function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function InterviewHistoryPage({ onBack: _onBack, onViewInterview }: InterviewHistoryPageProps) {
  const [interviews, setInterviews] = useState<InterviewWithResume[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<InterviewWithResume | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const loadAllInterviews = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      setLoading(true);
    }
    try {
      const resumes = await historyApi.getResumes();
      const allInterviews: InterviewWithResume[] = [];

      for (const resume of resumes) {
        const detail = await historyApi.getResumeDetail(resume.id);
        if (detail.interviews && detail.interviews.length > 0) {
          detail.interviews.forEach(interview => {
            allInterviews.push({
              ...interview,
              resumeId: resume.id,
              resumeFilename: resume.filename
            });
          });
        }
      }

      // 按创建时间倒序排序
      allInterviews.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setInterviews(allInterviews);

      // 计算统计信息（只统计评估已完成的面试）
      const evaluated = allInterviews.filter(i => isEvaluateCompleted(i));
      const totalScore = evaluated.reduce((sum, i) => sum + (i.overallScore || 0), 0);
      setStats({
        totalCount: allInterviews.length,
        completedCount: evaluated.length,
        averageScore: evaluated.length > 0 ? Math.round(totalScore / evaluated.length) : 0,
      });
    } catch (err) {
      console.error('加载演练复盘失败', err);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadAllInterviews();
  }, [loadAllInterviews]);

  // 轮询检查评估状态
  useEffect(() => {
    // 检查是否有正在评估的面试
    const hasEvaluating = interviews.some(i => isEvaluating(i));

    if (hasEvaluating) {
      // 启动轮询
      pollingRef.current = window.setInterval(() => {
        loadAllInterviews(true);
      }, 3000); // 每3秒轮询一次
    } else {
      // 停止轮询
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [interviews, loadAllInterviews]);

  const handleDeleteClick = (interview: InterviewWithResume, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItem(interview);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    setDeletingSessionId(deleteItem.sessionId);
    try {
      await historyApi.deleteInterview(deleteItem.sessionId);
      await loadAllInterviews();
      setDeleteItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败，请稍后重试');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleExport = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(sessionId);
    try {
      const blob = await historyApi.exportInterviewPdf(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `面试报告_${sessionId.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.resumeFilename.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p className="page-kicker mb-3">Mock Sessions</p>
          <motion.h1
              className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-400 dark:text-slate-950">
              <Users className="h-6 w-6" />
            </span>
            演练复盘
          </motion.h1>
          <motion.p
              className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            汇总每一次模拟演练、评估进度和可导出的复盘报告
          </motion.p>
        </div>

        <motion.div
            className="app-input flex min-w-[280px] items-center gap-3 rounded-2xl px-4 py-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索档案名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent"
          />
        </motion.div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="演练总数"
            value={stats.totalCount}
            color="bg-primary-500"
          />
          <StatCard
            icon={CheckCircle}
            label="已完成"
            value={stats.completedCount}
            color="bg-emerald-500"
          />
          <StatCard
            icon={TrendingUp}
            label="平均分数"
            value={stats.averageScore}
            suffix="分"
            color="bg-indigo-500"
          />
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && filteredInterviews.length === 0 && (
        <motion.div
            className="app-card py-20 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"/>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">暂无演练记录</h3>
            <p className="text-slate-500 dark:text-slate-400">完成一次模拟演练后，复盘报告会出现在这里</p>
        </motion.div>
      )}

      {/* 复盘卡片墙 */}
      {!loading && filteredInterviews.length > 0 && (
        <motion.div
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence>
            {filteredInterviews.map((interview, index) => (
              <motion.article
                key={interview.sessionId}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onViewInterview(interview.sessionId, interview.resumeId)}
                className="group relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/86 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.13)] dark:border-white/10 dark:bg-slate-900/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-400 dark:text-slate-950">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{interview.resumeFilename}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        #{interview.sessionId.slice(-8)} · {formatDate(interview.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 dark:bg-white/5">
                    <StatusIcon interview={interview} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{getStatusText(interview)}</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">题量</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{interview.totalQuestions}</p>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-slate-950 p-4 text-white dark:bg-primary-400 dark:text-slate-950">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">Score</p>
                    {isEvaluateCompleted(interview) && interview.overallScore !== null ? (
                      <>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-4xl font-black">{interview.overallScore}</span>
                          <span className="pb-1 text-xs opacity-70">/100</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20 dark:bg-slate-950/20">
                          <motion.div
                            className={`h-full rounded-full ${getScoreColor(interview.overallScore)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${interview.overallScore}%` }}
                            transition={{ duration: 0.8, delay: index * 0.04 }}
                          />
                        </div>
                      </>
                    ) : isEvaluating(interview) ? (
                      <p className="mt-3 text-sm font-bold">报告生成中</p>
                    ) : isEvaluateFailed(interview) ? (
                      <p className="mt-3 text-sm font-bold text-red-200" title={interview.evaluateError}>评估失败</p>
                    ) : (
                      <p className="mt-3 text-sm font-bold opacity-70">暂无评分</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">点击查看完整复盘</span>
                  <div className="flex items-center gap-1">
                    {isEvaluateCompleted(interview) && (
                      <button
                        onClick={(e) => handleExport(interview.sessionId, e)}
                        disabled={exporting === interview.sessionId}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30"
                        title="导出PDF"
                      >
                        {exporting === interview.sessionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteClick(interview, e)}
                      disabled={deletingSessionId === interview.sessionId}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-primary-600 dark:text-slate-600" />
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteItem !== null}
        item={deleteItem ? { id: deleteItem.id, sessionId: deleteItem.sessionId } : null}
        itemType="演练记录"
        loading={deletingSessionId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
      />
    </motion.div>
  );
}

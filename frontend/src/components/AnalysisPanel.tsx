import {useMemo} from 'react';
import {motion} from 'framer-motion';
import {formatDateTime} from '../utils/date';
import {AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, TrendingUp,} from 'lucide-react';
import type {AnalyzeStatus} from '../api/history';

interface AnalysisPanelProps {
  analysis: any;
  analyzeStatus?: AnalyzeStatus;
  analyzeError?: string;
  onExport: () => void;
  exporting: boolean;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
}

/**
 * 简历分析面板组件
 */
export default function AnalysisPanel({
  analysis,
  analyzeStatus,
  analyzeError,
  onExport,
  exporting,
  onReanalyze,
  reanalyzing,
}: AnalysisPanelProps) {
  // 准备雷达图数据
  const radarData = useMemo(() => {
    if (!analysis) return [];

    const projectScore = analysis.projectScore || 0;
    const skillMatchScore = analysis.skillMatchScore || 0;
    const contentScore = analysis.contentScore || 0;
    const structureScore = analysis.structureScore || 0;
    const expressionScore = analysis.expressionScore || 0;

    const projectFullMark = 40;
    const skillMatchFullMark = 20;
    const contentFullMark = 15;
    const structureFullMark = 15;
    const expressionFullMark = 10;

    return [
      {
        subject: '表达专业性',
        score: expressionScore,
        fullMark: expressionFullMark
      },
      {
        subject: '技能匹配',
        score: skillMatchScore,
        fullMark: skillMatchFullMark
      },
      {
        subject: '内容完整性',
        score: contentScore,
        fullMark: contentFullMark
      },
      {
        subject: '结构清晰度',
        score: structureScore,
        fullMark: structureFullMark
      },
      {
        subject: '项目经验',
        score: projectScore,
        fullMark: projectFullMark
      }
    ];
  }, [analysis]);

  // 按优先级分类建议
  const suggestionsByPriority = useMemo(() => {
    if (!analysis?.suggestions) return { high: [], medium: [], low: [] };

    const suggestions = analysis.suggestions;
    return {
      high: suggestions.filter((s: any) => s.priority === '高'),
      medium: suggestions.filter((s: any) => s.priority === '中'),
      low: suggestions.filter((s: any) => s.priority === '低')
    };
  }, [analysis]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400';
      case '中':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400';
      case '低':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case '高':
        return 'bg-red-500 text-white';
      case '中':
        return 'bg-amber-500 text-white';
      case '低':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '项目': 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      '技能': 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
      '内容': 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      '格式': 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
      '结构': 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
      '表达': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
  };

  // 检测分析结果是否有效
  const hasErrorKeywords = analysis?.summary && (
    analysis.summary.includes('I/O error') ||
    analysis.summary.includes('分析过程中出现错误') ||
    analysis.summary.includes('简历分析失败') ||
    analysis.summary.includes('Remote host terminated') ||
    analysis.summary.includes('handshake')
  );
  const isAnalysisValid = analysis &&
    analysis.overallScore >= 10 &&
    analysis.summary &&
    !hasErrorKeywords;

  // 判断是否为"分析中"状态
  const isProcessing = analyzeStatus === 'PENDING' ||
    analyzeStatus === 'PROCESSING' ||
    (analyzeStatus === undefined && !analysis);

  // 处理分析中状态
  if (isProcessing) {
    const isExplicitProcessing = analyzeStatus === 'PROCESSING';
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <div
              className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
          {isExplicitProcessing ? (
              <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin"/>
          ) : (
              <Clock className="w-8 h-8 text-yellow-500 dark:text-yellow-400"/>
          )}
        </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {isExplicitProcessing ? 'AI 正在分析中...' : '等待分析'}
        </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
          {isExplicitProcessing
            ? '请稍候，AI 正在对您的简历进行深度分析'
            : '简历已上传成功，即将开始 AI 分析'}
        </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">页面将自动刷新显示分析结果</p>
      </div>
    );
  }

  // 处理分析失败状态
  if (analyzeStatus === 'FAILED' || !isAnalysisValid) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <div
              className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400"/>
        </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">分析失败</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">AI 服务暂时不可用，请稍后重试</p>
        {(analyzeError || analysis?.summary) && (
            <div
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">{analyzeError || analysis.summary}</p>
          </div>
        )}
        {onReanalyze && (
          <motion.button
            onClick={onReanalyze}
            disabled={reanalyzing}
            className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? '重新分析中...' : '重新分析'}
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <motion.section
          className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-[0_26px_80px_rgba(15,23,42,0.18)] dark:bg-primary-400 dark:text-slate-950"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid gap-0 lg:grid-cols-[1fr_210px]">
            <div className="p-7 md:p-9">
              <div className="flex items-center gap-2 opacity-70">
                <TrendingUp className="h-5 w-5" />
                <span className="font-black">诊断结论</span>
              </div>
              <p className="mt-5 max-w-5xl text-2xl font-black leading-10 md:text-3xl md:leading-[3rem]">
                {analysis.summary || '候选人具备扎实的技术基础，有大型项目架构经验。'}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1.5">分析时间 {formatDateTime(analysis.analyzedAt)}</span>
                <span className="rounded-full bg-primary-300 px-3 py-1.5 font-bold text-slate-950 dark:bg-slate-950 dark:text-primary-300">
                  {analysis.suggestions?.length || 0} 条改进线索
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center border-t border-white/10 bg-white/8 p-7 lg:border-l lg:border-t-0 dark:bg-slate-950/10">
              <div className="text-center">
                <div className="text-7xl font-black leading-none">{analysis.overallScore || 0}</div>
                <div className="mt-2 text-xs font-black uppercase tracking-[0.24em] opacity-60">Score</div>
                <motion.button
                  onClick={onExport}
                  disabled={exporting}
                  className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition-all hover:bg-primary-100 disabled:opacity-50 dark:bg-slate-950 dark:text-primary-300"
                  whileTap={{ scale: exporting ? 1 : 0.98 }}
                >
                  {exporting ? '导出中...' : '导出报告'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {radarData.map((item, index) => (
            <div key={item.subject} className="rounded-[1.4rem] border border-white/70 bg-white/82 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
              <p className="text-sm font-black text-slate-900 dark:text-white">{item.subject}</p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{item.score}<span className="text-xs text-slate-400">/{item.fullMark}</span></p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-slate-950 dark:bg-primary-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (item.score / item.fullMark) * 100)}%` }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                />
              </div>
            </div>
          ))}
        </motion.section>

        {analysis.strengths && analysis.strengths.length > 0 && (
          <motion.section
            className="grid gap-3 md:grid-cols-2"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {analysis.strengths.map((s: string, i: number) => (
              <div key={i} className="rounded-[1.4rem] border border-emerald-200/80 bg-emerald-50/80 p-5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">Strength {i + 1}</p>
                <p className="mt-2 font-bold leading-7">{s}</p>
              </div>
            ))}
          </motion.section>
        )}

        <motion.section
          className="app-card p-6"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-black">改进路线</span>
            <span className="text-sm">({analysis.suggestions?.length || 0} 条)</span>
          </div>

          <div className="space-y-6">
            {suggestionsByPriority.high.length > 0 && (
              <SuggestionSection priority="高" suggestions={suggestionsByPriority.high} getPriorityColor={getPriorityColor} getPriorityBadgeColor={getPriorityBadgeColor} getCategoryColor={getCategoryColor} delay={0.3} />
            )}
            {suggestionsByPriority.medium.length > 0 && (
              <SuggestionSection priority="中" suggestions={suggestionsByPriority.medium} getPriorityColor={getPriorityColor} getPriorityBadgeColor={getPriorityBadgeColor} getCategoryColor={getCategoryColor} delay={0.4} />
            )}
            {suggestionsByPriority.low.length > 0 && (
              <SuggestionSection priority="低" suggestions={suggestionsByPriority.low} getPriorityColor={getPriorityColor} getPriorityBadgeColor={getPriorityBadgeColor} getCategoryColor={getCategoryColor} delay={0.5} />
            )}
            {analysis.suggestions?.length === 0 && (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">暂无改进建议</div>
            )}
          </div>
        </motion.section>
    </div>
  );
}

// 建议分组组件
function SuggestionSection({
  priority,
  suggestions,
  getPriorityColor,
  getPriorityBadgeColor,
  getCategoryColor,
  delay
}: {
  priority: string;
  suggestions: any[];
  getPriorityColor: (p: string) => string;
  getPriorityBadgeColor: (p: string) => string;
  getCategoryColor: (c: string) => string;
  delay: number;
}) {
  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    '高': {
      bg: 'bg-red-100 dark:bg-red-900/50',
      text: 'text-red-700 dark:text-red-300',
      border: 'bg-red-100 dark:bg-red-900/50'
    },
    '中': {
      bg: 'bg-amber-100 dark:bg-amber-900/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'bg-amber-100 dark:bg-amber-900/50'
    },
    '低': {
      bg: 'bg-blue-100 dark:bg-blue-900/50',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'bg-blue-100 dark:bg-blue-900/50'
    }
  };

  const colors = priorityColors[priority] || priorityColors['中'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 ${colors.bg} ${colors.text} rounded-full text-sm font-semibold`}>
          {priority}优先级 ({suggestions.length})
        </span>
        <div className={`flex-1 h-px ${colors.border}`}></div>
      </div>
      <div className="space-y-3">
        {suggestions.map((s: any, i: number) => (
            <motion.div
            key={`${priority}-${i}`}
            className={`p-4 rounded-xl border-2 ${getPriorityColor(priority)}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.1 }}
          >
            <div className="flex items-start gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityBadgeColor(priority)}`}>
                {priority}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(s.category || '其他')}`}>
                {s.category || '其他'}
              </span>
            </div>
            <div className="mb-2">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">{s.issue || '问题描述'}</p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{s.recommendation || s}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

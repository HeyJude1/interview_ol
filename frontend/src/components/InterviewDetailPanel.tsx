import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {getScoreColor} from '../utils/score';
import type {InterviewDetail} from '../api/history';

interface InterviewDetailPanelProps {
  interview: InterviewDetail;
}

/**
 * 面试详情面板组件
 */
export default function InterviewDetailPanel({ interview }: InterviewDetailPanelProps) {
  // 默认展开所有题目
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(() => {
    const allIndices = new Set<number>();
    if (interview.answers) {
      interview.answers.forEach((_, idx) => allIndices.add(idx));
    }
    return allIndices;
  });

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ScoreCard
        score={interview.overallScore}
        feedback={interview.overallFeedback}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {interview.strengths && interview.strengths.length > 0 && (
          <StrengthsSection strengths={interview.strengths} />
        )}

        {interview.improvements && interview.improvements.length > 0 && (
          <ImprovementsSection improvements={interview.improvements} />
        )}
      </div>

      <QuestionsSection
        answers={interview.answers || []}
        expandedQuestions={expandedQuestions}
        toggleQuestion={toggleQuestion}
      />
    </motion.div>
  );
}

// 评分卡片组件
function ScoreCard({
  score,
  feedback,
}: {
  score: number | null;
  feedback: string | null;
}) {
  const scoreValue = score ?? 0;

  return (
    <div className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:bg-primary-400 dark:text-slate-950">
      <div className="grid gap-0 lg:grid-cols-[1fr_220px]">
        <div className="p-7 md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary-300 dark:text-slate-950/60">Review Transcript</p>
          <h3 className="mt-4 text-3xl font-black">演练复盘手稿</h3>
          <p className="mt-4 max-w-4xl text-lg leading-8 opacity-85">
            {feedback || '表现良好，展示了扎实的技术基础。'}
          </p>
        </div>
        <div className="flex items-center justify-center border-t border-white/10 bg-white/8 p-7 lg:border-l lg:border-t-0 dark:bg-slate-950/10">
          <div className="w-full">
            <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">Score</p>
            <div className="mt-3 flex items-end gap-2">
              <motion.span
                className="text-6xl font-black leading-none"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {score ?? '-'}
              </motion.span>
              <span className="pb-2 text-sm font-bold opacity-60">/100</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15 dark:bg-slate-950/20">
              <motion.div
                className="h-full rounded-full bg-primary-300 dark:bg-slate-950"
                initial={{ width: 0 }}
                animate={{ width: `${scoreValue}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 优势部分组件
function StrengthsSection({ strengths }: { strengths: string[] }) {
  return (
      <motion.div
          className="rounded-[1.5rem] border border-emerald-200/80 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
        <h4 className="mb-4 flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        表现优势
      </h4>
      <ul className="space-y-3">
        {strengths.map((s: string, i: number) => (
            <li key={i} className="text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// 改进建议部分组件
function ImprovementsSection({ improvements }: { improvements: string[] }) {
  return (
      <motion.div
          className="rounded-[1.5rem] border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
        <h4 className="mb-4 flex items-center gap-2 font-black text-amber-700 dark:text-amber-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        改进建议
      </h4>
      <ul className="space-y-3">
        {improvements.map((s: string, i: number) => (
            <li key={i} className="text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// 问答部分组件
function QuestionsSection({
  answers,
  expandedQuestions,
  toggleQuestion
}: {
  answers: any[];
  expandedQuestions: Set<number>;
  toggleQuestion: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <p className="page-kicker">Answer Timeline</p>
        <h4 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">问答时间线</h4>
      </div>

      <div className="space-y-4">
        {answers.map((answer, idx) => (
          <QuestionCard
            key={idx}
            answer={answer}
            index={idx}
            isExpanded={expandedQuestions.has(idx)}
            onToggle={() => toggleQuestion(idx)}
          />
        ))}
      </div>
    </div>
  );
}

// 问题卡片组件
function QuestionCard({
  answer,
  index,
  isExpanded,
  onToggle
}: {
  answer: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
      <motion.div
          className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/86 shadow-[0_16px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      {/* 问题头部 */}
        <div
            className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-primary-50/50 dark:hover:bg-white/5"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-primary-300 dark:bg-primary-400 dark:text-slate-950">
            {answer.questionIndex + 1}
          </span>
          <span
              className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {answer.category || '综合'}
          </span>
          <span className={`font-semibold ${getScoreColor(answer.score, [80, 60])}`}>
            得分: {answer.score}
          </span>
        </div>
          <motion.svg
          className="w-5 h-5 text-slate-400"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </motion.svg>
      </div>

      {/* 问题内容 */}
      <div className="px-5 pb-2">
        <p className="text-lg font-bold leading-relaxed text-slate-950 dark:text-white">{answer.question}</p>
      </div>

      {/* 展开内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* 你的回答 */}
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  你的回答
                </p>
                <p className={`leading-relaxed ${
                  !answer.userAnswer || answer.userAnswer === '不知道' 
                    ? 'text-red-500 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                }`}>
                  "{answer.userAnswer || '(未回答)'}"
                </p>
              </div>

              {/* AI 深度评价 */}
              {answer.feedback && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2 font-medium">
                    <svg className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 9L12 15L9 12L3 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    AI 深度评价
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-6">{answer.feedback}</p>
                </div>
              )}

              {/* 参考答案 */}
              {answer.referenceAnswer && (
                  <div
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2 font-medium">
                    <svg className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    参考答案
                  </p>
                    <div
                        className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{answer.referenceAnswer}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

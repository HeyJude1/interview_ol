import {useMemo, useRef} from 'react';
import {motion} from 'framer-motion';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import type {InterviewQuestion, InterviewSession} from '../types/interview';
import {Send, User} from 'lucide-react';

interface Message {
  type: 'interviewer' | 'user';
  content: string;
  category?: string;
  questionIndex?: number;
}

interface InterviewChatPanelProps {
  session: InterviewSession;
  currentQuestion: InterviewQuestion | null;
  messages: Message[];
  answer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onCompleteEarly: () => void;
  isSubmitting: boolean;
  showCompleteConfirm: boolean;
  onShowCompleteConfirm: (show: boolean) => void;
}

/**
 * 面试聊天面板组件
 */
export default function InterviewChatPanel({
  session,
  currentQuestion,
  messages,
  answer,
  onAnswerChange,
  onSubmit,
  // onCompleteEarly, // 暂时未使用
  isSubmitting,
  // showCompleteConfirm, // 暂时未使用
  onShowCompleteConfirm
}: InterviewChatPanelProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const progress = useMemo(() => {
    if (!session || !currentQuestion) return 0;
    return ((currentQuestion.questionIndex + 1) / session.totalQuestions) * 100;
  }, [session, currentQuestion]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSubmit();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-220px)] max-w-5xl flex-col md:h-[calc(100vh-190px)]">
      {/* 进度条 */}
        <div
            className="app-card mb-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            题目 {currentQuestion ? currentQuestion.questionIndex + 1 : 0} / {session.totalQuestions}
          </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
            {Math.round(progress)}%
          </span>
        </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-600 via-emerald-400 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 聊天区域 */}
        <div
            className="app-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          initialTopMostItemIndex={messages.length - 1}
          followOutput="smooth"
          className="flex-1"
          itemContent={(_index, msg) => (
            <div className="pb-4 px-6 first:pt-6">
              <MessageBubble message={msg} />
            </div>
          )}
        />

        {/* 输入区域 */}
            <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="输入你的回答... (Ctrl/Cmd + Enter 提交)"
              className="app-input flex-1 resize-none rounded-2xl px-4 py-3"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex gap-2 md:flex-col">
              <motion.button
                onClick={onSubmit}
                disabled={!answer.trim() || isSubmitting}
                className="app-button-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold"
                whileHover={{ scale: isSubmitting || !answer.trim() ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting || !answer.trim() ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    提交中
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    提交
                  </>
                )}
              </motion.button>
              <motion.button
                onClick={() => onShowCompleteConfirm(true)}
                disabled={isSubmitting}
                className="app-button-secondary rounded-2xl px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                提前交卷
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ message }: { message: Message }) {
  if (message.type === 'interviewer') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-3"
      >
          <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-400 dark:text-slate-950">
              <User className="h-4 w-4 text-current"/>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">面试官</span>
            {message.category && (
                <span
                    className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {message.category}
              </span>
            )}
          </div>
            <div
                className="rounded-2xl rounded-tl-sm border border-slate-200/80 bg-slate-50 p-4 leading-relaxed text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 justify-end"
    >
      <div className="flex-1 max-w-[80%]">
        <div className="rounded-2xl rounded-tr-sm bg-slate-950 p-4 leading-relaxed text-primary-50 shadow-lg shadow-slate-950/10 dark:bg-primary-400 dark:text-slate-950">
          {message.content}
        </div>
      </div>
        <div
            className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </motion.div>
  );
}

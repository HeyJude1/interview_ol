import {type MouseEvent, useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import {knowledgeBaseApi, type KnowledgeBaseItem, type SortOption} from '../api/knowledgebase';
import {ragChatApi, type RagChatSessionListItem} from '../api/ragChat';
import {formatDateOnly} from '../utils/date';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import CodeBlock from '../components/CodeBlock';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  History,
  Layers3,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface KnowledgeBaseQueryPageProps {
  onBack: () => void;
  onUpload: () => void;
}

interface Message {
  id?: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CategoryGroup {
  name: string;
  items: KnowledgeBaseItem[];
  isExpanded: boolean;
}

export default function KnowledgeBaseQueryPage({onBack, onUpload}: KnowledgeBaseQueryPageProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<Set<number>>(new Set());
  const [loadingList, setLoadingList] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['未分类']));
  const [historyOpen, setHistoryOpen] = useState(false);

  const [sessions, setSessions] = useState<RagChatSessionListItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionDeleteConfirm, setSessionDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<{ id: number; title: string } | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const rafRef = useRef<number>();

  const [, startTransition] = useTransition();

  useEffect(() => {
    loadKnowledgeBases();
    loadSessions();
  }, []);

  useEffect(() => {
    if (!searchKeyword) {
      loadKnowledgeBases();
    }
  }, [sortBy]);

  const loadKnowledgeBases = async () => {
    setLoadingList(true);
    try {
      const list = await knowledgeBaseApi.getAllKnowledgeBases(sortBy, 'COMPLETED');
      setKnowledgeBases(list);
    } catch (err) {
      console.error('加载知识库列表失败', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadKnowledgeBases();
      return;
    }
    setLoadingList(true);
    try {
      const list = await knowledgeBaseApi.search(searchKeyword.trim());
      setKnowledgeBases(list.filter(kb => kb.vectorStatus === 'COMPLETED'));
    } catch (err) {
      console.error('搜索知识库失败', err);
    } finally {
      setLoadingList(false);
    }
  };

  const groupedKnowledgeBases = useMemo((): CategoryGroup[] => {
    const groups: Map<string, KnowledgeBaseItem[]> = new Map();

    knowledgeBases.forEach(kb => {
      const category = kb.category || '未分类';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(kb);
    });

    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      if (a === '未分类') return 1;
      if (b === '未分类') return -1;
      return a.localeCompare(b);
    });

    return sortedCategories.map(name => ({
      name,
      items: groups.get(name)!,
      isExpanded: expandedCategories.has(name),
    }));
  }, [knowledgeBases, expandedCategories]);

  const selectedKnowledgeBases = useMemo(
    () => knowledgeBases.filter(kb => selectedKbIds.has(kb.id)),
    [knowledgeBases, selectedKbIds]
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const list = await ragChatApi.listSessions();
      setSessions(list);
    } catch (err) {
      console.error('加载会话列表失败', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleToggleKb = (kbId: number) => {
    setSelectedKbIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kbId)) {
        newSet.delete(kbId);
      } else {
        newSet.add(kbId);
      }
      if (newSet.size !== prev.size && currentSessionId) {
        setCurrentSessionId(null);
        setCurrentSessionTitle('');
        setMessages([]);
      }
      return newSet;
    });
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setCurrentSessionTitle('');
    setMessages([]);
    setHistoryOpen(false);
  };

  const handleLoadSession = async (sessionId: number) => {
    try {
      const detail = await ragChatApi.getSessionDetail(sessionId);
      setCurrentSessionId(detail.id);
      setCurrentSessionTitle(detail.title);
      setSelectedKbIds(new Set(detail.knowledgeBases.map(kb => kb.id)));
      setMessages(detail.messages.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        timestamp: new Date(m.createdAt),
      })));
      setHistoryOpen(false);
    } catch (err) {
      console.error('加载会话失败', err);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionDeleteConfirm) return;
    try {
      await ragChatApi.deleteSession(sessionDeleteConfirm.id);
      await loadSessions();
      if (currentSessionId === sessionDeleteConfirm.id) {
        handleNewSession();
      }
      setSessionDeleteConfirm(null);
    } catch (err) {
      console.error('删除会话失败', err);
    }
  };

  const handleEditSessionTitle = (sessionId: number, currentTitle: string) => {
    setEditingSessionTitle({id: sessionId, title: currentTitle});
    setNewSessionTitle(currentTitle);
  };

  const handleSaveSessionTitle = async () => {
    if (!editingSessionTitle || !newSessionTitle.trim()) return;
    try {
      await ragChatApi.updateSessionTitle(editingSessionTitle.id, newSessionTitle.trim());
      await loadSessions();
      if (currentSessionId === editingSessionTitle.id) {
        setCurrentSessionTitle(newSessionTitle.trim());
      }
      setEditingSessionTitle(null);
      setNewSessionTitle('');
    } catch (err) {
      console.error('更新会话标题失败', err);
    }
  };

  const handleTogglePin = async (sessionId: number, e: MouseEvent) => {
    e.stopPropagation();
    try {
      await ragChatApi.togglePin(sessionId);
      await loadSessions();
    } catch (err) {
      console.error('切换置顶状态失败', err);
    }
  };

  const formatMarkdown = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\\n/g, '\n')
      .replace(/^(#{1,6})([^\s#\n])/gm, '$1 $2')
      .replace(/^(\s*)(\d+)\.([^\s\n])/gm, '$1$2. $3')
      .replace(/^(\s*[-*])([^\s\n-])/gm, '$1 $2')
      .replace(/\n{3,}/g, '\n\n');
  };

  const handleSubmitQuestion = async () => {
    if (!question.trim() || selectedKbIds.size === 0 || loading) return;

    const userQuestion = question.trim();
    setQuestion('');
    setLoading(true);

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const session = await ragChatApi.createSession(Array.from(selectedKbIds));
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        setCurrentSessionTitle(session.title);
      } catch (err) {
        console.error('创建会话失败', err);
        setLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      type: 'user',
      content: userQuestion,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: Message = {
      type: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    let fullContent = '';
    const updateAssistantMessage = (content: string) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].type === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content,
          };
        }
        return newMessages;
      });
    };

    try {
      await ragChatApi.sendMessageStream(
        sessionId,
        userQuestion,
        (chunk: string) => {
          fullContent += chunk;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
          }
          rafRef.current = requestAnimationFrame(() => {
            startTransition(() => {
              updateAssistantMessage(fullContent);
            });
          });
        },
        () => {
          setLoading(false);
          loadSessions();
        },
        (error: Error) => {
          console.error('流式查询失败:', error);
          updateAssistantMessage(fullContent || error.message || '回答失败，请重试');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('发起流式查询失败:', err);
      updateAssistantMessage(err instanceof Error ? err.message : '回答失败，请重试');
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return formatDateOnly(dateStr);
  };

  const canvasTitle = currentSessionTitle || (selectedKnowledgeBases.length === 1
    ? selectedKnowledgeBases[0].name
    : selectedKnowledgeBases.length > 1
    ? `${selectedKnowledgeBases.length} 份资料联合检索`
    : '等待选择资料源');

  return (
    <div className="mx-auto max-w-[1460px] pb-10">
      <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="page-kicker mb-3">Retrieval Lab</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">检索实验台</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
            先圈定证据资料，再把问题送入实验记录。历史会话收进抽屉，主屏只保留资料、问题和结论。
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <button
            onClick={() => setHistoryOpen(true)}
            className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
          >
            <History className="h-4 w-4" />
            会话档案
          </button>
          <button
            onClick={onUpload}
            className="app-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
          >
            <Upload className="h-4 w-4" />
            导入资料
          </button>
          <button
            onClick={onBack}
            className="app-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black"
          >
            <ArrowLeft className="h-4 w-4" />
            返回知识库
          </button>
        </div>
      </div>

      <section className="app-card mb-5 overflow-hidden">
        <div className="grid gap-4 border-b border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索可检索资料"
                className="app-input w-full rounded-2xl py-3 pl-11 pr-4"
              />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setSearchKeyword('');
                }}
                className="app-input w-full cursor-pointer appearance-none rounded-2xl py-3 pl-4 pr-10 md:w-44"
              >
                <option value="time">最近入库</option>
                <option value="size">文件体积</option>
                <option value="access">访问频次</option>
                <option value="question">提问频次</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={handleSearch} className="app-button-primary rounded-2xl px-5 py-3 text-sm font-black">
              检索资料
            </button>
          </div>
          <button
            onClick={handleNewSession}
            disabled={selectedKbIds.size === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-primary-300"
          >
            <Plus className="h-4 w-4" />
            新实验
          </button>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary-500" />
              <h2 className="text-base font-black text-slate-950 dark:text-white">证据资料托盘</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                已选 {selectedKbIds.size}
              </span>
            </div>

            {loadingList ? (
              <div className="grid min-h-[170px] place-items-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : knowledgeBases.length === 0 ? (
              <div className="grid min-h-[170px] place-items-center rounded-3xl border border-dashed border-slate-200 p-6 text-center dark:border-white/10">
                <div>
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{searchKeyword ? '没有找到可用资料' : '暂无已完成向量化的资料'}</p>
                  {!searchKeyword && (
                    <button onClick={onUpload} className="mt-3 text-sm font-black text-primary-600 dark:text-primary-300">
                      导入资料
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedKnowledgeBases.map((group) => (
                  <div key={group.name} className="rounded-3xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <button
                      onClick={() => toggleCategory(group.name)}
                      className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${group.isExpanded ? 'rotate-90' : ''}`} />
                        <span className="truncate text-sm font-black text-slate-900 dark:text-white">{group.name}</span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{group.items.length}</span>
                    </button>

                    <AnimatePresence>
                      {group.isExpanded && (
                        <motion.div
                          initial={{height: 0, opacity: 0}}
                          animate={{height: 'auto', opacity: 1}}
                          exit={{height: 0, opacity: 0}}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                            {group.items.map((kb) => {
                              const selected = selectedKbIds.has(kb.id);
                              return (
                                <button
                                  key={kb.id}
                                  type="button"
                                  onClick={() => handleToggleKb(kb.id)}
                                  className={`min-h-[96px] rounded-2xl border p-3 text-left transition-all ${selected
                                    ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-300/50 dark:bg-primary-300/10'
                                    : 'border-slate-100 bg-slate-50/70 hover:border-primary-200 hover:bg-primary-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary-300/40'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => handleToggleKb(kb.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900 dark:text-white">{kb.name}</p>
                                      <p className="mt-2 text-xs font-bold text-slate-400">{formatFileSize(kb.fileSize)} · {kb.questionCount} 问</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200/80 bg-slate-950 p-5 text-white dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary-300">Evidence Stack</p>
            <h3 className="mt-3 text-xl font-black">本次检索证据</h3>
            <div className="mt-5 space-y-3">
              {selectedKnowledgeBases.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                  从左侧资料托盘勾选一份或多份资料后，实验记录区才会开始工作。
                </p>
              ) : (
                selectedKnowledgeBases.map((kb) => (
                  <div key={kb.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{kb.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{kb.category || '未分类'} · {formatFileSize(kb.fileSize)}</p>
                      </div>
                      <button
                        onClick={() => handleToggleKb(kb.id)}
                        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        title="移除资料"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="border-b border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Experiment Record</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{canvasTitle}</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <Clock className="h-4 w-4" />
              {messages.length} 条记录
            </div>
          </div>
        </div>

        <div className="h-[calc(100vh-28rem)] min-h-[460px] bg-[linear-gradient(180deg,rgba(248,250,252,0.8),rgba(255,255,255,0.9))] dark:bg-none">
          {selectedKbIds.size > 0 ? (
            messages.length === 0 ? (
              <div className="grid h-full place-items-center p-8 text-center">
                <div className="max-w-lg">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-lg font-black text-slate-800 dark:text-white">建立第一条检索记录</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    问题会和上方选中的证据资料绑定，回答将作为实验记录追加到画布中。
                  </p>
                </div>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={messages}
                initialTopMostItemIndex={messages.length - 1}
                followOutput="smooth"
                className="h-full w-full"
                itemContent={(index, msg) => (
                  <div className="px-5 py-4">
                    <motion.article
                      initial={{opacity: 0, y: 12}}
                      animate={{opacity: 1, y: 0}}
                      className={`mx-auto max-w-5xl rounded-3xl border p-5 shadow-sm ${msg.type === 'user'
                        ? 'border-slate-900 bg-slate-950 text-white dark:border-primary-300/40 dark:bg-primary-300 dark:text-slate-950'
                        : 'border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100'
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${msg.type === 'user' ? 'bg-white/10 text-primary-100 dark:bg-slate-950/10 dark:text-slate-800' : 'bg-primary-50 text-primary-700 dark:bg-primary-300/10 dark:text-primary-300'}`}>
                          {msg.type === 'user' ? '提问假设' : '检索结论'}
                        </span>
                        <span className={`text-xs font-bold ${msg.type === 'user' ? 'text-slate-300 dark:text-slate-700' : 'text-slate-400'}`}>
                          {msg.timestamp.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>

                      {msg.type === 'user' ? (
                        <p className="whitespace-pre-wrap text-base font-bold leading-8">{msg.content}</p>
                      ) : (
                        <div className="prose prose-slate max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({className, children}) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const isInline = !match;

                                if (isInline) {
                                  return (
                                    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-sm font-normal text-primary-600 dark:bg-slate-700 dark:text-primary-300">
                                      {children}
                                    </code>
                                  );
                                }

                                return (
                                  <CodeBlock language={match[1]}>
                                    {String(children).replace(/\n$/, '')}
                                  </CodeBlock>
                                );
                              },
                              pre: ({children}) => <>{children}</>,
                            }}
                          >
                            {formatMarkdown(msg.content)}
                          </ReactMarkdown>
                          {loading && index === messages.length - 1 && (
                            <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary-500" />
                          )}
                        </div>
                      )}
                    </motion.article>
                  </div>
                )}
              />
            )
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <Layers3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="text-lg font-black text-slate-800 dark:text-white">先选择证据资料</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">上方资料托盘至少勾选一项后才能提问。</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/70 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
              placeholder="输入要验证的问题，例如：这份项目经历里最容易被追问的技术风险是什么？"
              className="app-input min-h-[54px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm leading-6"
              disabled={loading}
            />
            <button
              onClick={handleSubmitQuestion}
              disabled={!question.trim() || selectedKbIds.size === 0 || loading}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              记录结论
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              onClick={() => setHistoryOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{x: 420, opacity: 0}}
              animate={{x: 0, opacity: 1}}
              exit={{x: 420, opacity: 0}}
              transition={{type: 'spring', damping: 28, stiffness: 260}}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Session Archive</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">会话档案</h2>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={handleNewSession}
                disabled={selectedKbIds.size === 0}
                className="mb-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-300 dark:text-slate-950"
              >
                <Plus className="h-4 w-4" />
                新建实验记录
              </button>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loadingSessions ? (
                  <div className="grid h-40 place-items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
                    暂无会话历史
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleLoadSession(session.id)}
                        className={`group cursor-pointer rounded-3xl border p-4 transition-all ${currentSessionId === session.id
                          ? 'border-primary-300 bg-primary-50 dark:border-primary-300/40 dark:bg-primary-300/10'
                          : 'border-slate-200 bg-slate-50/70 hover:border-primary-200 hover:bg-primary-50/50 dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {session.isPinned && <Pin className="h-4 w-4 flex-shrink-0 fill-primary-500 text-primary-500" />}
                              <p className="truncate text-sm font-black text-slate-900 dark:text-white">{session.title}</p>
                            </div>
                            <p className="mt-2 text-xs font-bold text-slate-400">{session.messageCount} 条记录 · {formatTimeAgo(session.updatedAt)}</p>
                            {session.knowledgeBaseNames.length > 0 && (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {session.knowledgeBaseNames.join(' / ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => handleTogglePin(session.id, e)}
                              className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-primary-500 dark:hover:bg-white/10"
                              title={session.isPinned ? '取消置顶' : '置顶'}
                            >
                              <Pin className={`h-4 w-4 ${session.isPinned ? 'fill-primary-500 text-primary-500' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSessionTitle(session.id, session.title);
                              }}
                              className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-primary-500 dark:hover:bg-white/10"
                              title="编辑标题"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionDeleteConfirm({id: session.id, title: session.title});
                              }}
                              className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-red-500 dark:hover:bg-white/10"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmDialog
        open={!!sessionDeleteConfirm}
        item={sessionDeleteConfirm ? {id: 0, title: sessionDeleteConfirm.title} : null}
        itemType="对话"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionDeleteConfirm(null)}
      />

      <AnimatePresence>
        {editingSessionTitle && (
          <>
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              onClick={() => {
                setEditingSessionTitle(null);
                setNewSessionTitle('');
              }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{opacity: 0, scale: 0.95, y: 20}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.95, y: 20}}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
              >
                <h3 className="mb-4 text-xl font-black text-slate-900 dark:text-white">编辑标题</h3>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSessionTitle()}
                  placeholder="请输入新标题"
                  className="app-input mb-4 w-full rounded-2xl px-4 py-3 text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditingSessionTitle(null);
                      setNewSessionTitle('');
                    }}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveSessionTitle}
                    disabled={!newSessionTitle.trim()}
                    className="app-button-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import {type KeyboardEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  HardDrive,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {knowledgeBaseApi, type KnowledgeBaseItem, type KnowledgeBaseStats, type SortOption, type VectorStatus} from '../api/knowledgebase';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

interface KnowledgeBaseManagePageProps {
  onUpload: () => void;
  onChat: () => void;
}

interface ShelfGroup {
  name: string;
  items: KnowledgeBaseItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusText(status: VectorStatus): string {
  switch (status) {
    case 'COMPLETED':
      return '可检索';
    case 'PROCESSING':
      return '建索引中';
    case 'PENDING':
      return '排队中';
    case 'FAILED':
      return '索引失败';
    default:
      return '未知';
  }
}

function StatusBadge({status}: { status: VectorStatus }) {
  const styles: Record<VectorStatus, string> = {
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
    PROCESSING: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
    FAILED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300',
  };

  const Icon = status === 'COMPLETED'
    ? CheckCircle
    : status === 'FAILED'
    ? AlertCircle
    : status === 'PROCESSING'
    ? Loader2
    : Clock;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {getStatusText(status)}
    </span>
  );
}

function CategoryEditor({
  kb,
  categories,
  editingCategoryId,
  editingCategoryValue,
  savingCategory,
  categoryInputRef,
  onStart,
  onCancel,
  onChange,
  onSave,
  onKeyDown,
}: {
  kb: KnowledgeBaseItem;
  categories: string[];
  editingCategoryId: number | null;
  editingCategoryValue: string;
  savingCategory: boolean;
  categoryInputRef: RefObject<HTMLInputElement>;
  onStart: (kb: KnowledgeBaseItem) => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: (id: number) => void;
  onKeyDown: (e: KeyboardEvent, id: number) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {editingCategoryId === kb.id ? (
        <motion.div
          key="editing"
          initial={{opacity: 0, y: 4}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -4}}
          className="flex items-center gap-2"
        >
          <input
            ref={categoryInputRef}
            type="text"
            value={editingCategoryValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, kb.id)}
            placeholder="输入分类"
            list="category-suggestions"
            className="app-input h-8 w-28 rounded-xl px-2 text-xs"
            disabled={savingCategory}
          />
          <datalist id="category-suggestions">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <button
            onClick={() => onSave(kb.id)}
            disabled={savingCategory}
            className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-400/10 dark:text-emerald-300"
            title="保存分类"
          >
            {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={onCancel}
            disabled={savingCategory}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-white/10 dark:text-slate-300"
            title="取消"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="display"
          initial={{opacity: 0, y: 4}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -4}}
          className="group/category inline-flex items-center gap-2"
        >
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {kb.category || '未分类'}
          </span>
          <button
            onClick={() => onStart(kb)}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-primary-50 hover:text-primary-600 group-hover/category:opacity-100 dark:hover:bg-primary-400/10 dark:hover:text-primary-300"
            title="编辑分类"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function KnowledgeBaseManagePage({onUpload, onChat}: KnowledgeBaseManagePageProps) {
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [deleteItem, setDeleteItem] = useState<KnowledgeBaseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const [revectorizing, setRevectorizing] = useState<number | null>(null);

  const loadDataSilent = useCallback(async () => {
    try {
      const [statsData, kbList, categoryList] = await Promise.all([
        knowledgeBaseApi.getStatistics(),
        searchKeyword
          ? knowledgeBaseApi.search(searchKeyword)
          : selectedCategory
          ? knowledgeBaseApi.getByCategory(selectedCategory)
          : knowledgeBaseApi.getAllKnowledgeBases(sortBy),
        knowledgeBaseApi.getAllCategories(),
      ]);
      setStats(statsData);
      setKnowledgeBases(kbList);
      setCategories(categoryList);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [searchKeyword, sortBy, selectedCategory]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, kbList, categoryList] = await Promise.all([
        knowledgeBaseApi.getStatistics(),
        searchKeyword
          ? knowledgeBaseApi.search(searchKeyword)
          : selectedCategory
          ? knowledgeBaseApi.getByCategory(selectedCategory)
          : knowledgeBaseApi.getAllKnowledgeBases(sortBy),
        knowledgeBaseApi.getAllCategories(),
      ]);
      setStats(statsData);
      setKnowledgeBases(kbList);
      setCategories(categoryList);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, sortBy, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasPendingItems = knowledgeBases.some(
      kb => kb.vectorStatus === 'PENDING' || kb.vectorStatus === 'PROCESSING'
    );

    if (hasPendingItems && !loading) {
      const timer = setInterval(() => {
        loadDataSilent();
      }, 5000);

      return () => clearInterval(timer);
    }
  }, [knowledgeBases, loading, loadDataSilent]);

  const shelfGroups = useMemo((): ShelfGroup[] => {
    const groups = new Map<string, KnowledgeBaseItem[]>();
    knowledgeBases.forEach((kb) => {
      const groupName = kb.category || '未分类';
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(kb);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === '未分类') return 1;
        if (b === '未分类') return -1;
        return a.localeCompare(b);
      })
      .map(([name, items]) => ({name, items}));
  }, [knowledgeBases]);

  const totalSize = useMemo(
    () => knowledgeBases.reduce((sum, item) => sum + item.fileSize, 0),
    [knowledgeBases]
  );

  const handleRevectorize = async (id: number) => {
    try {
      setRevectorizing(id);
      await knowledgeBaseApi.revectorize(id);
      await loadDataSilent();
    } catch (error) {
      console.error('重新向量化失败:', error);
    } finally {
      setRevectorizing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await knowledgeBaseApi.deleteKnowledgeBase(deleteItem.id);
      setDeleteItem(null);
      await loadData();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (kb: KnowledgeBaseItem) => {
    try {
      const blob = await knowledgeBaseApi.downloadKnowledgeBase(kb.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = kb.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  const handleStartEditCategory = (kb: KnowledgeBaseItem) => {
    setEditingCategoryId(kb.id);
    setEditingCategoryValue(kb.category || '');
    setTimeout(() => {
      categoryInputRef.current?.focus();
    }, 50);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryValue('');
  };

  const handleSaveCategory = async (id: number) => {
    try {
      setSavingCategory(true);
      const categoryToSave = editingCategoryValue.trim() || null;
      await knowledgeBaseApi.updateCategory(id, categoryToSave);
      setEditingCategoryId(null);
      setEditingCategoryValue('');
      await loadData();
    } catch (error) {
      console.error('更新分类失败:', error);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCategoryKeyDown = (e: KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCategory(id);
    } else if (e.key === 'Escape') {
      handleCancelEditCategory();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="mx-auto max-w-[1360px] pb-10">
      <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10 dark:border-white/10">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_40%_30%,rgba(45,212,191,0.28),transparent_34%),linear-gradient(135deg,transparent,rgba(251,191,36,0.12))] md:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-primary-300">Document Depot</p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">知识库资料架</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              把项目文档、技术资料、题库素材按文件夹归档，随时进入检索陪练或重新生成向量索引。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onUpload}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-primary-950/20 transition-transform hover:-translate-y-0.5"
              >
                <Upload className="h-4 w-4" />
                导入资料
              </button>
              <button
                onClick={onChat}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                <MessageSquare className="h-4 w-4" />
                进入检索实验台
              </button>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <Database className="mb-4 h-5 w-5 text-primary-200" />
              <p className="text-3xl font-black">{stats?.totalCount?.toLocaleString() || 0}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">资料总量</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <CheckCircle className="mb-4 h-5 w-5 text-emerald-300" />
              <p className="text-3xl font-black">{stats?.completedCount?.toLocaleString() || 0}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">可检索</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <Eye className="mb-4 h-5 w-5 text-amber-200" />
              <p className="text-3xl font-black">{stats?.totalAccessCount?.toLocaleString() || 0}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">访问次数</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <MessageSquare className="mb-4 h-5 w-5 text-sky-200" />
              <p className="text-3xl font-black">{stats?.totalQuestionCount?.toLocaleString() || 0}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">提问次数</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <form onSubmit={handleSearch} className="app-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="按资料名称检索"
                className="app-input w-full rounded-2xl py-3 pl-11 pr-4"
              />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setSearchKeyword('');
                  setSelectedCategory(null);
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
            <button type="submit" className="app-button-primary rounded-2xl px-5 py-3 text-sm font-black">
              检索
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSearchKeyword('');
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition-colors ${selectedCategory === null ? 'bg-slate-950 text-white dark:bg-primary-300 dark:text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'}`}
            >
              全部资料
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setSearchKeyword('');
                }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition-colors ${selectedCategory === cat ? 'bg-slate-950 text-white dark:bg-primary-300 dark:text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </form>

        <div className="app-card flex min-w-[260px] items-center gap-4 p-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-primary-300 dark:bg-primary-300 dark:text-slate-950">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Library Footprint</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatFileSize(totalSize)}</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="app-card grid min-h-[360px] place-items-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary-500" />
        </div>
      ) : knowledgeBases.length === 0 ? (
        <div className="app-card grid min-h-[360px] place-items-center p-8 text-center">
          <div>
            <Folder className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <p className="text-lg font-black text-slate-800 dark:text-white">资料架还是空的</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{searchKeyword ? '没有匹配当前关键词的资料' : '导入第一份资料后，可以在这里按文件夹维护索引'}</p>
            <button onClick={onUpload} className="app-button-primary mt-5 rounded-2xl px-5 py-3 text-sm font-black">
              导入资料
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {shelfGroups.map((group, groupIndex) => (
            <motion.section
              key={group.name}
              initial={{opacity: 0, y: 18}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: groupIndex * 0.04}}
              className="app-card overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-white/10 dark:text-primary-300">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">{group.name}</h2>
                    <p className="text-xs font-bold text-slate-400">{group.items.length} 份资料 · {formatFileSize(group.items.reduce((sum, item) => sum + item.fileSize, 0))}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-white/10">
                    可检索 {group.items.filter((item) => item.vectorStatus === 'COMPLETED').length}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-white/10">
                    待处理 {group.items.filter((item) => item.vectorStatus === 'PENDING' || item.vectorStatus === 'PROCESSING').length}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((kb, index) => (
                  <motion.article
                    key={kb.id}
                    initial={{opacity: 0, y: 12}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: index * 0.03}}
                    className="group relative min-h-[260px] rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-xl hover:shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-primary-300/40"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-primary-300">
                        <FileText className="h-6 w-6" />
                      </div>
                      <StatusBadge status={kb.vectorStatus} />
                    </div>

                    <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7 text-slate-950 dark:text-white">
                      {kb.name}
                    </h3>
                    <p className="mt-2 truncate text-xs font-bold text-slate-400">{kb.originalFilename}</p>

                    <div className="mt-5">
                      <CategoryEditor
                        kb={kb}
                        categories={categories}
                        editingCategoryId={editingCategoryId}
                        editingCategoryValue={editingCategoryValue}
                        savingCategory={savingCategory}
                        categoryInputRef={categoryInputRef}
                        onStart={handleStartEditCategory}
                        onCancel={handleCancelEditCategory}
                        onChange={setEditingCategoryValue}
                        onSave={handleSaveCategory}
                        onKeyDown={handleCategoryKeyDown}
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-50 px-2 py-3 dark:bg-white/5">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatFileSize(kb.fileSize)}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">体积</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-2 py-3 dark:bg-white/5">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{kb.questionCount}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">提问</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-2 py-3 dark:bg-white/5">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{kb.accessCount}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">访问</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                      <span className="text-xs font-bold text-slate-400">{formatDate(kb.uploadedAt)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(kb)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-400/10 dark:hover:text-primary-300"
                          title="下载"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {kb.vectorStatus === 'FAILED' && (
                          <button
                            onClick={() => handleRevectorize(kb.id)}
                            disabled={revectorizing === kb.id}
                            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-50 dark:hover:bg-primary-400/10 dark:hover:text-primary-300"
                            title="重新向量化"
                          >
                            <RefreshCw className={`h-4 w-4 ${revectorizing === kb.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteItem(kb)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-400/10"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteItem !== null}
        item={deleteItem}
        itemType="资料源"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

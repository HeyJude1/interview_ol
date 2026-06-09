import {Link, Outlet, useLocation} from 'react-router-dom';
import {motion} from 'framer-motion';
import {
  BarChart3,
  Database,
  FileStack,
  MessageSquare,
  Moon,
  Radar,
  Sun,
  Upload,
  Users,
} from 'lucide-react';
import {useTheme} from '../hooks/useTheme';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export default function Layout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const {theme, toggleTheme} = useTheme();

  // 按训练流程组织导航，避免停留在通用后台菜单命名。
  const navGroups: NavGroup[] = [
    {
      id: 'career',
      title: '面试区',
      items: [
        { id: 'upload', path: '/upload', label: '导入档案', icon: Upload, description: '解析履历信号' },
        { id: 'resumes', path: '/history', label: '档案看板', icon: FileStack, description: '筛选候选材料' },
        { id: 'interviews', path: '/interviews', label: '演练复盘', icon: Users, description: '追踪作答曲线' },
      ],
    },
    {
      id: 'knowledge',
      title: '资料区',
      items: [
        { id: 'kb-manage', path: '/knowledgebase', label: '知识库', icon: Database, description: '向量化参考材料' },
        { id: 'chat', path: '/knowledgebase/chat', label: '检索陪练', icon: MessageSquare, description: '围绕资料追问' },
      ],
    },
  ];

  // 判断当前页面是否匹配导航项
  const isActive = (path: string) => {
    if (path === '/upload') {
      return currentPath === '/upload' || currentPath === '/';
    }
    if (path === '/knowledgebase') {
      return currentPath === '/knowledgebase' || currentPath === '/knowledgebase/upload';
    }
    return currentPath.startsWith(path);
  };

  const flatItems = navGroups.flatMap(group => group.items);
  const activeItem = flatItems.find(item => isActive(item.path)) ?? flatItems[0];

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:44px_44px] dark:opacity-20" />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-[#f8faf6]/88 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/82">
        <div className="mx-auto max-w-[1500px] px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link to="/upload" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-primary-300 shadow-xl shadow-slate-950/20 dark:bg-primary-400 dark:text-slate-950">
                  <Radar className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-xl font-black tracking-tight text-slate-950 dark:text-white">Interview OL</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">简历分析及面试平台 v1.3</span>
                </div>
              </Link>

              <button
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm xl:hidden dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300"
                aria-label="切换主题"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <nav className="flex gap-3 overflow-x-auto pb-1">
              {navGroups.map(group => (
                <div key={group.id} className="flex shrink-0 items-center gap-2 rounded-[1.4rem] border border-slate-200/80 bg-white/72 p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <span className="px-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {group.title}
                  </span>
                  {group.items.map(item => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                          active
                            ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-primary-400 dark:text-slate-950'
                            : 'text-slate-600 hover:bg-primary-50 hover:text-primary-800 dark:text-slate-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-200'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="hidden items-center gap-3 xl:flex">
              <div className="rounded-2xl border border-primary-200/80 bg-primary-50 px-4 py-2 dark:border-primary-900/50 dark:bg-primary-950/30">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-primary-700 dark:text-primary-300">
                  <BarChart3 className="h-4 w-4" />
                  {activeItem.label}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{activeItem.description}</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                aria-label="切换主题"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto min-h-screen max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">
        <motion.div
          key={currentPath}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

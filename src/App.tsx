import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MarketplacePage } from './pages/MarketplacePage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { RepairKbPage } from './pages/RepairKbPage';
import { RegisterModal } from './components/RegisterModal';
import { AuthModal } from './components/AuthModal';
import { api } from './api';
import { 
  User, 
  Category, 
  ItemSummary, 
  ItemDetail, 
  ServiceProvider, 
  KnownIssue, 
  Organization 
} from './types';

export default function App() {
  // Navigation & View State
  const [activeView, setActiveView] = useState<'explorer' | 'knowledge_base'>('explorer');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Core Data
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [minCondition, setMinCondition] = useState<number | ''>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Status
  const [dbStatus, setDbStatus] = useState<{ engine: string; details: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Check current session
  useEffect(() => {
    async function initAuth() {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        // If no user is logged in, default to Charlie Davis for instant preview interactivity
        try {
          const res = await api.login('charlie@example.com', 'password123');
          setCurrentUser(res.user);
        } catch {
          // ignore
        }
      }
    }
    initAuth();
  }, []);

  // Fetch static lookups
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catsRes, provRes, issuesRes, orgsRes, usersRes, statusRes] = await Promise.all([
          api.getCategories(),
          api.getProviders(),
          api.getKnownIssues(),
          api.getOrganizations(),
          api.getUsers(),
          api.getStatus().catch(() => null)
        ]);

        setCategories(catsRes.categories);
        setCategoryTree(catsRes.tree);
        setProviders(provRes);
        setKnownIssues(issuesRes);
        setOrganizations(orgsRes);
        setUsers(usersRes);
        if (statusRes) setDbStatus(statusRes);
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch items list
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getItems({
        q: searchQuery,
        category_id: selectedCategory,
        status: selectedStatus,
        min_condition: minCondition,
        min_price: minPrice,
        max_price: maxPrice
      });
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus, minCondition, minPrice, maxPrice]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load selected item detail
  const loadItemDetail = useCallback(async (id: number) => {
    try {
      const detail = await api.getItemById(id);
      setItemDetail(detail);
    } catch (err) {
      console.error('Failed to load item detail:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      loadItemDetail(selectedItemId);
    } else {
      setItemDetail(null);
    }
  }, [selectedItemId, loadItemDetail]);

  const handleSelectItem = (id: number) => {
    setSelectedItemId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedStatus('all');
    setMinCondition('');
    setMinPrice('');
    setMaxPrice('');
  };

  const handleSwitchUser = async (demoEmail: string) => {
    try {
      const res = await api.login(demoEmail, 'password123');
      setCurrentUser(res.user);
      if (selectedItemId) {
        loadItemDetail(selectedItemId);
      }
      loadItems();
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lifecycle_jwt_token');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenLogin={() => setAuthModalOpen(true)}
        onOpenRegisterItem={() => setRegisterModalOpen(true)}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setSelectedItemId(null);
        }}
        onSelectDemoItem={() => handleSelectItem(1)}
        dbStatus={dbStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {selectedItemId && itemDetail ? (
          <ItemDetailPage
            itemDetail={itemDetail}
            currentUser={currentUser}
            users={users}
            providers={providers}
            knownIssues={knownIssues}
            organizations={organizations}
            onBack={() => setSelectedItemId(null)}
            onRefresh={() => {
              loadItemDetail(selectedItemId);
              loadItems();
            }}
            onOpenLogin={() => setAuthModalOpen(true)}
          />
        ) : activeView === 'knowledge_base' ? (
          <RepairKbPage
            issues={knownIssues}
            providers={providers}
            categories={categories}
          />
        ) : (
          <MarketplacePage
            items={items}
            categories={categories}
            categoryTree={categoryTree}
            onSelectItem={handleSelectItem}
            onOpenRegister={() => setRegisterModalOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            minCondition={minCondition}
            setMinCondition={setMinCondition}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            onResetFilters={handleResetFilters}
          />
        )}
      </main>

      {/* Modals */}
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        categories={categories}
        onSuccess={(newItemId) => {
          setRegisterModalOpen(false);
          loadItems();
          handleSelectItem(newItemId);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          loadItems();
          if (selectedItemId) loadItemDetail(selectedItemId);
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-white text-sm">
              Second-Hand Lifecycle Tracker (Carfax for Everyday Items)
            </div>
            <p className="text-slate-500">
              Complete provenance tracking with MySQL 8, parameterized SQL, atomic multi-table writes & append-only history.
            </p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>MySQL 8 • Node.js • Express • React 19 • Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

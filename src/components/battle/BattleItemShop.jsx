import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Zap, Palette, TrendingUp, Gift, BookOpen, Check, Coins } from 'lucide-react';

const SHOP_ITEMS = {
  powerups: [
    { id: 'double_points', name: 'Double Points', desc: 'Next correct answer scores 2x', cost: 80, emoji: '⭐', consumable: true, qty: 1 },
    { id: 'freeze_opponent', name: 'Freeze Opponent', desc: 'Stun your opponent for 2 seconds', cost: 100, emoji: '❄️', consumable: true, qty: 1 },
    { id: 'reveal_hint', name: 'Reveal Hint', desc: 'Remove one wrong answer option', cost: 60, emoji: '💡', consumable: true, qty: 1 },
    { id: 'second_chance', name: 'Second Chance', desc: 'Get a retry if you answer wrong', cost: 120, emoji: '🔄', consumable: true, qty: 1 },
    { id: 'shield', name: 'Shield', desc: 'Block one opponent power-up', cost: 90, emoji: '🛡️', consumable: true, qty: 1 },
  ],
  customisation: [
    { id: 'title_quiz_master', name: 'Quiz Master', desc: 'Display "Quiz Master" title', cost: 200, emoji: '🎓', consumable: false },
    { id: 'title_top_1', name: 'Top 1% Title', desc: 'Exclusive elite title', cost: 500, emoji: '👑', consumable: false },
    { id: 'theme_fire', name: 'Fire Theme', desc: 'Fiery battle arena background', cost: 300, emoji: '🔥', consumable: false },
    { id: 'theme_space', name: 'Space Theme', desc: 'Cosmic battle arena', cost: 300, emoji: '🚀', consumable: false },
    { id: 'theme_electric', name: 'Electric Theme', desc: 'Lightning-charged arena', cost: 300, emoji: '⚡', consumable: false },
    { id: 'name_gold', name: 'Gold Name', desc: 'Your name glows gold in battles', cost: 250, emoji: '✨', consumable: false },
    { id: 'name_neon', name: 'Neon Name', desc: 'Neon cyan name colour', cost: 250, emoji: '💫', consumable: false },
    { id: 'frame_vip', name: 'VIP Frame', desc: 'Gold profile frame in battles', cost: 400, emoji: '🏅', consumable: false },
    { id: 'badge_vip', name: 'VIP Badge', desc: 'VIP badge on leaderboard', cost: 350, emoji: '💎', consumable: false },
  ],
  boosts: [
    { id: 'coin_multiplier', name: 'Coin Multiplier', desc: '2x coins earned in next battle', cost: 150, emoji: '🪙', consumable: true, qty: 1 },
    { id: 'streak_saver', name: 'Streak Saver', desc: 'Save your win streak once', cost: 180, emoji: '🔒', consumable: true, qty: 1 },
    { id: 'xp_boost', name: 'XP Boost', desc: 'Double XP for 24 hours', cost: 200, emoji: '📈', consumable: true, qty: 1 },
  ],
  boxes: [
    { id: 'loot_box_standard', name: 'Standard Box', desc: 'Random power-up or cosmetic', cost: 100, emoji: '📦', consumable: true, qty: 1, isBox: true },
    { id: 'loot_box_premium', name: 'Premium Box', desc: 'Rare chance for exclusive items', cost: 300, emoji: '🎁', consumable: true, qty: 1, isBox: true },
  ],
  study: [
    { id: 'hint_token', name: 'Hint Token', desc: 'Get a hint during practice quizzes', cost: 40, emoji: '📝', consumable: true, qty: 3 },
    { id: 'explanation_token', name: 'Explanation Token', desc: 'Reveal answer explanation', cost: 50, emoji: '📖', consumable: true, qty: 2 },
  ],
};

const LOOT_POOL = {
  standard: [
    { weight: 40, reward: { id: 'double_points', qty: 1, emoji: '⭐', name: 'Double Points' } },
    { weight: 30, reward: { id: 'freeze_opponent', qty: 1, emoji: '❄️', name: 'Freeze Opponent' } },
    { weight: 20, reward: { id: 'reveal_hint', qty: 1, emoji: '💡', name: 'Reveal Hint' } },
    { weight: 8, reward: { id: 'coins', qty: 50, emoji: '🪙', name: '50 Coins' } },
    { weight: 2, reward: { id: 'shield', qty: 1, emoji: '🛡️', name: 'Shield' } },
  ],
  premium: [
    { weight: 30, reward: { id: 'coin_multiplier', qty: 1, emoji: '🪙', name: 'Coin Multiplier' } },
    { weight: 25, reward: { id: 'second_chance', qty: 1, emoji: '🔄', name: 'Second Chance' } },
    { weight: 20, reward: { id: 'shield', qty: 1, emoji: '🛡️', name: 'Shield' } },
    { weight: 15, reward: { id: 'coins', qty: 150, emoji: '🪙', name: '150 Coins' } },
    { weight: 7, reward: { id: 'name_gold', qty: 1, emoji: '✨', name: 'Gold Name' } },
    { weight: 3, reward: { id: 'title_quiz_master', qty: 1, emoji: '🎓', name: 'Quiz Master Title' } },
  ],
};

function weightedRandom(pool) {
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * total;
  for (const item of pool) {
    rand -= item.weight;
    if (rand <= 0) return item.reward;
  }
  return pool[0].reward;
}

const CATEGORIES = [
  { key: 'powerups', label: 'Power-Ups', icon: Zap, color: 'from-amber-500 to-orange-500' },
  { key: 'customisation', label: 'Customisation', icon: Palette, color: 'from-purple-500 to-pink-500' },
  { key: 'boosts', label: 'Boosts', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
  { key: 'boxes', label: 'Reward Boxes', icon: Gift, color: 'from-blue-500 to-cyan-500' },
  { key: 'study', label: 'Study Items', icon: BookOpen, color: 'from-indigo-500 to-blue-500' },
];

export default function BattleItemShop({ userEmail }) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('powerups');
  const [lootResult, setLootResult] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  const { data: progressList = [] } = useQuery({
    queryKey: ['myProgress', userEmail],
    queryFn: () => base44.entities.StudentProgress.filter({ student_email: userEmail }),
    enabled: !!userEmail,
    refetchInterval: 10000,
  });

  const progress = progressList[0];
  const coins = progress?.battle_coins || 0;
  const inventory = (() => { try { return JSON.parse(progress?.topic_mastery?.__inventory || '{}'); } catch { return {}; } })();

  const buyMutation = useMutation({
    mutationFn: async (item) => {
      if (!progress) throw new Error('No progress record');
      if (coins < item.cost) throw new Error('Not enough coins');

      let reward = item;
      let resultMsg = null;

      // Handle loot boxes
      if (item.isBox) {
        const pool = item.id === 'loot_box_premium' ? LOOT_POOL.premium : LOOT_POOL.standard;
        reward = weightedRandom(pool);
        resultMsg = reward;
      }

      const newInventory = { ...inventory };
      const rewardId = reward.id;

      if (rewardId === 'coins') {
        // Add coins directly
        const newCoins = (coins - item.cost) + (reward.qty || 50);
        const newMastery = { ...(progress.topic_mastery || {}), __inventory: JSON.stringify(newInventory) };
        await base44.entities.StudentProgress.update(progress.id, {
          battle_coins: newCoins,
          topic_mastery: newMastery,
        });
      } else {
        // Add item to inventory
        if (item.consumable !== false) {
          newInventory[rewardId] = (newInventory[rewardId] || 0) + (reward.qty || 1);
        } else {
          newInventory[rewardId] = 1;
        }
        const newMastery = { ...(progress.topic_mastery || {}), __inventory: JSON.stringify(newInventory) };
        await base44.entities.StudentProgress.update(progress.id, {
          battle_coins: coins - item.cost,
          topic_mastery: newMastery,
        });
      }

      return resultMsg;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['myProgress', userEmail]);
      if (result) setLootResult(result);
      setPurchasing(null);
    },
    onError: (e) => {
      alert(e.message);
      setPurchasing(null);
    },
  });

  const items = SHOP_ITEMS[activeCategory] || [];

  return (
    <div className="space-y-5">
      {/* Loot result popup */}
      <AnimatePresence>
        {lootResult && (
          <motion.div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-slate-900 border border-white/20 rounded-3xl p-10 text-center max-w-xs w-full"
              initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260 }}>
              <div className="text-7xl mb-4">{lootResult.emoji}</div>
              <h3 className="text-2xl font-black text-white mb-2">You got:</h3>
              <p className="text-amber-400 font-bold text-xl mb-6">{lootResult.name}</p>
              <button onClick={() => setLootResult(null)}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black hover:brightness-110 transition-all">
                Collect!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Item Shop</h2>
            <p className="text-slate-400 text-xs">Spend coins on power-ups and cosmetics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2">
          <span className="text-xl">🪙</span>
          <span className="text-amber-400 font-black text-lg">{coins}</span>
        </div>
      </div>

      {/* Inventory summary */}
      {Object.keys(inventory).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Your Inventory</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(inventory).map(([id, qty]) => {
              const allItems = Object.values(SHOP_ITEMS).flat();
              const item = allItems.find(i => i.id === id);
              if (!item || qty === 0) return null;
              return (
                <div key={id} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
                  <span>{item.emoji}</span>
                  <span className="text-white text-xs font-bold">{item.name}</span>
                  {item.consumable !== false && <span className="text-amber-400 text-xs font-black">×{qty}</span>}
                  {item.consumable === false && <span className="text-emerald-400 text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeCategory === cat.key
                ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}>
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => {
          const owned = inventory[item.id] || 0;
          const alreadyOwned = item.consumable === false && owned > 0;
          const canAfford = coins >= item.cost;

          return (
            <motion.div key={item.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4 hover:bg-white/8 transition-all"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-3xl flex-shrink-0">{item.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm">{item.name}</p>
                  {item.consumable === false && alreadyOwned && (
                    <span className="text-xs text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-lg">Owned</span>
                  )}
                  {item.consumable !== false && owned > 0 && (
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-lg">×{owned}</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mb-3 leading-snug">{item.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🪙</span>
                    <span className="text-amber-400 font-black text-base">{item.cost}</span>
                  </div>
                  <button
                    onClick={() => { setPurchasing(item.id); buyMutation.mutate(item); }}
                    disabled={alreadyOwned || !canAfford || purchasing === item.id}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                      alreadyOwned
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                        : !canAfford
                        ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:brightness-110 shadow-lg shadow-purple-500/20'
                    }`}>
                    {alreadyOwned ? <><Check className="w-3 h-3" /> Owned</> : !canAfford ? 'Need coins' : purchasing === item.id ? '...' : 'Buy'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
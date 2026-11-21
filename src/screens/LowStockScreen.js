// src/screens/LowStockScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

export default function LowStockScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'low', 'out'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOwnerShopAndProducts();
  }, []);

  const fetchOwnerShopAndProducts = async () => {
    try {
      setRefreshing(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        await fetchProducts(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchProducts = async (currentShopId) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', currentShopId)
        .order('stock', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  // ကဏ္ဍ (Category) နှင့် အုပ်စု (Group) စာရင်းများ ထုတ်ယူခြင်း
  const categories = [
    'ALL',
    ...new Set(products.map((p) => (p.category || '').trim()).filter(Boolean)),
  ];

  const groupSource =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p) => (p.category || '').trim() === selectedCategory);

  const groups = [
    'ALL',
    ...new Set(
      groupSource.map((p) => (p.group_name || '').trim()).filter(Boolean)
    ),
  ];

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSelectedGroup('ALL');
  };

  // စစ်ထုတ်ခြင်း (အားလုံး၊ ပစ္စည်းကုန်ခါနီး > 0 နှင့် <= 2 ခု၊ ပစ္စည်းလုံးဝကုန်သွားသူ 0 ခု + ကဏ္ဍ + အုပ်စု)
  const filteredProducts = products.filter((item) => {
    const stock = parseInt(item.stock, 10) || 0;
    const itemCategory = (item.category || '').trim();
    const itemGroup = (item.group_name || '').trim();

    if (filterType === 'out' && stock !== 0) return false;
    if (filterType === 'low' && !(stock > 0 && stock <= 2)) return false;
    if (selectedCategory !== 'ALL' && itemCategory !== selectedCategory) return false;
    if (selectedGroup !== 'ALL' && itemGroup !== selectedGroup) return false;

    return true;
  });

  // လက်ကျန်စုစုပေါင်း အရေအတွက်
  const totalRemainingQty = filteredProducts.reduce(
    (sum, item) => sum + (parseInt(item.stock, 10) || 0),
    0
  );

  const resetFilters = () => {
    setFilterType('all');
    setSelectedCategory('ALL');
    setSelectedGroup('ALL');
  };

  const hasActiveFilter =
    filterType !== 'all' || selectedCategory !== 'ALL' || selectedGroup !== 'ALL';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>📦 ပစ္စည်းလက်ကျန် စာရင်း (Stock Inventory)</Text>
            <Text style={styles.headerSubtitle}>
              စုစုပေါင်း အမျိုးအစား ({products.length} မျိုး)
            </Text>
          </View>
        </View>
        {hasActiveFilter && (
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>ပြန်ရှင်းမည်</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, filterType === 'all' && styles.tabBtnActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.tabText, filterType === 'all' && styles.tabTextActive]}>
            အားလုံး ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterType === 'low' && styles.tabBtnActive]}
          onPress={() => setFilterType('low')}
        >
          <Text style={[styles.tabText, filterType === 'low' && styles.tabTextActive]}>
            လက်ကျန်နည်း (
            {
              products.filter((p) => {
                const s = parseInt(p.stock, 10) || 0;
                return s > 0 && s <= 2;
              }).length
            }
            )
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterType === 'out' && styles.tabBtnActive]}
          onPress={() => setFilterType('out')}
        >
          <Text style={[styles.tabText, filterType === 'out' && styles.tabTextActive]}>
            ကုန်သွားပြီ ({products.filter((p) => (parseInt(p.stock, 10) || 0) === 0).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category & Group Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>ကဏ္ဍ (Category):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipCategoryActive]}
                onPress={() => handleSelectCategory(cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat === 'ALL' ? 'ကဏ္ဍအားလုံး' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, { marginTop: 8 }]}>အုပ်စု (Group):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {groups.map((grp) => {
            const active = selectedGroup === grp;
            return (
              <TouchableOpacity
                key={grp}
                style={[styles.chip, active && styles.chipGroupActive]}
                onPress={() => setSelectedGroup(grp)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {grp === 'ALL' ? 'အုပ်စုအားလုံး' : grp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            ရွေးချယ်ထားသော အမျိုးအစား:{' '}
            <Text style={styles.summaryBold}>{filteredProducts.length} မျိုး</Text>
          </Text>
          <Text style={styles.summaryText}>
            လက်ကျန်စုစုပေါင်း:{' '}
            <Text style={styles.summaryHighlight}>{totalRemainingQty.toLocaleString()} ခု</Text>
          </Text>
        </View>
      </View>

      {/* Product List */}
      <View style={styles.content}>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const stock = parseInt(item.stock, 10) || 0;
            const isOut = stock === 0;
            const isLow = stock > 0 && stock <= 2;

            return (
              <View style={[styles.card, isOut ? styles.cardOut : isLow ? styles.cardLow : null]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCategory}>
                    🏷️ ကဏ္ဍ: {item.category || '-'} | အုပ်စု: {item.group_name || '-'}
                  </Text>
                  <Text style={styles.productPrice}>
                    ရောင်းဈေး: {parseFloat(item.price || 0).toLocaleString()} ကျပ်
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={[
                      styles.badge,
                      isOut ? styles.badgeOut : isLow ? styles.badgeLow : styles.badgeNormal,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {isOut ? 'ကုန်သွားပါပြီ' : `လက်ကျန်: ${stock} ခု`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဤစာရင်းတွင် ပြသမည့် ပစ္စည်း မရှိပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndProducts}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  resetBtn: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetBtnText: { fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#f1f3f5',
  },
  tabBtnActive: { backgroundColor: '#007bff' },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  tabTextActive: { color: '#fff' },
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipCategoryActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipGroupActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  summaryBar: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#4b5563',
  },
  summaryBold: {
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryHighlight: {
    fontWeight: 'bold',
    color: '#0f766e',
    fontSize: 13,
  },
  content: { flex: 1, padding: 15 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#28a745',
  },
  cardLow: { borderLeftColor: '#ffc107', backgroundColor: '#fffdf5' },
  cardOut: { borderLeftColor: '#dc3545', backgroundColor: '#fff8f8' },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  productCategory: { fontSize: 11, color: '#666', marginBottom: 2 },
  productPrice: { fontSize: 12, fontWeight: 'bold', color: '#007bff' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeNormal: { backgroundColor: '#e2f0d9' },
  badgeLow: { backgroundColor: '#fff3cd' },
  badgeOut: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
});
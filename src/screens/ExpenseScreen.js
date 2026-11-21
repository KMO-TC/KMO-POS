// src/screens/ExpenseScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

export default function ExpenseScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('daily'); // 'daily', 'monthly', 'yearly', 'custom'
  
  // Custom Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // Picker visibility states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOwnerShopAndExpenses();
  }, []);

  const fetchOwnerShopAndExpenses = async () => {
    try {
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        await fetchExpenseData(userData.shop_id, filterType);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchExpenseData = async (currentShopId, type) => {
    try {
      // expenses ဇယားမှ expense_date ဖြင့် အစဉ်လိုက်ဆွဲထုတ်ခြင်း
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('shop_id', currentShopId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const todayStr = new Date().toISOString().split('T')[0];

      // ကာလအလိုက် စစ်ထုတ်ခြင်း (Filter)
      const filtered = (data || []).filter(item => {
        const dateField = item.expense_date || item.created_at;
        if (!dateField) return false;

        const itemDate = new Date(dateField);
        const now = new Date();

        if (type === 'daily') {
          return dateField.startsWith(todayStr);
        } else if (type === 'monthly') {
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        } else if (type === 'yearly') {
          return itemDate.getFullYear() === now.getFullYear();
        } else if (type === 'custom') {
          const itemDateOnly = dateField.split('T')[0];
          const startStr = startDate.toISOString().split('T')[0];
          const endStr = endDate.toISOString().split('T')[0];
          return itemDateOnly >= startStr && itemDateOnly <= endStr;
        }
        return true;
      });

      setExpenses(filtered);
    } catch (error) {
      console.error('Error fetching expenses:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (shopId) {
      fetchExpenseData(shopId, type);
    }
  };

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleCustomFilterApply = () => {
    setFilterType('custom');
    if (shopId) {
      fetchExpenseData(shopId, 'custom');
    }
  };

  // စုစုပေါင်း အသုံးစရိတ် တွက်ချက်ခြင်း
  const totalExpenseAmount = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 10}}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>📉 အသုံးစရိတ် စာရင်း (Expenses)</Text>
            <Text style={styles.headerSubtitle}>စုစုပေါင်း မှတ်တမ်း ({expenses.length} ခု)</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, filterType === 'daily' && styles.tabBtnActive]}
          onPress={() => handleFilterChange('daily')}
        >
          <Text style={[styles.tabText, filterType === 'daily' && styles.tabTextActive]}>နေ့အလိုက်</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, filterType === 'monthly' && styles.tabBtnActive]}
          onPress={() => handleFilterChange('monthly')}
        >
          <Text style={[styles.tabText, filterType === 'monthly' && styles.tabTextActive]}>လအလိုက်</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, filterType === 'yearly' && styles.tabBtnActive]}
          onPress={() => handleFilterChange('yearly')}
        >
          <Text style={[styles.tabText, filterType === 'yearly' && styles.tabTextActive]}>နှစ်အလိုက်</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, filterType === 'custom' && styles.tabBtnActive]}
          onPress={() => setFilterType('custom')}
        >
          <Text style={[styles.tabText, filterType === 'custom' && styles.tabTextActive]}>စိတ်ကြိုက်</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Date Range Picker UI */}
      {filterType === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={{flex: 1, marginRight: 4}}>
            <Text style={styles.dateLabel}>စတင်မည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#dc3545" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{startDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>

          <View style={{flex: 1, marginHorizontal: 4}}>
            <Text style={styles.dateLabel}>ပြီးဆုံးမည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#dc3545" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{endDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.filterApplyBtn} onPress={handleCustomFilterApply}>
            <Text style={styles.filterApplyText}>ရှာမည်</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DateTimePicker Modals */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={onChangeStartDate}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={onChangeEndDate}
        />
      )}

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: '#dc3545' }]}>
          <Text style={styles.summaryLabel}>
            {filterType === 'daily' ? 'ယနေ့ စုစုပေါင်းအသုံးစရိတ်' : filterType === 'monthly' ? 'ယခုလ စုစုပေါင်းအသုံးစရိတ်' : filterType === 'yearly' ? 'ယခုနှစ် စုစုပေါင်းအသုံးစရိတ်' : 'သတ်မှတ်ရက် စုစုပေါင်းအသုံးစရိတ်'}
          </Text>
          <Text style={[styles.summaryValue, { color: '#dc3545' }]}>{totalExpenseAmount.toLocaleString()} ကျပ်</Text>
        </View>
      </View>

      {/* Expense List */}
      <View style={styles.content}>
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const amount = parseFloat(item.amount) || 0;
            return (
              <View style={styles.card}>
                <View style={{flex: 1}}>
                  <Text style={styles.expenseTitle}>📌 {item.title || 'အသုံးစရိတ်'}</Text>
                  <Text style={styles.expenseDate}>🕒 {item.expense_date ? new Date(item.expense_date).toLocaleDateString() : '-'}</Text>
                </View>
                <Text style={styles.expenseAmount}>- {amount.toLocaleString()} ကျပ်</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဤကာလအတွက် အသုံးစရိတ် စာရင်း မရှိသေးပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndExpenses}
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
  tabBtnActive: { backgroundColor: '#dc3545' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  tabTextActive: { color: '#fff' },
  customDateContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateLabel: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  datePickerBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    paddingHorizontal: 8,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerText: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  filterApplyBtn: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 6,
  },
  filterApplyText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  summaryContainer: { padding: 15, paddingBottom: 5 },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    elevation: 2,
    borderLeftWidth: 5,
  },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 15, paddingTop: 5 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  expenseTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  expenseDate: { fontSize: 11, color: '#666' },
  expenseAmount: { fontSize: 15, fontWeight: 'bold', color: '#dc3545' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
});
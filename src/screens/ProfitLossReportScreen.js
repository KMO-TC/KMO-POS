// src/screens/ProfitLossReportScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
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
import { loadServices } from '../services/offlineStore';

export default function ProfitLossReportScreen({ navigation }) {
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('daily');
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [totalSalesProfit, setTotalSalesProfit] = useState(0);
  const [totalServicesProfit, setTotalServicesProfit] = useState(0);
  const [totalTransactionFee, setTotalTransactionFee] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOwnerShopAndReports();
  }, []);

  const fetchOwnerShopAndReports = async () => {
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
        await calculateFinancials(userData.shop_id, filterType);
      }
    } catch (error) {
      console.error('Error fetching shop and reports:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const calculateFinancials = async (currentShopId, type) => {
    try {
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .eq('shop_id', currentShopId);
      if (salesErr) throw salesErr;

      const servicesData = await loadServices(currentShopId);
      const { data: transData } = await supabase.from('transactions').select('*').eq('shop_id', currentShopId);
      const { data: expData } = await supabase.from('expenses').select('*').eq('shop_id', currentShopId);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const filterByDate = (item) => {
        const dateField = item.created_at;
        if (!dateField) return false;
        
        const itemDate = new Date(dateField);
        const itemDateStr = dateField.split('T')[0];

        if (type === 'daily') {
          return itemDateStr === todayStr;
        } else if (type === 'monthly') {
          return (
            itemDate.getMonth() === currentMonth &&
            itemDate.getFullYear() === currentYear
          );
        } else if (type === 'yearly') {
          return itemDate.getFullYear() === currentYear;
        } else if (type === 'custom') {
          const startStr = startDate.toISOString().split('T')[0];
          const endStr = endDate.toISOString().split('T')[0];
          return itemDateStr >= startStr && itemDateStr <= endStr;
        }
        return true;
      };

      const filteredSales = (salesData || []).filter(filterByDate);
      const filteredServices = (servicesData || []).filter(filterByDate);
      const filteredTrans = (transData || []).filter(filterByDate);
      const filteredExp = (expData || []).filter(filterByDate);

      const salesProfitSum = filteredSales.reduce((sum, item) => {
        const totalPrc = parseFloat(item.total_price) || parseFloat(item.selling_price) || 0;
        const costPrc = parseFloat(item.cost_price) || 0;
        const profitCol = parseFloat(item.total_profit);

        let itemProfit = 0;
        if (!isNaN(profitCol) && profitCol !== 0) {
          itemProfit = profitCol;
        } else {
          itemProfit = totalPrc - costPrc;
        }

        return sum + (isNaN(itemProfit) ? 0 : itemProfit);
      }, 0);

      const servicesProfitSum = filteredServices.reduce((sum, item) => {
        const fee = parseFloat(item.service_fee) || parseFloat(item.services_fee) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        const profitCol = parseFloat(item.profit);
        const itemProfit = !isNaN(profitCol) ? profitCol : (fee - cost);
        return sum + (isNaN(itemProfit) ? 0 : itemProfit);
      }, 0);

      const transFeeSum = filteredTrans.reduce((sum, item) => sum + (parseFloat(item.fee) || 0), 0);
      const expensesSum = filteredExp.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

      setTotalSalesProfit(salesProfitSum);
      setTotalServicesProfit(servicesProfitSum);
      setTotalTransactionFee(transFeeSum);
      setTotalExpenses(expensesSum);

    } catch (error) {
      console.error('Error calculating financials:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleFilterChange = (typeKey) => {
    setFilterType(typeKey);
    if (shopId) {
      calculateFinancials(shopId, typeKey);
    }
  };

  const handleCustomFilterApply = () => {
    setFilterType('custom');
    if (shopId) {
      calculateFinancials(shopId, 'custom');
    }
  };

  const grossProfit = totalSalesProfit + totalServicesProfit + totalTransactionFee;
  const netProfit = grossProfit - totalExpenses;

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
            <Text style={styles.headerTitle}>📈 အမြတ်အရှုံး စာရင်းရှင်းတန်း (P & L)</Text>
            <Text style={styles.headerSubtitle}>ဆိုင်တစ်ဆိုင်လုံး၏ နောက်ဆုံးပိတ် အမြတ်/အရှုံး</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'daily' && styles.tabBtnActive]} onPress={() => handleFilterChange('daily')}>
          <Text style={[styles.tabText, filterType === 'daily' && styles.tabTextActive]}>နေ့အလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'monthly' && styles.tabBtnActive]} onPress={() => handleFilterChange('monthly')}>
          <Text style={[styles.tabText, filterType === 'monthly' && styles.tabTextActive]}>လအလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'yearly' && styles.tabBtnActive]} onPress={() => handleFilterChange('yearly')}>
          <Text style={[styles.tabText, filterType === 'yearly' && styles.tabTextActive]}>နှစ်အလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'custom' && styles.tabBtnActive]} onPress={() => setFilterType('custom')}>
          <Text style={[styles.tabText, filterType === 'custom' && styles.tabTextActive]}>စိတ်ကြိုက်</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Date Range Picker */}
      {filterType === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={{flex: 1, marginRight: 4}}>
            <Text style={styles.dateLabel}>စတင်မည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#007bff" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{startDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>
          <View style={{flex: 1, marginHorizontal: 4}}>
            <Text style={styles.dateLabel}>ပြီးဆုံးမည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#007bff" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{endDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.filterApplyBtn} onPress={handleCustomFilterApply}>
            <Text style={styles.filterApplyText}>ရှာမည်</Text>
          </TouchableOpacity>
        </View>
      )}

      {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(Platform.OS === 'ios'); if(d) setStartDate(d); }} />}
      {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(Platform.OS === 'ios'); if(d) setEndDate(d); }} />}

      {/* Report Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>📥 ဝင်ငွေနှင့် အမြတ်အစွန်းများ (Incomes & Profits)</Text>
        
        <View style={styles.rowCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="cube-outline" size={20} color="#007bff" style={{marginRight: 8}} />
            <Text style={styles.rowLabel}>ပစ္စည်းရောင်းချမှု အမြတ်</Text>
          </View>
          <Text style={[styles.rowValue, { color: '#007bff' }]}>+ {totalSalesProfit.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={styles.rowCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="construct-outline" size={20} color="#28a745" style={{marginRight: 8}} />
            <Text style={styles.rowLabel}>ဝန်ဆောင်မှု (Services) အမြတ်</Text>
          </View>
          <Text style={[styles.rowValue, { color: '#28a745' }]}>+ {totalServicesProfit.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={styles.rowCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="card-outline" size={20} color="#17a2b8" style={{marginRight: 8}} />
            <Text style={styles.rowLabel}>ငွေသွင်း/ငွေထုတ်ခ (Fee)</Text>
          </View>
          <Text style={[styles.rowValue, { color: '#17a2b8' }]}>+ {totalTransactionFee.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={styles.subTotalCard}>
          <Text style={styles.subTotalLabel}>စုစုပေါင်း အသားတင် အမြတ်ကြမ်း (Gross Profit)</Text>
          <Text style={styles.subTotalValue}>{grossProfit.toLocaleString()} ကျပ်</Text>
        </View>

        <Text style={styles.sectionTitle}>📤 ကုန်ကျစရိတ်များ (Expenses)</Text>

        <View style={styles.rowCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="trending-down-outline" size={20} color="#dc3545" style={{marginRight: 8}} />
            <Text style={styles.rowLabel}>ဆိုင်အသုံးစရိတ် စုစုပေါင်း</Text>
          </View>
          <Text style={[styles.rowValue, { color: '#dc3545' }]}>- {totalExpenses.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={[styles.finalCard, { backgroundColor: netProfit >= 0 ? '#e2f0d9' : '#f8d7da', borderColor: netProfit >= 0 ? '#28a745' : '#dc3545' }]}>
          <Text style={[styles.finalLabel, { color: netProfit >= 0 ? '#28a745' : '#dc3545' }]}>
            🏆 နောက်ဆုံးပိတ် အသားတင် အမြတ် (Net Profit)
          </Text>
          <Text style={[styles.finalValue, { color: netProfit >= 0 ? '#28a745' : '#dc3545' }]}>
            {netProfit >= 0 ? '+ ' : ''}{netProfit.toLocaleString()} ကျပ်
          </Text>
        </View>

        <View style={{height: 30}} />
      </ScrollView>

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
    marginHorizontal: 2,
    backgroundColor: '#f1f3f5',
  },
  tabBtnActive: { backgroundColor: '#007bff' },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
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
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 6,
  },
  filterApplyText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 10 },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rowLabel: { fontSize: 13, color: '#333', fontWeight: '500' },
  rowValue: { fontSize: 14, fontWeight: 'bold' }, // 👈 ဤနေရာတွင် string '14' ပါနေရာမှ နံပါတ် 14 သို့ ပြင်ဆင်ပြီးပါပြီ
  subTotalCard: {
    backgroundColor: '#e9ecef',
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  subTotalLabel: { fontSize: 12, color: '#495050', fontWeight: 'bold', marginBottom: 4 },
  subTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  finalCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    elevation: 3,
  },
  finalLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  finalValue: { fontSize: 24, fontWeight: 'bold' },
});
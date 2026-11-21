// src/screens/TransactionScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

export default function TransactionScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('daily'); // 'daily', 'monthly', 'yearly', 'custom'
  
  // Custom Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State (Add Transaction)
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('deposit'); // 'deposit' (ငွေသွင်း) သို့မဟုတ် 'withdraw' (ငွေထုတ်)
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('KBZPay'); // ငွေပေးချေသည့်နည်းလမ်း
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const paymentMethodsList = ['Cash', 'KBZPay', 'CB Pay', 'AYA Pay', 'WaveMoney'];

  useEffect(() => {
    fetchOwnerShopAndTransactions();
  }, []);

  const fetchOwnerShopAndTransactions = async () => {
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
        await fetchTransactionsData(userData.shop_id, filterType);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTransactionsData = async (currentShopId, currentFilter) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('shop_id', currentShopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const todayStr = new Date().toISOString().split('T')[0];

      const filtered = (data || []).filter(item => {
        const dateField = item.created_at;
        if (!dateField) return false;

        const itemDate = new Date(dateField);
        const now = new Date();

        if (currentFilter === 'daily') {
          return dateField.startsWith(todayStr);
        } else if (currentFilter === 'monthly') {
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        } else if (currentFilter === 'yearly') {
          return itemDate.getFullYear() === now.getFullYear();
        } else if (currentFilter === 'custom') {
          const itemDateOnly = dateField.split('T')[0];
          const startStr = startDate.toISOString().split('T')[0];
          const endStr = endDate.toISOString().split('T')[0];
          return itemDateOnly >= startStr && itemDateOnly <= endStr;
        }
        return true;
      });

      setTransactions(filtered);
    } catch (error) {
      console.error('Error fetching transactions:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleFilterChange = (typeKey) => {
    setFilterType(typeKey);
    if (shopId) {
      fetchTransactionsData(shopId, typeKey);
    }
  };

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setStartDate(selectedDate);
  };

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleCustomFilterApply = () => {
    setFilterType('custom');
    if (shopId) {
      fetchTransactionsData(shopId, 'custom');
    }
  };

  const handleOpenModal = () => {
    setType('deposit');
    setAmount('');
    setFee('');
    setPaymentMethod('KBZPay');
    setCustomerName('');
    setPhone('');
    setNote('');
    setModalVisible(true);
  };

  const handleSaveTransaction = async () => {
    if (!amount.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ငွေပမာဏ ထည့်သွင်းပါ။');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shop_id: shopId,
        type: type, // 'deposit' သို့မဟုတ် 'withdraw'
        amount: parseFloat(amount) || 0,
        fee: parseFloat(fee) || 0,
        payment_method: paymentMethod,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        note: note.trim(),
      };

      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) throw error;

      Alert.alert('အောင်မြင်သည်', 'ငွေပေးငွေချေ မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ။');
      setModalVisible(false);
      fetchTransactionsData(shopId, filterType);
    } catch (error) {
      console.error('Error saving transaction:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // စုစုပေါင်း တွက်ချက်ခြင်း
  const totalDeposit = transactions
    .filter(item => item.type === 'deposit')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const totalWithdraw = transactions
    .filter(item => item.type === 'withdraw')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const totalFee = transactions
    .reduce((sum, item) => sum + (parseFloat(item.fee) || 0), 0);

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
            <Text style={styles.headerTitle}>💳 ငွေပေးငွေချေ မှတ်တမ်း </Text>
            <Text style={styles.headerSubtitle}>စုစုပေါင်း ({transactions.length} ခု)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>အသစ်</Text>
        </TouchableOpacity>
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

      {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={onChangeStartDate} />}
      {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={onChangeEndDate} />}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
          <View style={[styles.summaryCard, { borderLeftColor: '#28a745', flex: 1, marginRight: 4 }]}>
            <Text style={styles.summaryLabel}>စုစုပေါင်း ငွေသွင်း</Text>
            <Text style={[styles.summaryValue, { color: '#28a745' }]}>{totalDeposit.toLocaleString()} ကျပ်</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#dc3545', flex: 1, marginLeft: 4 }]}>
            <Text style={styles.summaryLabel}>စုစုပေါင်း ငွေထုတ်</Text>
            <Text style={[styles.summaryValue, { color: '#dc3545' }]}>{totalWithdraw.toLocaleString()} ကျပ်</Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#007bff' }]}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း ထုတ်ခ / သွင်းခ (Fee)</Text>
          <Text style={[styles.summaryValue, { color: '#007bff' }]}>{totalFee.toLocaleString()} ကျပ်</Text>
        </View>
      </View>

      {/* Transaction List */}
      <View style={styles.content}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isDeposit = item.type === 'deposit';
            const amountVal = parseFloat(item.amount) || 0;
            const feeVal = parseFloat(item.fee) || 0;

            return (
              <View style={[styles.card, { borderLeftColor: isDeposit ? '#28a745' : '#dc3545' }]}>
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                    <View style={[styles.badge, { backgroundColor: isDeposit ? '#e2f0d9' : '#f8d7da' }]}>
                      <Text style={[styles.badgeText, { color: isDeposit ? '#28a745' : '#dc3545' }]}>
                        {isDeposit ? '📥 ငွေသွင်း' : '📤 ငွေထုတ်'}
                      </Text>
                    </View>
                    <Text style={styles.methodText}> ပေးချေမှု: {item.payment_method}</Text>
                  </View>

                  <Text style={styles.customerText}>👤 {item.customer_name || 'ဖောက်သည်အမည်မရှိ'} ({item.phone || '-'})</Text>
                  {item.note ? <Text style={styles.noteText}>📝 မှတ်ချက်: {item.note}</Text> : null}
                  <Text style={styles.dateText}>🕒 {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</Text>
                </View>

                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.amountText, { color: isDeposit ? '#28a745' : '#dc3545' }]}>
                    {isDeposit ? '+' : '-'}{amountVal.toLocaleString()} ကျပ်
                  </Text>
                  <Text style={styles.feeText}>ခ: {feeVal.toLocaleString()} ကျပ်</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဤကာလအတွက် ငွေပေးငွေချေ မှတ်တမ်း မရှိသေးပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndTransactions}
        />
      </View>

      {/* Add Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>💳 ငွေသွင်း / ငွေထုတ် မှတ်တမ်းအသစ်</Text>
              
              {/* Type Switcher */}
              <View style={styles.typeContainer}>
                <TouchableOpacity 
                  style={[styles.typeBtn, type === 'deposit' && styles.depositActive]} 
                  onPress={() => setType('deposit')}
                >
                  <Text style={[styles.typeText, type === 'deposit' && styles.typeTextActive]}>📥 ငွေသွင်း</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, type === 'withdraw' && styles.withdrawActive]} 
                  onPress={() => setType('withdraw')}
                >
                  <Text style={[styles.typeText, type === 'withdraw' && styles.typeTextActive]}>📤 ငွေထုတ်</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>ငွေပမာဏ (Amount - ကျပ်)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888" value={amount} onChangeText={setAmount} keyboardType="numeric" />

              <Text style={styles.label}>ထုတ်ခ / သွင်းခ (Fee - ကျပ်)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888" value={fee} onChangeText={setFee} keyboardType="numeric" />

              <Text style={styles.label}>ငွေပေးချေသည့်နည်းလမ်း (Payment Method)</Text>
              <View style={styles.methodsRow}>
                {paymentMethodsList.map(method => (
                  <TouchableOpacity 
                    key={method} 
                    style={[styles.methodChip, paymentMethod === method && styles.methodChipActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.methodChipText, paymentMethod === method && styles.methodChipTextActive]}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>ဖောက်သည်အမည် (Customer Name)</Text>
              <TextInput style={styles.input} placeholder="အမည်" placeholderTextColor="#888" value={customerName} onChangeText={setCustomerName} />

              <Text style={styles.label}>ဖုန်းနံပါတ် (Phone)</Text>
              <TextInput style={styles.input} placeholder="ဖုန်းနံပါတ်" placeholderTextColor="#888" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>မှတ်ချက် (Note)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="အသေးစိတ်မှတ်ချက်"
                placeholderTextColor="#888"
                value={note}
                onChangeText={setNote}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveTransaction} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>သိမ်းဆည်းမည်</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  addBtn: { flexDirection: 'row', backgroundColor: '#007bff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
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
  summaryContainer: { padding: 15, paddingBottom: 5 },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    elevation: 2,
    borderLeftWidth: 5,
  },
  summaryLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
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
    borderLeftWidth: 5,
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  methodText: { fontSize: 11, color: '#666', fontWeight: 'bold' },
  customerText: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#555', marginBottom: 2 },
  dateText: { fontSize: 10, color: '#888' },
  amountText: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  feeText: { fontSize: 11, color: '#007bff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  typeContainer: { flexDirection: 'row', marginBottom: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f1f3f5' },
  depositActive: { backgroundColor: '#28a745' },
  withdrawActive: { backgroundColor: '#dc3545' },
  typeText: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  typeTextActive: { color: '#fff' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#333', height: 42 },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  methodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', marginRight: 6, marginBottom: 6, backgroundColor: '#f8f9fa' },
  methodChipActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  methodChipText: { fontSize: 11, color: '#333', fontWeight: 'bold' },
  methodChipTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 8 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
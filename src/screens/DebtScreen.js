// src/screens/DebtScreen.js
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

export default function DebtScreen({ navigation }) {
  const [debts, setDebts] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [activeTab, setActiveTab] = useState('receivable'); // 'receivable' (ရရန်) သို့မဟုတ် 'payable' (ပေးရန်)
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State (Add Debt)
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('receivable');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(''); // 👈 မှတ်ချက်အသစ် (ဘာအတွက်လဲ)
  
  // Due Date Picker States
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchOwnerShopAndDebts();
  }, []);

  const fetchOwnerShopAndDebts = async () => {
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
        await fetchDebtsData(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDebtsData = async (currentShopId) => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('shop_id', currentShopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('Error fetching debts:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleOpenModal = (defaultType) => {
    setType(defaultType);
    setPersonName('');
    setPhone('');
    setAmount('');
    setNote('');
    setDueDate(new Date());
    setModalVisible(true);
  };

  const onChangeDueDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDueDate(selectedDate);
  };

  const handleSaveDebt = async () => {
    if (!personName.trim() || !amount.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'အမည်နှင့် ငွေပမာဏ ထည့်သွင်းပါ။');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shop_id: shopId,
        type: type, // 'receivable' သို့မဟုတ် 'payable'
        person_name: personName.trim(),
        phone: phone.trim(),
        amount: parseFloat(amount) || 0,
        note: note.trim(), // 👈 မှတ်ချက်သိမ်းရန်
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      };

      const { error } = await supabase.from('debts').insert([payload]);
      if (error) throw error;

      Alert.alert('အောင်မြင်သည်', 'အကြွေးစာရင်း သိမ်းဆည်းပြီးပါပြီ။');
      setModalVisible(false);
      fetchDebtsData(shopId);
    } catch (error) {
      console.error('Error saving debt:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ရှင်းပြီး/ကျေပြီး အဖြစ်သို့ ပြောင်းလဲရန် သေချာမှုရှိမရှိ စစ်ဆေးခြင်း (Alert)
  const handleToggleStatus = (item) => {
    const isPaid = item.status === 'paid';
    const actionText = isPaid ? 'မရှင်းရသေးသည့် အခြေအနေသို့ ပြန်ပြောင်းရန်' : 'အကြွေးရှင်းပြီး / ကျေပြီးအဖြစ် သတ်မှတ်ရန်';
    
    Alert.alert(
      'အတည်ပြုချက် (Confirmation)',
      `"${item.person_name}" ၏ အကြွေးကို ${actionText} သေချာပါသလား?`,
      [
        { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
        { 
          text: 'သေချာပါသည်', 
          onPress: async () => {
            const newStatus = isPaid ? 'pending' : 'paid';
            try {
              const { error } = await supabase
                .from('debts')
                .update({ status: newStatus })
                .eq('id', item.id);

              if (error) throw error;
              fetchDebtsData(shopId);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          } 
        }
      ]
    );
  };

  const handleDeleteDebt = async (id) => {
    Alert.alert('အကြွေးစာရင်း ဖျက်ရန်', 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?', [
      { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
      { 
        text: 'ဖျက်မည်', 
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('debts').delete().eq('id', id);
            if (error) throw error;
            fetchDebtsData(shopId);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        } 
      }
    ]);
  };

  const filteredDebts = debts.filter(item => item.type === activeTab);

  const totalAmount = filteredDebts
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

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
            <Text style={styles.headerTitle}>📒 အကြွေးစာရင်း </Text>
            <Text style={styles.headerSubtitle}>ရရန်/ပေးရန် စီမံခန့်ခွဲမှု</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal(activeTab)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>အသစ်</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tabs (ရရန် / ပေးရန်) */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity 
          style={[styles.mainTabBtn, activeTab === 'receivable' && styles.receivableActive]} 
          onPress={() => setActiveTab('receivable')}
        >
          <Text style={[styles.mainTabText, activeTab === 'receivable' && styles.mainTabTextActive]}>📥 အကြွေးရရန် (Receivable)</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mainTabBtn, activeTab === 'payable' && styles.payableActive]} 
          onPress={() => setActiveTab('payable')}
        >
          <Text style={[styles.mainTabText, activeTab === 'payable' && styles.mainTabTextActive]}>📤 အကြွေးပေးရန် (Payable)</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: activeTab === 'receivable' ? '#28a745' : '#dc3545' }]}>
          <Text style={styles.summaryLabel}>
            {activeTab === 'receivable' ? 'ရှင်းရန်ကျန် သို့ ရရန်ရှိစုစုပေါင်း' : 'ရှင်းရန်ကျန် သို့ ပေးရန်ရှိစုစုပေါင်း'}
          </Text>
          <Text style={[styles.summaryValue, { color: activeTab === 'receivable' ? '#28a745' : '#dc3545' }]}>
            {totalAmount.toLocaleString()} ကျပ်
          </Text>
        </View>
      </View>

      {/* Debt List */}
      <View style={styles.content}>
        <FlatList
          data={filteredDebts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isPaid = item.status === 'paid';
            const amountVal = parseFloat(item.amount) || 0;

            return (
              <View style={[styles.card, isPaid && styles.cardPaid]}>
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                    <Text style={styles.personName}>👤 {item.person_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#e2f0d9' : '#fff3cd' }]}>
                      <Text style={[styles.statusText, { color: isPaid ? '#28a745' : '#856404' }]}>
                        {isPaid ? 'ရှင်းပြီး' : 'မရှင်းရသေး'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.phoneText}>📞 {item.phone || 'ဖုန်းနံပါတ်မပါ'}</Text>
                  {item.note ? <Text style={styles.noteText}>📝 အကြောင်းအရာ: {item.note}</Text> : null}
                  <Text style={styles.dueDateText}>⏰ ပေးချေရန်ရက်: {item.due_date || '-'}</Text>
                </View>

                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.amountText, { color: isPaid ? '#888' : (activeTab === 'receivable' ? '#28a745' : '#dc3545') }]}>
                    {amountVal.toLocaleString()} ကျပ်
                  </Text>
                  
                  {/* "ရှင်းပြီး" ခလုတ်နှင့် ဖျက်ရန်ခလုတ် */}
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                    <TouchableOpacity 
                      style={[styles.paidActionBtn, isPaid ? styles.paidBtnActive : styles.paidBtnPending]} 
                      onPress={() => handleToggleStatus(item)}
                    >
                      <Ionicons name={isPaid ? "checkmark-done" : "checkmark"} size={14} color="#fff" style={{marginRight: 2}} />
                      <Text style={styles.paidBtnText}>{isPaid ? 'ရှင်းပြီး' : 'ရှင်းမည်'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDeleteDebt(item.id)}>
                      <Ionicons name="trash-outline" size={18} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဤစာရင်းတွင် မှတ်တမ်း မရှိသေးပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndDebts}
        />
      </View>

      {/* Add Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {type === 'receivable' ? '📥 အကြွေးရရန် အသစ်ထည့်ရန်' : '📤 အကြွေးပေးရန် အသစ်ထည့်ရန်'}
              </Text>
              
              <Text style={styles.label}>အမည် (Customer / Supplier Name)</Text>
              <TextInput style={styles.input} placeholder="အမည်" placeholderTextColor="#888" value={personName} onChangeText={setPersonName} />

              <Text style={styles.label}>ဖုန်းနံပါတ် (Phone)</Text>
              <TextInput style={styles.input} placeholder="ဖုန်းနံပါတ်" placeholderTextColor="#888" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>ငွေပမာဏ (Amount - ကျပ်)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888" value={amount} onChangeText={setAmount} keyboardType="numeric" />

              <Text style={styles.label}>မှတ်ချက် / ဘာအတွက်လဲ (Note)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="ဥပမာ - ကုန်ပစ္စည်းဝယ်ရန် / လက်စွပ်ဖိုး"
                placeholderTextColor="#888"
                value={note}
                onChangeText={setNote}
                multiline
              />

              <Text style={styles.label}>ပေးချေရမည့်ရက် (Due Date)</Text>
              <TouchableOpacity style={styles.datePickerBtnModal} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#007bff" style={{marginRight: 6}} />
                <Text style={styles.datePickerTextModal}>{dueDate.toISOString().split('T')[0]}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker value={dueDate} mode="date" display="default" onChange={onChangeDueDate} />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveDebt} disabled={loading}>
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
  mainTabContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  mainTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#f1f3f5', marginHorizontal: 4 },
  receivableActive: { backgroundColor: '#28a745' },
  payableActive: { backgroundColor: '#dc3545' },
  mainTabText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  mainTabTextActive: { color: '#fff' },
  summaryContainer: { padding: 15, paddingBottom: 5 },
  summaryCard: { backgroundColor: '#fff', padding: 14, borderRadius: 10, elevation: 2, borderLeftWidth: 5 },
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
    borderLeftWidth: 5,
    borderLeftColor: '#007bff',
  },
  cardPaid: { backgroundColor: '#fcfcfc', opacity: 0.8 },
  personName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginRight: 8 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  phoneText: { fontSize: 11, color: '#666', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#555', marginBottom: 2, fontStyle: 'italic' },
  dueDateText: { fontSize: 11, color: '#888' },
  amountText: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  paidActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  paidBtnPending: { backgroundColor: '#007bff' },
  paidBtnActive: { backgroundColor: '#28a745' },
  paidBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  actionIconBtn: { padding: 4 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#333', height: 42 },
  datePickerBtnModal: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  datePickerTextModal: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 8 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
// src/screens/OwnerDashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { confirmAndSignOut, showSignOutError } from '../services/authActions';
import {
  getCachedShop,
  getCachedUserProfile,
  isNetworkError,
  saveShop,
  saveUserProfile,
} from '../services/offlineStore';

export default function OwnerDashboardScreen({ navigation }) {
  const [shopInfo, setShopInfo] = useState(null);

  const fetchOwnerShopInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      let userData;
      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (userError) {
        if (!isNetworkError(userError)) throw userError;
        userData = await getCachedUserProfile(user.id);
      } else {
        userData = data;
        await saveUserProfile(user.id, data);
      }

      if (userData?.shop_id) {
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', userData.shop_id)
          .single();

        if (shopError) {
          if (!isNetworkError(shopError)) throw shopError;
          setShopInfo(await getCachedShop(userData.shop_id));
        } else {
          setShopInfo(shopData);
          if (shopData) await saveShop(userData.shop_id, shopData);
        }
      }
    } catch (error) {
      console.error('Error fetching shop info:', error.message);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchOwnerShopInfo);
  }, [fetchOwnerShopInfo]);

  const handleLogout = async () => {
    try {
      await confirmAndSignOut();
    } catch (error) {
      showSignOutError(error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Owner Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {shopInfo ? shopInfo.shop_name : 'ဆိုင်ရှင် စီမံခန့်ခွဲမှု မဏ္ဍိုင်'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LanguageSwitcher style={{ marginRight: 8 }} />
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#D0021B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.gridContainer}>


        {/* ၂။ ပစ္စည်းစာရင်း (Product Inventory Screen သို့ သွားမည်) */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SellerPOS')}>
            <View style={[styles.iconBox, { backgroundColor: '#e8f8f0' }]}>
              <Ionicons name="cart" size={24} color="#28a745" />
            </View>
            <Text style={styles.cardTitle}>ကောင်တာ</Text>
            <Text style={styles.cardDesc}>ရောင်း/ ဝယ် / ပစ္စည်းစာရင်း</Text>
          </TouchableOpacity>


           {/* ၂။ ပစ္စည်းစာရင်း (Product Inventory Screen သို့ သွားမည်) */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductInventory')}>
            <View style={[styles.iconBox, { backgroundColor: '#e8f8f0' }]}>
              <Ionicons name="cube" size={24} color="#28a745" />
            </View>
            <Text style={styles.cardTitle}>ပစ္စည်းစာရင်း</Text>
            <Text style={styles.cardDesc}>အမည် / အမျိုးအစား / အုပ်စု</Text>
          </TouchableOpacity>
          
          {/* ၁။ အရောင်းစာရင်း */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SalesReport')}>
            <View style={[styles.iconBox, { backgroundColor: '#eef6ff' }]}>
              <Ionicons name="bar-chart" size={24} color="#007bff" />
            </View>
            <Text style={styles.cardTitle}>အရောင်းစာရင်း</Text>
            <Text style={styles.cardDesc}>နေ့စဉ် / လစဉ် / နှစ်အလိုက်</Text>
          </TouchableOpacity>

         

          {/* ၃။ အရောင်းအမြတ်စာရင်း */}
          {/* <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProfitReport')}>
            <View style={[styles.iconBox, { backgroundColor: '#fff5e6' }]}>
              <Ionicons name="trending-up" size={24} color="#ff9800" />
            </View>
            <Text style={styles.cardTitle}> အမြတ်စာရင်း</Text>
            <Text style={styles.cardDesc}>ရောင်းချမှုအမြတ်ငွေများ</Text>
          </TouchableOpacity> */}

          {/* ၇။ Service စာရင်း */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ServicesReport')}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f7fa' }]}>
              <FontAwesome5 name="tools" size={20} color="#00acc1" />
            </View>
            <Text style={styles.cardTitle}>Service စာရင်း</Text>
            <Text style={styles.cardDesc}>ဖုန်းပြင်ဆိုင်ရာ Service စနစ်</Text>
          </TouchableOpacity>

          {/* ၄။ အသုံးစရိတ် */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Expenses')}>
            <View style={[styles.iconBox, { backgroundColor: '#fff0f0' }]}>
              <Ionicons name="wallet" size={24} color="#D0021B" />
            </View>
            <Text style={styles.cardTitle}>အသုံးစရိတ်</Text>
            <Text style={styles.cardDesc}>ဆိုင်လည်ပတ်စရိတ်များ</Text>
          </TouchableOpacity>

          {/* ၅။ ပစ္စည်းလက်ကျန်
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StockBalance')}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
              <MaterialCommunityIcons name="format-list-numbered" size={24} color="#8a2be2" />
            </View>
            <Text style={styles.cardTitle}>ပစ္စည်းလက်ကျန်</Text>
            <Text style={styles.cardDesc}>လက်ကျန်ပစ္စည်းအရေအတွက်</Text>
          </TouchableOpacity> */}

          {/* ၆။ ပစ္စည်းကုန်/နည်း */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StockBalance')}>
            <View style={[styles.iconBox, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="alert-circle" size={24} color="#e53935" />
            </View>
            <Text style={styles.cardTitle}>ပစ္စည်းကုန်/နည်း</Text>
            <Text style={styles.cardDesc}>Low Stock သတိပေးချက်</Text>
          </TouchableOpacity>

          

          {/* ၈။ Seller စီမံခန့်ခွဲမှု
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SellerManagement')}>
            <View style={[styles.iconBox, { backgroundColor: '#e8eaf6' }]}>
              <Ionicons name="people" size={24} color="#3f51b5" />
            </View>
            <Text style={styles.cardTitle}>Seller စီမံခန့်ခွဲမှု</Text>
            <Text style={styles.cardDesc}>အရောင်းစာရေး အကောင့်များ</Text>
          </TouchableOpacity> */}

          {/* ၉။ ငွေပေးချေမှု မှတ်တမ်း */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TransactionScreen')}>
            <View style={[styles.iconBox, { backgroundColor: '#e1f5fe' }]}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color="#446003" />
            </View>
            <Text style={styles.cardTitle}>ငွေပေးချေမှုမှတ်တမ်း</Text>
            <Text style={styles.cardDesc}>Cash / KPay / Wave</Text>
          </TouchableOpacity>

          {/* ၁၀။ အကြွေး (ရရန် / ပေးရန်) */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DebtManagement')}>
            <View style={[styles.iconBox, { backgroundColor: '#fbe9e7' }]}>
              <FontAwesome5 name="hand-holding-usd" size={20} color="#d84315" />
            </View>
            <Text style={styles.cardTitle}>အကြွေး (ရရန်/ပေးရန်)</Text>
            <Text style={styles.cardDesc}>Customer & Supplier Debt</Text>
          </TouchableOpacity>

             
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProfitLossReport')}>
            <View style={[styles.iconBox, { backgroundColor: '#fbe9e7' }]}>
              <FontAwesome5 name="chart-line" size={20} color="#05e231" />
            </View>
            
            <Text style={styles.cardTitle}>စာရင်းချုပ်အမြတ်/အရှုံး</Text>
            <Text style={styles.cardDesc}>အသားတင်အမြတ်ငွေများ</Text>
          </TouchableOpacity>

           <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('About')}>
            <View style={[styles.iconBox, { backgroundColor: '#fbe9e7' }]}>
              <FontAwesome5 name="store" size={20} color="#bb15d8" />
            </View>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardDesc}>ပြင်ဆင်ခြင်း</Text>
          </TouchableOpacity>

        </View>

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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 8, backgroundColor: '#fff0f0' },
  scrollContent: { padding: 15, paddingBottom: 30 },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconBox: {
    width: 45,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#777', lineHeight: 15 },
});
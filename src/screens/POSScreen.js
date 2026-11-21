// src/screens/POSScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../config/supabase';
import { confirmAndSignOut, showSignOutError } from '../services/authActions';
import {
  getCachedShop,
  getCachedUserProfile,
  isNetworkError,
  loadProducts,
  loadServices,
  saveService,
  saveSale,
  saveShop,
  saveUserProfile,
} from '../services/offlineStore';
import { Alert } from '../components/LocalizedAlert';

export default function POSScreen({ navigation }) {
  const [shopId, setShopId] = useState(null);
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [shopInfo, setShopInfo] = useState({ name: 'SHOP', address: '', phone: '' });
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineSaleNotice, setOfflineSaleNotice] = useState('');

  // Barcode Scanner Modal & Permission States
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Multi-Cart State
  const [carts, CartsSet] = useState([
    { id: 1, name: 'စျေးဝယ်- 1', items: [] }
  ]);
  const [activeCartId, setActiveCartId] = useState(1);

  // Checkout Modal & Network/Duplicate Protection States
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [pendingVoucherNo, setPendingVoucherNo] = useState(null);

  // History Modal States & Filters
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [sellerLogs, setSellerLogs] = useState([]);
  const [activeLogTab, setActiveLogTab] = useState('sales'); 
  const [dateFilter, setDateFilter] = useState('today'); 

  // Sale Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [editVoucherNo, setEditVoucherNo] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editNote, setEditNote] = useState('');

  // Service Edit Modal States
  const [editServiceModalVisible, setEditServiceModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [editSrvVoucherNo, setEditSrvVoucherNo] = useState('');
  const [editSrvCustomerName, setEditSrvCustomerName] = useState('');
  const [editSrvPhone, setEditSrvPhone] = useState('');
  const [editSrvDeviceModel, setEditSrvDeviceModel] = useState('');
  const [editSrvFault, setEditSrvFault] = useState('');
  const [editSrvFee, setEditSrvFee] = useState('');

  // Expense Modal States
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Service Modal States
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [srvCustomerName, setSrvCustomerName] = useState('');
  const [srvPhone, setSrvPhone] = useState('');
  const [srvDeviceModel, setSrvDeviceModel] = useState('');
  const [srvFault, setSrvFault] = useState('');
  const [srvFee, setSrvFee] = useState('');
  const [srvCost, setSrvCost] = useState('');

  // Transaction Modal States
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [transType, setTransType] = useState('deposit');
  const [transCustomerName, setTransCustomerName] = useState('');
  const [transPhone, setTransPhone] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transFee, setTransFee] = useState('');
  const [transMethod, setTransMethod] = useState('KPay');
  const [transNote, setTransNote] = useState('');

  const fetchShopDetails = useCallback(async (sId) => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', sId)
        .single();

      if (!error && data) {
        setShopInfo({
          name: data.shop_name || data.name || 'MOBILE SHOP',
          address: data.address || '',
          phone: data.phone || data.shop_phone || ''
        });
        await saveShop(sId, data);
      } else if (error && isNetworkError(error)) {
        const cachedShop = await getCachedShop(sId);
        if (cachedShop) {
          setShopInfo({
            name: cachedShop.shop_name || cachedShop.name || 'MOBILE SHOP',
            address: cachedShop.address || '',
            phone: cachedShop.phone || cachedShop.shop_phone || ''
          });
        }
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error fetching shop info:', error.message);
    }
  }, []);

  const fetchProducts = useCallback(async (sId) => {
    try {
      const data = await loadProducts(sId);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    }
  }, []);

  const fetchUserDataAndProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setSellerEmail(user.email || '');

      let userData;
      const { data, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userErr) {
        if (!isNetworkError(userErr)) throw userErr;
        userData = await getCachedUserProfile(user.id);
      } else {
        userData = data;
        await saveUserProfile(user.id, { ...data, email: user.email || '' });
      }

      if (userData) {
        setSellerName(userData.name || userData.full_name || (user.email ? user.email.split('@')[0] : ''));
      }

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        fetchProducts(userData.shop_id);
        fetchShopDetails(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, fetchShopDetails]);

  useEffect(() => {
    Promise.resolve().then(fetchUserDataAndProducts);
  }, [fetchUserDataAndProducts]);

  const handleLogout = async () => {
    try {
      await confirmAndSignOut();
    } catch (error) {
      showSignOutError(error);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setScannerVisible(false);
    
    const scannedProduct = products.find(p => 
      String(p.id) === String(data) || 
      (p.barcode && String(p.barcode) === String(data)) || 
      (p.name && p.name.toLowerCase() === data.toLowerCase())
    );

    if (scannedProduct) {
      addToCart(scannedProduct);
    } else {
      Alert.alert('မတွေ့ရှိပါ', 'ဤ Barcode/QR ကုဒ်နှင့် ကိုက်ညီသော ပစ္စည်း မရှိပါ။');
    }
  };

  const addNewCart = () => {
    const newId = carts.length + 1;
    CartsSet([...carts, { id: newId, name: `စျေးဝယ်-${newId}`, items: [] }]);
    setActiveCartId(newId);
  };

  const removeCart = (cartId) => {
    if (carts.length === 1) {
      Alert.alert('မဖျက်နိုင်ပါ', 'အနည်းဆုံး ဝယ်သူစာရင်း တစ်ခု ရှိရပါမည်။');
      return;
    }
    const updatedCarts = carts.filter(c => c.id !== cartId);
    CartsSet(updatedCarts);
    setActiveCartId(updatedCarts[0].id);
  };

  const getCurrentCartItems = () => {
    const current = carts.find(c => c.id === activeCartId);
    return current ? current.items : [];
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert('လက်ကျန်မရှိပါ', 'ဤပစ္စည်း လက်ကျန် မရှိတော့ပါ။');
      return;
    }

    const price = parseFloat(product.selling_price) || parseFloat(product.price) || 0;

    CartsSet(prevCarts => {
      return prevCarts.map(cart => {
        if (cart.id === activeCartId) {
          const existingItem = cart.items.find(item => item.id === product.id);
          let newItems;
          if (existingItem) {
            if (existingItem.quantity >= product.stock) {
              Alert.alert('လက်ကျန်ထက် ကျော်လွန်နေပါသည်');
              return cart;
            }
            newItems = cart.items.map(item => 
              item.id === product.id 
                ? { ...item, quantity: item.quantity + 1, selling_price: price }
                : item
            );
          } else {
            newItems = [...cart.items, { ...product, selling_price: price, quantity: 1 }];
          }
          return { ...cart, items: newItems };
        }
        return cart;
      });
    });

    setSearchQuery('');
  };

  const updateQuantity = (id, delta) => {
    CartsSet(prevCarts => {
      return prevCarts.map(cart => {
        if (cart.id === activeCartId) {
          const newItems = cart.items.map(item => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              if (newQty <= 0) return null;
              if (newQty > item.stock) {
                Alert.alert('လက်ကျန်ထက် ကျော်လွန်နေပါသည်');
                return item;
              }
              return { ...item, quantity: newQty };
            }
            return item;
          }).filter(Boolean);
          return { ...cart, items: newItems };
        }
        return cart;
      });
    });
  };

  const calculateSubTotal = () => {
    const items = getCurrentCartItems();
    return items.reduce((sum, item) => sum + ((parseFloat(item.selling_price) || parseFloat(item.price) || 0) * item.quantity), 0);
  };

  const calculateFinalTotal = () => {
    const subTotal = calculateSubTotal();
    const disc = parseFloat(discountAmount) || 0;
    return Math.max(0, subTotal - disc);
  };

  const calculateTotalProfit = () => {
    const items = getCurrentCartItems();
    const disc = parseFloat(discountAmount) || 0;
    const grossProfit = items.reduce((sum, item) => {
      const price = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
      const cost = parseFloat(item.cost_price) || 0;
      return sum + ((price - cost) * item.quantity);
    }, 0);
    return grossProfit - disc;
  };

  const generateVoucherNo = (prefix = 'V') => {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${dateStr}-${randNum}`;
  };

  const navigateToServiceReceipt = (srvRecord) => {
    setHistoryModalVisible(false);
    navigation.navigate('ReceiptPrint', {
      isService: true,
      serviceData: {
        ...srvRecord,
        shopName: shopInfo.name,
        shopAddress: shopInfo.address,
        shopPhone: shopInfo.phone
      }
    });
  };

  const handleCheckoutConfirm = async () => {
    if (isCheckingOut || loading) return;

    const currentItems = getCurrentCartItems();
    if (currentItems.length === 0) return;

    try {
      setIsCheckingOut(true);
      setLoading(true);

      if (!shopId) {
        throw new Error('Shop ID မတွေ့ရှိပါ။ ကျေးဇူးပြု၍ ခေတ္တစောင့်ပြီး ပြန်စမ်းကြည့်ပါ။');
      }

      const disc = parseFloat(discountAmount) || 0;
      const finalAmount = calculateFinalTotal();
      const totalProfit = calculateTotalProfit();

      const activeVoucherNo = pendingVoucherNo || generateVoucherNo('V');
      if (!pendingVoucherNo) {
        setPendingVoucherNo(activeVoucherNo);
      }

      const cName = (customerNameInput || '').trim();
      const cPhone = (customerPhoneInput || '').trim();

      const salePayload = {
        shop_id: shopId,
        seller_email: sellerEmail,
        total_amount: finalAmount,
        total_profit: totalProfit,
        payment_method: selectedPaymentMethod,
        voucher_no: activeVoucherNo,
        items: currentItems,
        customer_name: cName,
        customer_phone: cPhone,
        discount: disc,
        note: '',
        created_at: new Date().toISOString()
      };
      const saleData = await saveSale(salePayload);
      const savedOffline = String(saleData.id || '').startsWith('local-');
      setOfflineSaleNotice(savedOffline
        ? 'အင်တာနက်မရှိပါ — အရောင်းကို စက်ထဲသိမ်းထားပြီး အင်တာနက်ပြန်ရလျှင် Sync လုပ်ပါမည်။'
        : '');

      CartsSet(prevCarts => prevCarts.map(c => c.id === activeCartId ? { ...c, items: [] } : c));
      setPendingVoucherNo(null);
      setCustomerNameInput('');
      setCustomerPhoneInput('');
      setDiscountAmount('');
      setSelectedPaymentMethod('Cash');
      setCheckoutModalVisible(false);
      fetchProducts(shopId);

      navigation.navigate('ReceiptPrint', {
        saleData: {
          ...saleData,
          shopName: shopInfo.name,
          shopAddress: shopInfo.address,
          shopPhone: shopInfo.phone
        },
        customerName: cName,
        customerPhone: cPhone,
        finalTotal: finalAmount,
        discount: disc
      });

    } catch (error) {
      Alert.alert(
        'အင်တာနက် / ချိတ်ဆက်မှု အခက်အခဲ',
        `စာရင်းသိမ်းဆည်းရာတွင် အခက်အခဲရှိခဲ့ပါသည် (${error.message})။\nမှတ်တမ်းထဲ ဝင်မဝင် အရင်စစ်ဆေးပြီးမှ ထပ်စမ်းကြည့်ပါ။`
      );
    } finally {
      setIsCheckingOut(false);
      setLoading(false);
    }
  };

  const handleSaveService = async () => {
    if (!srvCustomerName.trim() || !srvFee.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ဖောက်သည်အမည်နှင့် ဝန်ဆောင်ခ ဖြည့်ပါ။');
      return;
    }
    try {
      const fee = parseFloat(srvFee) || 0;
      const cost = parseFloat(srvCost) || 0;
      const profit = fee - cost;
      const autoSrvVoucherNo = generateVoucherNo('SRV');

      const servicePayload = {
        shop_id: shopId,
        seller_email: sellerEmail,
        voucher_no: autoSrvVoucherNo,
        customer_name: srvCustomerName.trim(),
        phone: srvPhone.trim(),
        device_model: srvDeviceModel.trim(),
        fault_description: srvFault.trim(),
        service_fee: fee,
        cost_price: cost,
        profit: profit,
        created_at: new Date().toISOString()
      };

      const savedService = await saveService(servicePayload);

      const recordForPrint = savedService || servicePayload;
      const savedOffline = String(recordForPrint.id || '').startsWith('local-');

      setServiceModalVisible(false);
      setSrvCustomerName('');
      setSrvPhone('');
      setSrvDeviceModel('');
      setSrvFault('');
      setSrvFee('');
      setSrvCost('');

      const printPrompt = `ဝန်ဆောင်မှု ${savedOffline ? 'Offline တွင် သိမ်းပြီးပါပြီ' : 'သိမ်းဆည်းပြီးပါပြီ'}။ (ဘောက်ချာနံပါတ်: ${recordForPrint.voucher_no || autoSrvVoucherNo})\nဘောက်ချာ Print ထုတ်မလား?`;
      Alert.alert(
        'အောင်မြင်သည်',
        printPrompt,
        [
          { text: 'မထုတ်ပါ', style: 'cancel' },
          { text: 'Print ထုတ်မည်', onPress: () => navigateToServiceReceipt(recordForPrint) }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateServiceRecord = async () => {
    if (!selectedService) return;
    if (!editSrvCustomerName.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ဖောက်သည်အမည် ထည့်ပါ။');
      return;
    }
    try {
      const fee = parseFloat(editSrvFee) || 0;
      const cost = parseFloat(selectedService.cost_price) || 0;
      const profit = fee - cost;

      const updatedService = await saveService({
        shop_id: shopId,
        seller_email: sellerEmail,
        voucher_no: editSrvVoucherNo.trim() || selectedService.voucher_no || generateVoucherNo('SRV'),
        customer_name: editSrvCustomerName.trim(),
        phone: editSrvPhone.trim(),
        device_model: editSrvDeviceModel.trim(),
        fault_description: editSrvFault.trim(),
        service_fee: fee,
        cost_price: cost,
        profit,
      }, selectedService.id);

      setEditServiceModalVisible(false);
      setSelectedService(null);
      fetchSellerLogs(activeLogTab, dateFilter);
      const message = String(updatedService.id).startsWith('local-')
        ? 'မှတ်တမ်းကို Offline တွင် သိမ်းထားပြီး နောက်ပိုင်း Sync လုပ်ပါမည်။'
        : 'ဝန်ဆောင်မှု မှတ်တမ်းကို ပြင်ဆင်ပြီးပါပြီ။';
      Alert.alert('အောင်မြင်သည်', message);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveTransaction = async () => {
    if (!transAmount || !transCustomerName) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'အမည်နှင့် ငွေပမာဏ ဖြည့်ပါ။');
      return;
    }
    try {
      const { error } = await supabase.from('transactions').insert([{
        shop_id: shopId,
        seller_email: sellerEmail,
        type: transType,
        amount: parseFloat(transAmount),
        fee: parseFloat(transFee) || 0,
        payment_method: transMethod,
        customer_name: transCustomerName,
        phone: transPhone,
        note: transNote,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      Alert.alert('အောင်မြင်သည်', 'ငွေသွင်း/ငွေထုတ် မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ။');
      setTransModalVisible(false);
      setTransCustomerName('');
      setTransPhone('');
      setTransAmount('');
      setTransFee('');
      setTransNote('');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseTitle || !expenseAmount) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ခေါင်းစဉ်နှင့် ငွေပမာဏ ဖြည့်ပါ။');
      return;
    }
    try {
      const { error } = await supabase.from('expenses').insert([{
        shop_id: shopId,
        seller_email: sellerEmail,
        title: expenseTitle,
        amount: parseFloat(expenseAmount),
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      Alert.alert('အောင်မြင်သည်', 'အသုံးစရိတ် သိမ်းဆည်းပြီးပါပြီ။');
      setExpenseModalVisible(false);
      setExpenseTitle('');
      setExpenseAmount('');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const fetchSellerLogs = async (tab = activeLogTab, dFilter = dateFilter) => {
    setActiveLogTab(tab);
    setDateFilter(dFilter);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const currentEmail = (user?.email || sellerEmail || '').trim();
      const currentShopId = shopId;

      if (!currentShopId || !currentEmail) {
        setSellerLogs([]);
        setHistoryModalVisible(true);
        return;
      }

      const tables = tab === 'all' 
        ? ['sales', 'services', 'transactions', 'expenses'] 
        : [tab];

      let combinedData = [];
      const now = new Date();
      let startDateStr = null;

      if (dFilter === 'today') {
        startDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (dFilter === 'month') {
        startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }

      for (const tName of tables) {
        if (tName === 'services') {
          const data = await loadServices(currentShopId);
          const taggedData = data
            .filter((item) => (item.seller_email || '').toLowerCase() === currentEmail.toLowerCase())
            .filter((item) => !startDateStr || new Date(item.created_at) >= new Date(startDateStr))
            .map((item) => ({ ...item, logCategory: tName }));
          combinedData = [...combinedData, ...taggedData];
          continue;
        }

        let query = supabase
          .from(tName)
          .select('*')
          .eq('shop_id', currentShopId)
          .ilike('seller_email', currentEmail);

        if (startDateStr) {
          query = query.gte('created_at', startDateStr);
        }

        const { data, error } = await query;
        if (!error && data) {
          const taggedData = data.map(item => ({ ...item, logCategory: tName }));
          combinedData = [...combinedData, ...taggedData];
        }
      }

      combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setSellerLogs(combinedData);
      setHistoryModalVisible(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateSaleRecord = async () => {
    if (!selectedSale) return;
    try {
      const disc = parseFloat(selectedSale.discount) || 0;
      const subTotal = editItems.reduce((sum, item) => sum + ((parseFloat(item.selling_price) || parseFloat(item.price) || 0) * (item.quantity || item.qty || 1)), 0);
      const newTotal = Math.max(0, subTotal - disc);
      const grossProfit = editItems.reduce((sum, item) => {
        const price = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        return sum + ((price - cost) * (item.quantity || item.qty || 1));
      }, 0);
      const newProfit = grossProfit - disc;

      const { error } = await supabase
        .from('sales')
        .update({
          voucher_no: editVoucherNo,
          items: editItems,
          total_amount: newTotal,
          total_profit: newProfit,
          note: editNote
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      setEditModalVisible(false);
      fetchSellerLogs(activeLogTab, dateFilter);
      Alert.alert('အောင်မြင်သည်', 'မှတ်တမ်းကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.group_name && p.group_name.toLowerCase().includes(q)) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q))
    );
  });

  const currentItems = getCurrentCartItems();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🛍️ အရောင်းကောင်တာ</Text>
          <Text style={styles.headerSubtitle}>{shopInfo.name} ({sellerName || sellerEmail})</Text>
          {!!offlineSaleNotice && <Text style={styles.headerSubtitle}>{offlineSaleNotice}</Text>}
        </View>
        <LanguageSwitcher style={{ marginLeft: 6 }} />
        {/* <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc3545" style={{marginRight: 4}} />
          <Text style={styles.logoutText}></Text>
        </TouchableOpacity> */}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.subHeaderActionRow}>
        <TouchableOpacity style={styles.actionBtnStyle} onPress={() => setExpenseModalVisible(true)}>
          <Ionicons name="wallet-outline" size={16} color="#dc3545" style={{marginRight: 3}} />
          <Text style={styles.actionBtnText}>အသုံးစရိတ်</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnStyle} onPress={() => setTransModalVisible(true)}>
          <Ionicons name="swap-horizontal-outline" size={16} color="#17a2b8" style={{marginRight: 3}} />
          <Text style={styles.actionBtnText}>ငွေသွင်း/ထုတ်</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnStyle} onPress={() => setServiceModalVisible(true)}>
          <Ionicons name="construct-outline" size={16} color="#28a745" style={{marginRight: 3}} />
          <Text style={styles.actionBtnText}>ဝန်ဆောင်မှု</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtnStyle]} onPress={() => fetchSellerLogs('all', 'today')}>
          <Ionicons name="time-outline" size={16} color="#0cdb27" style={{marginRight: 3}} />
          <Text style={[styles.actionBtnText, {color: '#253026'}]}>မှတ်တမ်း</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input & Barcode Scan Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#888" style={{marginRight: 8}} />
          <TextInput 
            style={styles.searchInput}
            placeholder="ပစ္စည်းအမည် (သို့) ဘားကုဒ် ဖြင့် ရှာရန်..."
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.qrBtn} onPress={async () => {
          if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
              Alert.alert('ခွင့်ပြုချက်လိုပါသည်', 'ကင်မရာ အသုံးပြုခွင့် ပေးရန်လိုအပ်ပါသည်။');
              return;
            }
          }
          setScannerVisible(true);
        }}>
          <Ionicons name="scan" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Multi-Cart Tabs */}
      <View style={styles.cartTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', flex: 1}}>
          {carts.map(cart => (
            <TouchableOpacity 
              key={cart.id} 
              style={[styles.cartTabBtn, activeCartId === cart.id && styles.cartTabBtnActive]}
              onPress={() => setActiveCartId(cart.id)}
            >
              <Text style={[styles.cartTabText, activeCartId === cart.id && styles.cartTabTextActive]}>
                {cart.name} {cart.items.length > 0 ? `(${cart.items.reduce((sum, i) => sum + i.quantity, 0)})` : ''}
              </Text>
              {carts.length > 1 && (
                <TouchableOpacity onPress={() => removeCart(cart.id)} style={{marginLeft: 6}}>
                  <Ionicons name="close-circle" size={16} color={activeCartId === cart.id ? '#fff' : '#888'} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.addCartTabBtn} onPress={addNewCart}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainBody}>
        <View style={{flex: 1, marginRight: 8}}>
          {searchQuery.trim().length > 0 && (
            <View style={styles.searchResultsBox}>
              <FlatList 
                data={filteredProducts}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => {
                  const price = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
                  return (
                    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                      <View style={{flex: 1}}>
                        <Text style={styles.productName}>{item.name} - {item.category} - {item.group_name} </Text>
                        <Text style={styles.productPrice}>{price.toLocaleString()} ကျပ် (လက်ကျန်: {item.stock})</Text>
                      </View>
                      <View style={styles.addPlusBtn}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          <View style={styles.cartPanel}>
            <Text style={styles.sectionTitle}>ဝယ်ယူမည့်စာရင်း ({currentItems.length})</Text>
            <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
              {currentItems.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <Ionicons name="cart-outline" size={36} color="#ccc" />
                  <Text style={styles.emptyCartText}>ဤခြင်းတောင်းတွင် ပစ္စည်း မရှိသေးပါ။</Text>
                </View>
              ) : (
                currentItems.map((item) => {
                  const itemPrice = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
                  return (
                    <View key={item.id} style={styles.cartItem}>
                      <View style={{flex: 1}}>
                        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>{itemPrice.toLocaleString()} ကျပ် x {item.quantity}</Text>
                      </View>
                      <View style={styles.qtyController}>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {currentItems.length > 0 && (
              <View style={styles.checkoutFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>စုစုပေါင်း:</Text>
                  <Text style={styles.totalValue}>{calculateSubTotal().toLocaleString()} ကျပ်</Text>
                </View>
                <TouchableOpacity 
                  style={styles.checkoutBtn} 
                  onPress={() => {
                    setPendingVoucherNo(null);
                    setCheckoutModalVisible(true);
                  }}
                >
                  <Text style={styles.checkoutBtnText}>ငွေရှင်းမည် (Checkout)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* --- MODALS --- */}

      <Modal visible={scannerVisible} animationType="slide">
        <View style={{flex: 1, backgroundColor: '#000'}}>
          <CameraView
            style={{flex: 1}}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setScannerVisible(false)}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>ပိတ်မည်</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={checkoutModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '90%'}]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%'}} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>💳 ငွေပေးချေမှု နည်းလမ်း ရွေးချယ်ပါ</Text>
              
              <View style={styles.paymentMethodsGrid}>
                {['Cash', 'KPay', 'Wave', 'Debt', 'Other'].map((method) => (
                  <TouchableOpacity 
                    key={method} 
                    style={[styles.payMethodBtn, selectedPaymentMethod === method && styles.payMethodBtnActive]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <Text style={[styles.payMethodText, selectedPaymentMethod === method && styles.payMethodTextActive]}>
                      {method === 'Cash' ? 'လက်ငင်း (Cash)' : method === 'Debt' ? 'အကြွေး (Debt)' : method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{width: '100%', marginBottom: 10}}>
                <Text style={styles.labelStyle}>လျော့ငွေ (Discount Amount)</Text>
                <TextInput 
                  style={styles.inputField} 
                  placeholder="0" 
                  placeholderTextColor="#888888"
                  keyboardType="numeric" 
                  value={discountAmount} 
                  onChangeText={setDiscountAmount} 
                />
              </View>

              <View style={{width: '100%', marginBottom: 10}}>
                <Text style={styles.labelStyle}>ဝယ်သူအမည် (Customer Name)</Text>
                <TextInput 
                  style={styles.inputField} 
                  placeholder="အမည်ထည့်ပါ..." 
                  placeholderTextColor="#888888"
                  value={customerNameInput} 
                  onChangeText={setCustomerNameInput} 
                />

                <Text style={styles.labelStyle}>ဖုန်းနံပါတ် (Phone Number)</Text>
                <TextInput 
                  style={styles.inputField} 
                  placeholder="ဖုန်းနံပါတ်ထည့်ပါ..." 
                  placeholderTextColor="#888888"
                  keyboardType="phone-pad" 
                  value={customerPhoneInput} 
                  onChangeText={setCustomerPhoneInput} 
                />
              </View>

              <View style={{width: '100%', backgroundColor: '#f1f3f5', padding: 10, borderRadius: 8, marginBottom: 15}}>
                <Text style={{fontSize: 12, color: '#555'}}>ပစ္စည်းဖိုး: {calculateSubTotal().toLocaleString()} ကျပ်</Text>
                {parseFloat(discountAmount) > 0 && (
                  <Text style={{fontSize: 12, color: '#dc3545'}}>လျော့ငွေ: - {parseFloat(discountAmount).toLocaleString()} ကျပ်</Text>
                )}
                <Text style={styles.modalTotalText}>Net Total: {calculateFinalTotal().toLocaleString()} ကျပ်</Text>
              </View>

              <View style={{flexDirection: 'row', width: '100%', marginBottom: 10}}>
                <TouchableOpacity 
                  style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} 
                  disabled={isCheckingOut}
                  onPress={() => {
                    setPendingVoucherNo(null);
                    setCheckoutModalVisible(false);
                  }}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>မလုပ်တော့ပါ</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalActionBtn, {backgroundColor: isCheckingOut ? '#6c757d' : '#28a745'}]} 
                  disabled={isCheckingOut}
                  onPress={handleCheckoutConfirm}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>
                    {isCheckingOut ? 'သိမ်းဆည်းနေသည်...' : 'အတည်ပြုမည်'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={serviceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>🛠️ ဝန်ဆောင်မှု (Service) အပ်နှံရန်</Text>
            <TextInput style={styles.inputField} placeholder="အမည်" placeholderTextColor="#888888" value={srvCustomerName} onChangeText={setSrvCustomerName} />
            <TextInput style={styles.inputField} placeholder="ဖုန်းနံပါတ်" placeholderTextColor="#888888" keyboardType="phone-pad" value={srvPhone} onChangeText={setSrvPhone} />
            <TextInput style={styles.inputField} placeholder="အပ်နှံပစ္စည်း" placeholderTextColor="#888888" value={srvDeviceModel} onChangeText={setSrvDeviceModel} />
            <TextInput style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]} placeholder="ချို့ယွင်းချက် (Fault)" placeholderTextColor="#888888" value={srvFault} onChangeText={setSrvFault} multiline />
            <TextInput style={styles.inputField} placeholder="ဝန်ဆောင်ခ (Fee)" placeholderTextColor="#888888" keyboardType="numeric" value={srvFee} onChangeText={setSrvFee} />

            <View style={{flexDirection: 'row', width: '100%', marginTop: 10}}>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} onPress={() => setServiceModalVisible(false)}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>မလုပ်တော့ပါ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#28a745'}]} onPress={handleSaveService}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>သိမ်းမည်</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={transModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>💸 ငွေသွင်း / ငွေထုတ် မှတ်တမ်း</Text>
            <View style={{flexDirection: 'row', width: '100%', marginBottom: 10}}>
              <TouchableOpacity style={[styles.payMethodBtn, {flex: 1, marginRight: 4}, transType === 'deposit' && styles.payMethodBtnActive]} onPress={() => setTransType('deposit')}>
                <Text style={[styles.payMethodText, transType === 'deposit' && styles.payMethodTextActive]}>ငွေသွင်း</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.payMethodBtn, {flex: 1, marginLeft: 4}, transType === 'withdraw' && styles.payMethodBtnActive]} onPress={() => setTransType('withdraw')}>
                <Text style={[styles.payMethodText, transType === 'withdraw' && styles.payMethodTextActive]}>ငွေထုတ်</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.inputField} placeholder="ဖောက်သည်အမည်" placeholderTextColor="#888888" value={transCustomerName} onChangeText={setTransCustomerName} />
            <TextInput style={styles.inputField} placeholder="ဖုန်းနံပါတ်" placeholderTextColor="#888888" keyboardType="phone-pad" value={transPhone} onChangeText={setTransPhone} />
            <TextInput style={styles.inputField} placeholder="ငွေပမာဏ (Amount)" placeholderTextColor="#888888" keyboardType="numeric" value={transAmount} onChangeText={setTransAmount} />
            <TextInput style={styles.inputField} placeholder="ဝန်ဆောင်ခ (Fee)" placeholderTextColor="#888888" keyboardType="numeric" value={transFee} onChangeText={setTransFee} />
            <TextInput style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]} placeholder="မှတ်ချက် (Note)" placeholderTextColor="#888888" value={transNote} onChangeText={setTransNote} multiline />

            <View style={{flexDirection: 'row', width: '100%', marginTop: 10}}>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} onPress={() => setTransModalVisible(false)}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>မလုပ်တော့ပါ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#17a2b8'}]} onPress={handleSaveTransaction}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>သိမ်းမည်</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={expenseModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>💸 ဆိုင်အသုံးစရိတ် ထည့်သွင်းရန်</Text>
            <TextInput style={styles.inputField} placeholder="ခေါင်းစဉ်" placeholderTextColor="#888888" value={expenseTitle} onChangeText={setExpenseTitle} />
            <TextInput style={styles.inputField} placeholder="ငွေပမာဏ (ကျပ်)" placeholderTextColor="#888888" keyboardType="numeric" value={expenseAmount} onChangeText={setExpenseAmount} />
            <View style={{flexDirection: 'row', width: '100%', marginTop: 10}}>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} onPress={() => setExpenseModalVisible(false)}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>မလုပ်တော့ပါ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#dc3545'}]} onPress={handleSaveExpense}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>သိမ်းမည်</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Seller Activities / History Log Modal */}
      <Modal visible={historyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {height: '88%'}]}>
            <Text style={styles.modalTitle}>📜 Seller ၏ လုပ်ဆောင်ချက် မှတ်တမ်းများ</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 42, marginBottom: 8}}>
              {[
                { key: 'all', label: 'အားလုံး (All)' },
                { key: 'sales', label: 'အရောင်း' },
                { key: 'services', label: 'ဝန်ဆောင်မှု' },
                { key: 'transactions', label: 'ငွေသွင်း/ထုတ်' },
                { key: 'expenses', label: 'အသုံးစရိတ်' }
              ].map(tab => (
                <TouchableOpacity 
                  key={tab.key} 
                  style={[styles.logTabBtn, activeLogTab === tab.key && styles.logTabBtnActive]}
                  onPress={() => fetchSellerLogs(tab.key, dateFilter)}
                >
                  <Text style={[styles.logTabText, activeLogTab === tab.key && styles.logTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dateFilterRow}>
              {[
                { key: 'today', label: 'ယနေ့ (Today)' },
                { key: 'month', label: 'ယခုလ (Month)' },
                { key: 'allTime', label: 'အားလုံး' }
              ].map(df => (
                <TouchableOpacity 
                  key={df.key} 
                  style={[styles.dateFilterBtn, dateFilter === df.key && styles.dateFilterBtnActive]}
                  onPress={() => fetchSellerLogs(activeLogTab, df.key)}
                >
                  <Text style={[styles.dateFilterText, dateFilter === df.key && styles.dateFilterTextActive]}>{df.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <FlatList 
              data={sellerLogs}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              style={{width: '100%', flex: 1}}
              renderItem={({item}) => {
                const cat = item.logCategory;
                return (
                  <TouchableOpacity 
                    style={styles.historyCard}
                    onPress={() => {
                      if (cat === 'sales') {
                        setSelectedSale(item);
                        setEditVoucherNo(item.voucher_no || '');
                        
                        let parsedItems = item.items;
                        if (typeof parsedItems === 'string') {
                          try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
                        }
                        setEditItems(Array.isArray(parsedItems) ? parsedItems : []);
                        setEditNote(item.note || '');
                        setEditModalVisible(true);
                      } else if (cat === 'services') {
                        setSelectedService(item);
                        setEditSrvVoucherNo(item.voucher_no || generateVoucherNo('SRV'));
                        setEditSrvCustomerName(item.customer_name || '');
                        setEditSrvPhone(item.phone || '');
                        setEditSrvDeviceModel(item.device_model || '');
                        setEditSrvFault(item.fault_description || '');
                        setEditSrvFee(item.service_fee != null ? String(item.service_fee) : '');
                        setEditServiceModalVisible(true);
                      }
                    }}
                  >
                    <View style={{flex: 1}}>
                      <Text style={{fontSize: 11, color: '#888', marginBottom: 2}}>
                        [{cat.toUpperCase()}] - {new Date(item.created_at).toLocaleString()}
                      </Text>
                      
                      {cat === 'sales' && (
                        <View>
                          <Text style={styles.logText}>
                            ဘေလ်နံပါတ်: <Text style={{color: '#007bff'}}>{item.voucher_no || 'V-ONLINE'}</Text> | စနစ်: {item.payment_method}
                          </Text>
                          {(item.customer_name || item.customer_phone) && (
                            <Text style={{fontSize: 12, color: '#555', marginTop: 2}}>
                              ဝယ်သူ: {item.customer_name || '-'} ({item.customer_phone || '-'})
                            </Text>
                          )}
                          {item.discount > 0 && (
                            <Text style={{fontSize: 11, color: '#dc3545', marginTop: 2}}>
                              လျော့ငွေ: - {item.discount.toLocaleString()} ကျပ်
                            </Text>
                          )}
                          {item.note ? (
                            <Text style={{fontSize: 11, color: '#09a1d8', marginTop: 2}}>
                              {item.note}
                            </Text>
                          ) : null}
                        </View>
                      )}

                      {cat === 'services' && (
                        <View>
                          {item.voucher_no ? (
                            <Text style={{fontSize: 11, fontWeight: 'bold', color: '#007bff', marginBottom: 2}}>
                              ဘောက်ချာနံပါတ်: {item.voucher_no}
                            </Text>
                          ) : null}
                          <Text style={styles.logText}>ဝန်ဆောင်မှု: {item.customer_name} ({item.device_model || '-'})</Text>
                          {item.fault_description ? (
                            <Text style={{fontSize: 11, color: '#666', marginTop: 2}}>ချို့ယွင်းချက်: {item.fault_description}</Text>
                          ) : null}
                        </View>
                      )}
                      {cat === 'transactions' && <Text style={styles.logText}>{item.type === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်'}: {item.customer_name}</Text>}
                      {cat === 'expenses' && <Text style={styles.logText}>အသုံးစရိတ်: {item.title}</Text>}
                    </View>

                    <View style={{alignItems: 'flex-end'}}>
                      <Text style={[styles.logAmountText, cat === 'expenses' ? {color: '#dc3545'} : {color: '#28a745'}]}>
                        {cat === 'sales' && `+ ${(item.total_amount || 0).toLocaleString()} ကျပ်`}
                        {cat === 'services' && `+ ${(item.service_fee || 0).toLocaleString()} ကျပ်`}
                        {cat === 'transactions' && `+ ${(item.fee || 0).toLocaleString()} ကျပ် (Fee)`}
                        {cat === 'expenses' && `- ${(item.amount || 0).toLocaleString()} ကျပ်`}
                      </Text>

                      {cat === 'sales' && (
                        <TouchableOpacity 
                          style={styles.historyPrintBtn} 
                          onPress={() => {
                            let parsedItems = item.items;
                            if (typeof parsedItems === 'string') {
                              try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
                            }
                            setHistoryModalVisible(false);
                            navigation.navigate('ReceiptPrint', {
                              saleData: {
                                ...item,
                                items: parsedItems,
                                shopName: shopInfo.name,
                                shopAddress: shopInfo.address,
                                shopPhone: shopInfo.phone
                              },
                              customerName: item.customer_name || 'အမည်မရှိ',
                              customerPhone: item.customer_phone || '-',
                              finalTotal: item.total_amount || 0,
                              discount: item.discount || 0
                            });
                          }}
                        >
                          <Ionicons name="print-outline" size={14} color="#007bff" style={{marginRight: 2}} />
                          <Text style={styles.historyPrintText}>Print</Text>
                        </TouchableOpacity>
                      )}

                      {cat === 'services' && (
                        <TouchableOpacity 
                          style={styles.historyPrintBtn} 
                          onPress={() => navigateToServiceReceipt(item)}
                        >
                          <Ionicons name="print-outline" size={14} color="#007bff" style={{marginRight: 2}} />
                          <Text style={styles.historyPrintText}>Print</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={styles.closeBtnStyle} onPress={() => setHistoryModalVisible(false)}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{marginRight: 6}} />
              <Text style={styles.closeBtnText}>ပိတ်မည်</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* အရောင်းမှတ်တမ်း ပြင်ဆင်သည့် Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '85%'}]}>
            <ScrollView
              style={{ width: '100%', maxHeight: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>📝 ဘောက်ချာပစ္စည်းများ ပြင်ဆင်ရန်</Text>

            <Text style={styles.labelStyle}> လုပ်ငန်းစဉ်စဥ်မှတ် (Voucher No)</Text>
            <Text style={styles.modalTitle}>{editVoucherNo}</Text>

            <Text style={styles.labelStyle}>ဝယ်ယူထားသော ပစ္စည်းစာရင်း </Text>
            <View style={{width: '100%', marginBottom: 10}}>
              {Array.isArray(editItems) && editItems.map((it, idx) => {
                const itPrice = parseFloat(it.selling_price) || parseFloat(it.price) || 0;
                return (
                  <View key={idx} style={styles.editItemRow}>
                    <View style={{flex: 1}}>
                      <Text style={{fontSize: 13, fontWeight: 'bold', color: '#333'}}>{it.name}</Text>
                      <Text style={{fontSize: 11, color: '#007bff'}}>ဈေးနှုန်း: {itPrice.toLocaleString()} ကျပ်</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <TouchableOpacity 
                        style={styles.editQtyBtn} 
                        onPress={() => {
                          const updated = [...editItems];
                          if (updated[idx].quantity > 1) {
                            updated[idx].quantity -= 1;
                            setEditItems(updated);
                          }
                        }}
                      >
                        <Text style={{fontWeight: 'bold', color: '#333'}}>-</Text>
                      </TouchableOpacity>
                      <Text style={{marginHorizontal: 8, fontWeight: 'bold', color: '#333'}}>{it.quantity || it.qty || 1}</Text>
                      <TouchableOpacity 
                        style={styles.editQtyBtn} 
                        onPress={() => {
                          const updated = [...editItems];
                          updated[idx].quantity = (updated[idx].quantity || 1) + 1;
                          setEditItems(updated);
                        }}
                      >
                        <Text style={{fontWeight: 'bold', color: '#333'}}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{marginLeft: 10}} 
                        onPress={() => {
                          const updated = editItems.filter((_, i) => i !== idx);
                          setEditItems(updated);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.labelStyle}>ပြင်ဆင်ရမည့် အကြောင်းအရာ (Note)</Text>
            <TextInput 
              style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]} 
              value={editNote} 
              onChangeText={setEditNote} 
              placeholder="ဥပမာ - ပစ္စည်းအမှားလဲလှယ်ခြင်း..." 
              placeholderTextColor="#888888"
              multiline
            />

            <View style={{flexDirection: 'row', width: '100%', marginTop: 10}}>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} onPress={() => setEditModalVisible(false)}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: '#28a745'}]} onPress={handleUpdateSaleRecord}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>သိမ်းမည်</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ဝန်ဆောင်မှု မှတ်တမ်း ပြင်ဆင်သည့် Modal */}
      <Modal visible={editServiceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '88%'}]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%'}} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>🛠️ ဝန်ဆောင်မှု မှတ်တမ်း ပြင်ဆင်ရန်</Text>

              <Text style={styles.labelStyle}>ဘောက်ချာနံပါတ် (Voucher No)</Text>
              <TextInput 
                style={styles.inputField} 
                value={editSrvVoucherNo} 
                onChangeText={setEditSrvVoucherNo} 
                placeholder="SRV-..." 
                placeholderTextColor="#888888"
              />

              <Text style={styles.labelStyle}>ဖောက်သည်အမည်</Text>
              <TextInput 
                style={styles.inputField} 
                value={editSrvCustomerName} 
                onChangeText={setEditSrvCustomerName} 
                placeholder="အမည်" 
                placeholderTextColor="#888888"
              />

              <Text style={styles.labelStyle}>ဖုန်းနံပါတ်</Text>
              <TextInput 
                style={styles.inputField} 
                value={editSrvPhone} 
                onChangeText={setEditSrvPhone} 
                keyboardType="phone-pad" 
                placeholder="ဖုန်းနံပါတ်" 
                placeholderTextColor="#888888"
              />

              <Text style={styles.labelStyle}>အပ်နှံပစ္စည်း</Text>
              <TextInput 
                style={styles.inputField} 
                value={editSrvDeviceModel} 
                onChangeText={setEditSrvDeviceModel} 
                placeholder="အပ်နှံပစ္စည်း" 
                placeholderTextColor="#888888"
              />

              <Text style={styles.labelStyle}>ချို့ယွင်းချက် (Fault)</Text>
              <TextInput 
                style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]} 
                value={editSrvFault} 
                onChangeText={setEditSrvFault} 
                placeholder="ချို့ယွင်းချက်" 
                placeholderTextColor="#888888"
                multiline
              />

              <Text style={styles.labelStyle}>ဝန်ဆောင်ခ (Fee)</Text>
              <TextInput 
                style={styles.inputField} 
                value={editSrvFee} 
                onChangeText={setEditSrvFee} 
                keyboardType="numeric" 
                placeholder="ဝန်ဆောင်ခ" 
                placeholderTextColor="#888888"
              />

              <View style={{flexDirection: 'row', width: '100%', marginTop: 10}}>
                <TouchableOpacity 
                  style={[styles.modalActionBtn, {backgroundColor: '#6c757d', marginRight: 8}]} 
                  onPress={() => {
                    setEditServiceModalVisible(false);
                    setSelectedService(null);
                  }}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>ပယ်ဖျက်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalActionBtn, {backgroundColor: '#28a745'}]} 
                  onPress={handleUpdateServiceRecord}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>သိမ်းမည်</Text>
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
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7d7',
    alignItems: 'center',
  },
  logoutText: { fontSize: 12, fontWeight: 'bold', color: '#dc3545' },
  subHeaderActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'flex-start',
  },
  actionBtnStyle: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 125,
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  actionBtnText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 42, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111111' },
  qrBtn: { backgroundColor: '#007bff', width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cartTabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cartTabBtn: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  cartTabBtnActive: { backgroundColor: '#007bff' },
  cartTabText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  cartTabTextActive: { color: '#fff' },
  addCartTabBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBody: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },
  searchResultsBox: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 8, maxHeight: 180, elevation: 3 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', alignItems: 'center' },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  productPrice: { fontSize: 12, color: '#007bff', marginTop: 2 },
  addPlusBtn: { backgroundColor: '#007bff', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cartPanel: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  emptyCartBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyCartText: { fontSize: 13, color: '#888', marginTop: 8 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  cartItemName: { fontSize: 13, fontWeight: 'bold', color: '#333', flex: 1 },
  cartItemPrice: { fontSize: 12, color: '#666', marginTop: 2 },
  qtyController: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { backgroundColor: '#e9ecef', width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  qtyBtnText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  qtyText: { marginHorizontal: 10, fontSize: 13, fontWeight: 'bold', color: '#333' },
  checkoutFooter: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: '#28a745' },
  checkoutBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center' },
  modalTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  paymentMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  payMethodBtn: { width: '48%', paddingVertical: 12, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  payMethodBtnActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  payMethodText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  payMethodTextActive: { color: '#fff' },
  inputField: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    height: 42, 
    marginBottom: 10, 
    fontSize: 13, 
    color: '#111111',
    backgroundColor: '#fafafa' 
  },
  labelStyle: { alignSelf: 'flex-start', fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  modalTotalText: { fontSize: 16, fontWeight: 'bold', color: '#28a745', marginTop: 4 },
  modalActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee', width: '100%' },
  logText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  logAmountText: { fontSize: 13, fontWeight: 'bold' },
  logTabBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f3f5', borderRadius: 16, marginRight: 6, height: 34, justifyContent: 'center' },
  logTabBtnActive: { backgroundColor: '#007bff' },
  logTabText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  logTabTextActive: { color: '#fff' },
  dateFilterRow: { flexDirection: 'row', width: '100%', marginBottom: 12, justifyContent: 'space-between' },
  dateFilterBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#e9ecef', borderRadius: 6, alignItems: 'center', marginHorizontal: 3 },
  dateFilterBtnActive: { backgroundColor: '#28a745' },
  dateFilterText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  dateFilterTextActive: { color: '#fff' },
  historyPrintBtn: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#74c0fc',
    alignItems: 'center',
  },
  historyPrintText: { fontSize: 11, fontWeight: 'bold', color: '#007bff' },
  closeBtnStyle: {
    flexDirection: 'row',
    backgroundColor: '#dc3545',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
  },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  closeScannerBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#dc3545', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  editItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#eee', width: '100%' },
  editQtyBtn: { width: 28, height: 28, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }
});